import json

with open("reconciled_clean.json") as f:
    data = json.load(f)

records = data["records"]

sql_lines = [
    "-- ==============================================================================",
    "-- Zamzam Foods Enterprise Distribution Management",
    "-- Reconciled PostgreSQL Clean Database Script (Oct 1 to Oct 7)",
    "-- Automatically generated from validated chronological ledger roll-forward",
    "-- ==============================================================================",
    "BEGIN;",
    "SET CONSTRAINTS ALL DEFERRED;",
    ""
]

# 1. Clear out bogus adjustments
sql_lines.append("-- ─── STEP 1: CLEAR BOGUS / DRIFTING ADJUSTMENTS ───")
sql_lines.append("DELETE FROM \"credits_credittransaction\" WHERE \"transaction_type\" = 'ADJUSTMENT';")
sql_lines.append("")

# 2. Update orders
sql_lines.append("-- ─── STEP 2: ALIGN ALL ORDER NUMBERS & TOTALS ───")
orders = [o for o in records["orders"] if o["model"] == "orders.order"]
for o in orders:
    oid = o["pk"]
    f = o["fields"]
    onum = f["order_number"]
    tot = f["total_amount"]
    sql_lines.append(f"UPDATE \"orders_order\" SET \"order_number\" = '{onum}', \"total_amount\" = {tot} WHERE \"id\" = '{oid}';")
sql_lines.append("")

# 3. Update order items
sql_lines.append("-- ─── STEP 3: ALIGN ORDER ITEMS & QUANTITIES ───")
items = [it for it in records["orders"] if it["model"] == "orders.orderitem"]
for it in items:
    itid = it["pk"]
    f = it["fields"]
    qty = f["quantity"]
    p = f["unit_price"]
    sub = f["subtotal"]
    sql_lines.append(f"UPDATE \"orders_orderitem\" SET \"quantity\" = {qty}, \"unit_price\" = {p}, \"subtotal\" = {sub} WHERE \"id\" = '{itid}';")
sql_lines.append("")

# 4. Upsert clean credit transactions
sql_lines.append("-- ─── STEP 4: UPSERT CLEAN RECONCILED CREDIT TRANSACTIONS ───")
credits = records["credits"]
for c in credits:
    cid = c["pk"]
    f = c["fields"]
    cust_id = f["customer"]
    ttype = f["transaction_type"]
    amt = f["amount"]
    bal_after = f["balance_after"]
    ref_o = f"'{f['reference_order']}'" if f.get("reference_order") else "NULL"
    ref_p = f"'{f['reference_payment']}'" if f.get("reference_payment") else "NULL"
    notes = f.get("notes", "").replace("'", "''")
    created = f["created_at"]
    rec_by = f.get("recorded_by") or 1
    
    sql_lines.append(
        f"INSERT INTO \"credits_credittransaction\" "
        f"(\"id\", \"created_at\", \"updated_at\", \"customer_id\", \"transaction_type\", \"amount\", \"balance_after\", \"reference_order_id\", \"reference_payment_id\", \"notes\", \"recorded_by_id\") "
        f"VALUES ('{cid}', '{created}', '{created}', '{cust_id}', '{ttype}', {amt}, {bal_after}, {ref_o}, {ref_p}, '{notes}', {rec_by}) "
        f"ON CONFLICT (\"id\") DO UPDATE SET "
        f"\"amount\" = EXCLUDED.\"amount\", \"balance_after\" = EXCLUDED.\"balance_after\", \"notes\" = EXCLUDED.\"notes\", \"transaction_type\" = EXCLUDED.\"transaction_type\";"
    )
sql_lines.append("")

# 5. Update customers current_balance
sql_lines.append("-- ─── STEP 5: ALIGN CUSTOMER CURRENT BALANCES ───")
customers = [c for c in records["customers"] if c["model"] == "customers.customer"]
for c in customers:
    cid = c["pk"]
    f = c["fields"]
    bal = f["current_balance"]
    name = f["name"].replace("'", "''")
    sql_lines.append(f"-- {name}")
    sql_lines.append(f"UPDATE \"customers_customer\" SET \"current_balance\" = {bal} WHERE \"id\" = '{cid}';")
sql_lines.append("")

# 6. Update delivery notes referencing old order numbers
sql_lines.append("-- ─── STEP 6: CLEAN DELIVERY NOTES ───")
sql_lines.append("UPDATE \"deliveries_delivery\" SET \"notes\" = REPLACE(\"notes\", 'ORD-20261003-', 'ORD-20261002-') WHERE \"notes\" LIKE '%ORD-20261003-%';")
sql_lines.append("")

sql_lines.append("COMMIT;")

full_sql = "\n".join(sql_lines)
with open("reconciled_clean.sql", "w") as f:
    f.write(full_sql)

with open("backend/scripts/reconciled_clean.sql", "w") as f:
    f.write(full_sql)

print(f"Generated reconciled_clean.sql with {len(sql_lines)} lines.")
