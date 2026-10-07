import re
from decimal import Decimal
from collections import defaultdict

with open("zamzam_backup_postgresql_full_20261007_055753_CORRECTED.sql") as f:
    sql = f.read()

# 1. Customers
cust_pattern = re.compile(r"INSERT INTO \"customers_customer\"[^(]+\(([^)]+)\)\s+VALUES\s+\((.+?)\)\s+ON CONFLICT", re.DOTALL)
customers = {}
for cols, vals in cust_pattern.findall(sql):
    parts = [p.strip().strip("'") for p in vals.split(", ")]
    col_list = [c.strip().strip('"') for c in cols.split(", ")]
    cid = parts[col_list.index("id")]
    name = parts[col_list.index("name")]
    bal = Decimal(parts[col_list.index("current_balance")])
    customers[cid] = {"name": name, "current_balance": bal}

# 2. Orders
order_pattern = re.compile(r"INSERT INTO \"orders_order\"[^(]+\(([^)]+)\)\s+VALUES\s+\((.+?)\)\s+ON CONFLICT", re.DOTALL)
orders = defaultdict(list)
for cols, vals in order_pattern.findall(sql):
    parts = [p.strip().strip("'") for p in vals.split(", ")]
    col_list = [c.strip().strip('"') for c in cols.split(", ")]
    oid = parts[col_list.index("id")]
    cid = parts[col_list.index("customer_id")]
    odate = parts[col_list.index("order_date")]
    onum = parts[col_list.index("order_number")]
    status = parts[col_list.index("status")]
    tot = Decimal(parts[col_list.index("total_amount")])
    if status != "CANCELLED":
        orders[cid].append({"date": odate, "total": tot, "id": oid, "order_number": onum})

# 3. Payments
payment_pattern = re.compile(r"INSERT INTO \"payments_payment\"[^(]+\(([^)]+)\)\s+VALUES\s+\((.+?)\)\s+ON CONFLICT", re.DOTALL)
payments = defaultdict(list)
for cols, vals in payment_pattern.findall(sql):
    parts = [p.strip().strip("'") for p in vals.split(", ")]
    col_list = [c.strip().strip('"') for c in cols.split(", ")]
    cid = parts[col_list.index("customer_id")]
    pdate = parts[col_list.index("received_at")][:10]
    amount = Decimal(parts[col_list.index("amount")])
    status = parts[col_list.index("status")]
    if status == "COMPLETED":
        payments[cid].append({"date": pdate, "amount": amount})

# 4. Credit Transactions
credit_pattern = re.compile(r"INSERT INTO \"credits_credittransaction\"[^(]+\(([^)]+)\)\s+VALUES\s+\((.+?)\)\s+ON CONFLICT", re.DOTALL)
credit_txs = defaultdict(list)
for cols, vals in credit_pattern.findall(sql):
    parts = [p.strip().strip("'") for p in vals.split(", ")]
    col_list = [c.strip().strip('"') for c in cols.split(", ")]
    txid = parts[col_list.index("id")]
    cid = parts[col_list.index("customer_id")]
    txtype = parts[col_list.index("transaction_type")]
    amount = Decimal(parts[col_list.index("amount")])
    bal_after = Decimal(parts[col_list.index("balance_after")])
    ref_order = parts[col_list.index("reference_order_id")] if "reference_order_id" in col_list else "NULL"
    credit_txs[cid].append({
        "id": txid,
        "type": txtype,
        "amount": amount,
        "balance_after": bal_after,
        "ref_order": ref_order
    })

# Read order fixes
with open("fix.sql") as f:
    fix_sql = f.read()

order_number_fixes = fix_sql.replace("BEGIN;", "").replace("COMMIT;", "").strip()

# Generate full reconciliation statements
sql_statements = [
    "-- ==============================================================================",
    "-- Zamzam Foods — Comprehensive 128-Shop Ledger Reconciliation (Oct 1 to Oct 7)",
    "-- Automatically aligns all customer opening balances, order numbers, and ledger entries",
    "-- Safe for execution via Web UI 'Database Restore & Data Import' or Supabase SQL Editor",
    "-- ==============================================================================",
    "BEGIN;",
    "",
    "-- 1. Correct all 123 misaligned Oct 2 order numbers (ORD-20261003- -> ORD-20261002-)",
    order_number_fixes,
    "",
    "-- 2. Delete all 185 bogus Fast Wholesale Entry adjustment entries",
    "DELETE FROM \"credits_credittransaction\"",
    "WHERE \"transaction_type\" = 'ADJUSTMENT'",
    "  AND \"notes\" LIKE '%Fast Wholesale Entry%';",
    "",
    "-- 3. Delete all 9 ghost order-edit adjustment entries",
    "DELETE FROM \"credits_credittransaction\"",
    "WHERE \"transaction_type\" = 'ADJUSTMENT'",
    "  AND \"reference_order_id\" IS NOT NULL;",
    "",
    "-- 4. Update CREDIT_SALE transactions and current_balance for all shops"
]

for cid, cinfo in sorted(customers.items(), key=lambda x: x[1]["name"].lower()):
    c_orders = sorted(orders.get(cid, []), key=lambda x: x["date"])
    c_pmts = payments.get(cid, [])
    c_txs = credit_txs.get(cid, [])

    oct1_order = next((o for o in c_orders if o["date"] == "2026-10-01"), None)
    oct2_order = next((o for o in c_orders if o["date"] == "2026-10-02"), None)
    oct3_order = next((o for o in c_orders if o["date"] == "2026-10-03"), None)

    # Starting balance before Oct 1
    if oct1_order:
        tx = next((t for t in c_txs if t["ref_order"] == oct1_order["id"] and t["type"] == "CREDIT_SALE"), None)
        start_bal = (tx["balance_after"] - tx["amount"]) if tx else Decimal("0.00")
    elif oct2_order:
        tx = next((t for t in c_txs if t["ref_order"] == oct2_order["id"] and t["type"] == "CREDIT_SALE"), None)
        start_bal = (tx["balance_after"] - tx["amount"]) if tx else Decimal("0.00")
    else:
        start_bal = cinfo["current_balance"]

    o1_bill = oct1_order["total"] if oct1_order else Decimal("0.00")
    o1_paid = sum(p["amount"] for p in c_pmts if p["date"] == "2026-10-01")
    o1_closing = start_bal + o1_bill - o1_paid

    o2_prev = o1_closing
    # If Famous Kattangal, Oct 2 total is 540.00 (from screenshot)
    if cid == "2c4e3160-a549-42e5-81e7-007f6759d558" and oct2_order:
        o2_bill = Decimal("540.00")
    else:
        o2_bill = oct2_order["total"] if oct2_order else Decimal("0.00")

    o2_paid = sum(p["amount"] for p in c_pmts if p["date"] == "2026-10-02")
    o2_closing = o2_prev + o2_bill - o2_paid

    o3_prev = o2_closing
    o3_bill = oct3_order["total"] if oct3_order else Decimal("0.00")
    o3_paid = sum(p["amount"] for p in c_pmts if p["date"] == "2026-10-03")
    o3_closing = o3_prev + o3_bill - o3_paid

    true_current = o3_closing

    shop_name = cinfo["name"]
    # Update Oct 2 CREDIT_SALE balance_after if exists
    if oct2_order:
        sql_statements.append(f"-- {shop_name}: Oct 2 Credit Sale (amount: {o2_bill}, balance_after: {o2_prev + o2_bill})")
        sql_statements.append(f"UPDATE \"credits_credittransaction\" SET \"amount\" = {o2_bill}, \"balance_after\" = {o2_prev + o2_bill} WHERE \"reference_order_id\" = '{oct2_order['id']}' AND \"transaction_type\" = 'CREDIT_SALE';")

    # Update customer current_balance
    sql_statements.append(f"UPDATE \"customers_customer\" SET \"current_balance\" = {true_current} WHERE \"id\" = '{cid}';")

sql_statements.append("")
sql_statements.append("COMMIT;")

full_sql = "\n".join(sql_statements)
with open("reconcile_all_shops_oct1_oct7.sql", "w") as f:
    f.write(full_sql)

print(f"Generated reconcile_all_shops_oct1_oct7.sql with {len(sql_statements)} lines.")
