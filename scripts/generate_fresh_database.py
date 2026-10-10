#!/usr/bin/env python3
"""
Generate clean initial database snapshot and SQL files for Zamzam Foods.
All sales orders, payments, credits, and previous customer dues are wiped to 0.00.
Master data (Customers, Products, Custom wholesale prices, Routes, Owner PIN 7667) is preserved.
"""

import json
import os

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_json = os.path.join(root_dir, "reconciled_clean.json")
    out_json = os.path.join(root_dir, "zamzam_fresh_database.json")
    out_sql = os.path.join(root_dir, "zamzam_fresh_database.sql")
    schema_sql_path = os.path.join(root_dir, "scripts", "init_local_postgres_schema.sql")

    with open(source_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = data.get("records", {})

    # 1. Routes
    route_map = {}
    clean_routes = []
    for r in records.get("routes", []):
        name = r.get("fields", {}).get("name")
        if name:
            route_map[r["pk"]] = name
            clean_routes.append(r)

    # 2. Products
    clean_products = records.get("products", [])

    # 3. Customers (reset opening_due = 0.00, current_balance = 0.00)
    clean_customers = []
    clean_prices = []
    for c in records.get("customers", []):
        if c.get("model") == "customers.customer":
            item = dict(c)
            item["fields"] = dict(c["fields"])
            item["fields"]["current_balance"] = "0.00"
            item["fields"]["opening_due"] = "0.00"
            clean_customers.append(item)
        elif c.get("model") == "customers.customerproductprice":
            clean_prices.append(c)

    # 4. Accounts
    clean_accounts = records.get("accounts", [])

    # Write JSON
    clean_json_data = {
        "backup_info": {
            "system": "Zamzam Foods Enterprise Distribution Management",
            "version": "1.0.3",
            "created_at": "2026-10-10T15:45:00.000000+00:00",
            "backup_type": "fresh_production_seed",
            "description": "Clean master data. All sales orders, deliveries, payments, debts, and previous dues completely reset to zero.",
            "database_engine": "postgresql",
            "total_customers": len(clean_customers),
            "total_products": len(clean_products),
            "total_custom_prices": len(clean_prices),
            "total_orders": 0,
            "total_previous_dues": "0.00"
        },
        "records": {
            "accounts": clean_accounts,
            "products": clean_products,
            "routes": clean_routes,
            "customers": clean_customers + clean_prices,
            "orders": [],
            "order_items": [],
            "deliveries": [],
            "payments": [],
            "credits": [],
            "expenses": [],
            "reports": [],
            "logs": []
        }
    }

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(clean_json_data, f, indent=2)

    # Write SQL
    with open(schema_sql_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    sql_parts = []
    sql_parts.append("-- ==============================================================================")
    sql_parts.append("-- ZAMZAM FOODS — FRESH PRODUCTION DATABASE (ZERO ORDERS & ZERO DUES)")
    sql_parts.append("-- Clean Initial Seed: Master Customers & Products Preserved | All Dues = 0.00")
    sql_parts.append("-- ==============================================================================\n")
    sql_parts.append('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n')
    sql_parts.append(schema_sql)
    sql_parts.append("\n-- Clean any transactional data")
    sql_parts.append("TRUNCATE TABLE order_items CASCADE;")
    sql_parts.append("TRUNCATE TABLE orders CASCADE;")
    sql_parts.append("TRUNCATE TABLE payments CASCADE;")
    sql_parts.append("TRUNCATE TABLE credit_transactions CASCADE;")
    sql_parts.append("TRUNCATE TABLE expenses CASCADE;\n")

    # 1. Owner
    sql_parts.append("-- 1. Owner User (PIN 7667)")
    sql_parts.append("""INSERT INTO owner_users (id, username, password_hash, full_name, pin_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner', 'pbkdf2_sha256$default$hash', 'Zamzam Owner', '7667')
ON CONFLICT (username) DO NOTHING;\n""")

    # 2. Products
    sql_parts.append("-- 2. Products Master Catalog")
    for p in clean_products:
        f = p["fields"]
        pid = p["pk"]
        name = f["name"].replace("'", "''")
        code = f.get("code", name).replace("'", "''")
        price = f.get("unit_price", "0.00")
        pkt = f.get("packet_size", "").replace("'", "''")
        ord_num = f.get("order_number", 0)
        sql_parts.append(f"""INSERT INTO products (id, name, code, unit_price, packet_size, order_number, is_active)
VALUES ('{pid}', '{name}', '{code}', {price}, '{pkt}', {ord_num}, TRUE)
ON CONFLICT (id) DO UPDATE SET unit_price = EXCLUDED.unit_price, is_active = TRUE;""")

    # 3. Customers
    sql_parts.append("\n-- 3. Customers Master Directory (Opening Due = 0.00, Current Balance = 0.00)")
    for c in clean_customers:
        f = c["fields"]
        cid = c["pk"]
        name = f.get("name", "").replace("'", "''")
        owner_name = f.get("owner_name", "").replace("'", "''")
        phone = f.get("phone", "").replace("'", "''")
        alt_phone = f.get("alternative_phone", "").replace("'", "''")
        addr = f.get("address", "").replace("'", "''")
        route_id = f.get("route")
        route_name = route_map.get(route_id, "").replace("'", "''")
        sql_parts.append(f"""INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('{cid}', '{name}', '{owner_name}', '{phone}', '{alt_phone}', '{addr}', '{route_name}', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;""")

    # 4. Custom Prices
    sql_parts.append("\n-- 4. Customer Custom Product Pricing Matrix")
    for cp in clean_prices:
        f = cp["fields"]
        cpid = cp["pk"]
        cust_id = f.get("customer")
        prod_id = f.get("product")
        price = f.get("price", "0.00")
        eff_from = f.get("effective_from", "2026-10-01")
        sql_parts.append(f"""INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('{cpid}', '{cust_id}', '{prod_id}', {price}, '{eff_from}', TRUE)
ON CONFLICT (id) DO NOTHING;""")

    # 5. System Settings
    sql_parts.append("\n-- 5. System Settings")
    sql_parts.append("""INSERT INTO system_settings (id, business_name, phone_number, pin_code, auto_backup_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', 'Zamzam Foods', '+91 98470 12345', '7667', TRUE)
ON CONFLICT (id) DO UPDATE SET pin_code = '7667';\n""")

    # Guarantee all balances are 0.00
    sql_parts.append("UPDATE customers SET opening_due = 0.00, current_balance = 0.00;\n")

    with open(out_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_parts))

    # Also update reconciled_clean.json and reconciled_clean.sql with this fresh state
    with open(source_json, "w", encoding="utf-8") as f:
        json.dump(clean_json_data, f, indent=2)

    with open(os.path.join(root_dir, "reconciled_clean.sql"), "w", encoding="utf-8") as f:
        f.write("\n".join(sql_parts))

    print(f"Done! Clean database generated:")
    print(f"JSON: {out_json}")
    print(f"SQL:  {out_sql}")
    print(f"Total Customers: {len(clean_customers)} (All dues reset to 0.00)")
    print(f"Total Products:  {len(clean_products)}")
    print(f"Total Custom Prices: {len(clean_prices)}")
    print(f"Total Orders:    0")
    print(f"Total Payments:  0")
    print(f"Total Credits:   0")

if __name__ == "__main__":
    main()
