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
    cid = parts[col_list.index("customer_id")]
    txtype = parts[col_list.index("transaction_type")]
    amount = Decimal(parts[col_list.index("amount")])
    bal_after = Decimal(parts[col_list.index("balance_after")])
    ref_order = parts[col_list.index("reference_order_id")] if "reference_order_id" in col_list else "NULL"
    credit_txs[cid].append({
        "type": txtype,
        "amount": amount,
        "balance_after": bal_after,
        "ref_order": ref_order
    })

# Full chronological ledger audit
audits = []
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

    # Oct 1
    o1_bill = oct1_order["total"] if oct1_order else Decimal("0.00")
    o1_paid = sum(p["amount"] for p in c_pmts if p["date"] == "2026-10-01")
    o1_closing = start_bal + o1_bill - o1_paid

    # Oct 2
    o2_prev = o1_closing
    o2_bill = oct2_order["total"] if oct2_order else Decimal("0.00")
    o2_paid = sum(p["amount"] for p in c_pmts if p["date"] == "2026-10-02")
    o2_closing = o2_prev + o2_bill - o2_paid

    # Oct 3
    o3_prev = o2_closing
    o3_bill = oct3_order["total"] if oct3_order else Decimal("0.00")
    o3_paid = sum(p["amount"] for p in c_pmts if p["date"] == "2026-10-03")
    o3_closing = o3_prev + o3_bill - o3_paid

    true_current = o3_closing
    db_current = cinfo["current_balance"]

    audits.append({
        "name": cinfo["name"],
        "cid": cid,
        "start": start_bal,
        "o1_bill": o1_bill,
        "o1_paid": o1_paid,
        "o1_closing": o1_closing,
        "o2_prev": o2_prev,
        "o2_bill": o2_bill,
        "o2_paid": o2_paid,
        "o2_closing": o2_closing,
        "o3_prev": o3_prev,
        "o3_bill": o3_bill,
        "o3_paid": o3_paid,
        "o3_closing": o3_closing,
        "true_current": true_current,
        "db_current": db_current,
        "diff": db_current - true_current
    })

print(f"Total shops audited: {len(audits)}")
o1_count = sum(1 for s in audits if s["o1_bill"] > 0)
o2_count = sum(1 for s in audits if s["o2_bill"] > 0)
o3_count = sum(1 for s in audits if s["o3_bill"] > 0)
mismatch_count = sum(1 for s in audits if s["diff"] != Decimal("0.00"))
print(f"Shops active on Oct 1: {o1_count}")
print(f"Shops active on Oct 2: {o2_count}")
print(f"Shops active on Oct 3: {o3_count}")
print(f"Shops with current_balance drift in DB: {mismatch_count}")

# Print first 25 shops summary
print("\n--- SAMPLE OF ALL SHOPS CHRONOLOGICAL ROLL-FORWARD ---")
print(f"{'Shop Name':<28} | {'Oct 1 Prev':<10} | {'Oct 1 Net':<10} | {'Oct 2 Prev':<10} | {'Oct 2 Net':<10} | {'Oct 3 Prev':<10} | {'Current True':<12}")
print("-" * 105)
for s in audits[:25]:
    o1_net = s["o1_bill"] - s["o1_paid"]
    o2_net = s["o2_bill"] - s["o2_paid"]
    print(f"{s['name'][:28]:<28} | {s['start']:>10.2f} | {o1_net:>10.2f} | {s['o2_prev']:>10.2f} | {o2_net:>10.2f} | {s['o3_prev']:>10.2f} | {s['true_current']:>12.2f}")
