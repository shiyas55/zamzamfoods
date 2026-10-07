import json
import hashlib
import uuid
from decimal import Decimal
from collections import defaultdict

def quant(d):
    return Decimal(str(d)).quantize(Decimal("0.01"))

def str_dec(d):
    return str(quant(d))

with open("last.json") as f:
    raw_data = json.load(f)

records = raw_data["records"]

# 1. Base modules - keep intact
accounts = records["accounts"]
products = records["products"]
routes = records["routes"]
deliveries = records["deliveries"]
reports = records["reports"]
logs = records["logs"]

# 2. Customers
customers_records = [c for c in records["customers"] if c["model"] == "customers.customer"]
customer_prices = [p for p in records["customers"] if p["model"] == "customers.customerproductprice"]
customers_by_id = {c["pk"]: c for c in customers_records}

# 3. Orders & Order Items
orders_records = [o for o in records["orders"] if o["model"] == "orders.order"]
order_items = [it for it in records["orders"] if it["model"] == "orders.orderitem"]
order_logs = [l for l in records["orders"] if l["model"] == "orders.orderactivitylog"]

orders_by_id = {o["pk"]: o for o in orders_records}
items_by_order = defaultdict(list)
for it in order_items:
    items_by_order[it["fields"]["order"]].append(it)

# 4. Payments
payments_records = [p for p in records["payments"] if p["model"] == "payments.payment"]
payments_by_id = {p["pk"]: p for p in payments_records}

# 5. Credits
credits_records = [c for c in records["credits"] if c["model"] == "credits.credittransaction"]

# --- Step A: Normalize Oct 2 Order Numbers & Items ---
for o in orders_records:
    f = o["fields"]
    odate = f["order_date"]
    onum = f["order_number"]
    # If order is on Oct 2 but has ORD-20261003-, normalize to ORD-20261002-
    if odate == "2026-10-02" and onum.startswith("ORD-20261003-"):
        parts = onum.split("-")
        f["order_number"] = f"ORD-20261002-{parts[2]}"

# Fix Famous Kattangal Oct 2 order (f018475a-7c73-42fc-913b-537a02cb9b8e)
fk_order = orders_by_id.get("f018475a-7c73-42fc-913b-537a02cb9b8e")
if fk_order:
    fk_order["fields"]["order_number"] = "ORD-20261002-0022"
    fk_order["fields"]["total_amount"] = "540.00"
    for it in items_by_order.get("f018475a-7c73-42fc-913b-537a02cb9b8e", []):
        if it["fields"]["product"] == "aecd1280-ef53-4445-a8a6-7b0256046bd6": # kubbus
            it["fields"]["unit_price"] = "4.50"
            it["fields"]["subtotal"] = "450.00"
        elif it["fields"]["product"] == "8f196b7d-42c2-4af8-90d7-b20fc63c7914": # romali
            it["fields"]["unit_price"] = "9.00"
            it["fields"]["subtotal"] = "90.00"

# Fix the 4 order item quantity/price mismatches
for o in orders_records:
    f = o["fields"]
    onum = f["order_number"]
    oid = o["pk"]
    items = items_by_order.get(oid, [])
    if onum == "ORD-20261002-0119" or onum == "ORD-20261003-0119":
        f["total_amount"] = "90.00"
        for it in items:
            if it["fields"]["product"] == "aecd1280-ef53-4445-a8a6-7b0256046bd6":
                it["fields"]["quantity"] = 0
                it["fields"]["subtotal"] = "0.00"
    elif onum == "ORD-20261002-0005" or onum == "ORD-20261003-0005":
        f["total_amount"] = "810.00"
        for it in items:
            if it["fields"]["product"] == "8f196b7d-42c2-4af8-90d7-b20fc63c7914":
                it["fields"]["quantity"] = 0
                it["fields"]["subtotal"] = "0.00"
    elif onum == "ORD-20261002-0004" or onum == "ORD-20261003-0004":
        f["total_amount"] = "5040.00"
        for it in items:
            if it["fields"]["product"] == "aecd1280-ef53-4445-a8a6-7b0256046bd6":
                it["fields"]["quantity"] = 0
                it["fields"]["subtotal"] = "0.00"
    elif onum == "ORD-20261002-0001" or onum == "ORD-20261003-0001":
        f["total_amount"] = "250.00"
        for it in items:
            if it["fields"]["product"] == "8f196b7d-42c2-4af8-90d7-b20fc63c7914":
                it["fields"]["quantity"] = 0
                it["fields"]["subtotal"] = "0.00"

# Fix delivery numbers and order notes
for d in deliveries:
    if "notes" in d["fields"] and "ORD-20261003-" in d["fields"]["notes"]:
        d["fields"]["notes"] = d["fields"]["notes"].replace("ORD-20261003-", "ORD-20261002-")

# --- Step B: Determine True Pre-Due on Oct 1 for every customer ---
oct1_orders = {o["fields"]["customer"]: o for o in orders_records if o["fields"]["order_date"] == "2026-10-01"}
oct2_orders = {o["fields"]["customer"]: o for o in orders_records if o["fields"]["order_date"] == "2026-10-02"}

pre_dues_oct1 = {}
for cid, c in customers_by_id.items():
    o1 = oct1_orders.get(cid)
    o2 = oct2_orders.get(cid)
    
    pre_due = None
    if o1:
        tx = next((c for c in credits_records if c["fields"]["reference_order"] == o1["pk"] and c["fields"]["transaction_type"] == "CREDIT_SALE"), None)
        if tx:
            pre_due = quant(Decimal(tx["fields"]["balance_after"]) - Decimal(tx["fields"]["amount"]))
    elif o2:
        tx = next((c for c in credits_records if c["fields"]["reference_order"] == o2["pk"] and c["fields"]["transaction_type"] == "CREDIT_SALE"), None)
        if tx:
            pre_due = quant(Decimal(tx["fields"]["balance_after"]) - Decimal(tx["fields"]["amount"]))
            
    if pre_due is None:
        pre_due = quant(Decimal(c["fields"]["current_balance"]))
        
    pre_dues_oct1[cid] = pre_due

# --- Step C: Chronological Ledger Roll-Forward ---
# Organize all events (orders and payments) by customer and date
clean_credit_records = []
final_customer_balances = {}

# Map existing CREDIT_SALE transactions by order_id so we preserve IDs
credit_sale_by_order = {}
payment_tx_by_payment = {}
for c in credits_records:
    cf = c["fields"]
    if cf["transaction_type"] == "CREDIT_SALE" and cf["reference_order"]:
        credit_sale_by_order[cf["reference_order"]] = c
    elif cf["transaction_type"] in ["CASH_PAYMENT", "GPAY_PAYMENT"] and cf["reference_payment"]:
        payment_tx_by_payment[cf["reference_payment"]] = c

for cid, c in customers_by_id.items():
    start_bal = pre_dues_oct1[cid]
    running_balance = start_bal
    
    # Customer orders sorted by order_date, created_at
    cust_orders = sorted([o for o in orders_records if o["fields"]["customer"] == cid and o["fields"]["status"] != "CANCELLED"], key=lambda x: (x["fields"]["order_date"], x["fields"]["created_at"]))
    
    # Customer payments sorted by received_at
    cust_payments = sorted([p for p in payments_records if p["fields"]["customer"] == cid and p["fields"]["status"] == "COMPLETED"], key=lambda x: (x["fields"]["received_at"][:10], x["fields"]["received_at"]))
    
    # Process events by date: Oct 1, Oct 2, Oct 3, Oct 4..
    dates = sorted(list(set([o["fields"]["order_date"] for o in cust_orders] + [p["fields"]["received_at"][:10] for p in cust_payments])))
    
    for d in dates:
        # 1. Orders on date d
        d_orders = [o for o in cust_orders if o["fields"]["order_date"] == d]
        for o in d_orders:
            tot = quant(Decimal(o["fields"]["total_amount"]))
            bal_before = running_balance
            running_balance = quant(running_balance + tot)
            bal_after = running_balance
            
            existing_tx = credit_sale_by_order.get(o["pk"])
            tx_id = existing_tx["pk"] if existing_tx else str(uuid.uuid4())
            created_at = existing_tx["fields"]["created_at"] if existing_tx else f"{d} 06:30:00+00:00"
            
            clean_credit_records.append({
                "model": "credits.credittransaction",
                "pk": tx_id,
                "fields": {
                    "created_at": created_at,
                    "updated_at": created_at,
                    "customer": cid,
                    "transaction_type": "CREDIT_SALE",
                    "amount": str_dec(tot),
                    "balance_after": str_dec(bal_after),
                    "reference_order": o["pk"],
                    "reference_payment": None,
                    "notes": f"Credit sale for order #{o['fields']['order_number']}",
                    "recorded_by": o["fields"].get("created_by") or 1
                }
            })
            
        # 2. Payments on date d
        d_payments = [p for p in cust_payments if p["fields"]["received_at"][:10] == d]
        for p in d_payments:
            amt = quant(Decimal(p["fields"]["amount"]))
            bal_before = running_balance
            running_balance = quant(running_balance - amt)
            bal_after = running_balance
            
            existing_tx = payment_tx_by_payment.get(p["pk"])
            tx_id = existing_tx["pk"] if existing_tx else str(uuid.uuid4())
            created_at = existing_tx["fields"]["created_at"] if existing_tx else p["fields"]["received_at"]
            tx_type = "GPAY_PAYMENT" if p["fields"]["payment_method"] == "GPAY_UPI" else "CASH_PAYMENT"
            
            clean_credit_records.append({
                "model": "credits.credittransaction",
                "pk": tx_id,
                "fields": {
                    "created_at": created_at,
                    "updated_at": created_at,
                    "customer": cid,
                    "transaction_type": tx_type,
                    "amount": str_dec(-amt),
                    "balance_after": str_dec(bal_after),
                    "reference_order": p["fields"].get("order"),
                    "reference_payment": p["pk"],
                    "notes": f"Payment for Order #{p['fields'].get('payment_number', '')}. {p['fields'].get('notes', '')}".strip(),
                    "recorded_by": p["fields"].get("collected_by") or 1
                }
            })
            
    # Set customer final current balance
    c["fields"]["current_balance"] = str_dec(running_balance)
    final_customer_balances[cid] = running_balance

print(f"Reconstructed {len(clean_credit_records)} clean credit transactions.")
print(f"Total customers updated with true current balance: {len(final_customer_balances)}")

# Assemble full reconciled records dict
reconciled_records = {
    "accounts": accounts,
    "products": products,
    "routes": routes,
    "customers": customers_records + customer_prices,
    "orders": orders_records + order_items + order_logs,
    "deliveries": deliveries,
    "payments": payments_records,
    "credits": clean_credit_records,
    "reports": reports,
    "whatsapp": [],
    "logs": logs
}

total_reconciled_count = sum(len(v) for v in reconciled_records.values())

reconciled_json_data = {
    "backup_info": {
        "system": "Zamzam Foods Enterprise Distribution Management",
        "version": "1.0.0",
        "created_at": "2026-10-07T10:00:00.000000+00:00",
        "created_by": "admin",
        "backup_type": "full",
        "database_engine": "postgresql",
        "included_modules": list(reconciled_records.keys()),
        "total_records": total_reconciled_count,
        "sha256_checksum": ""
    },
    "records": reconciled_records
}

# Write reconciled_clean.json
json_content = json.dumps(reconciled_json_data, indent=2, ensure_ascii=False)
sha256_hash = hashlib.sha256(json_content.encode("utf-8")).hexdigest()
reconciled_json_data["backup_info"]["sha256_checksum"] = sha256_hash

with open("reconciled_clean.json", "w") as f:
    json.dump(reconciled_json_data, f, indent=2, ensure_ascii=False)

with open("backend/scripts/reconciled_clean.json", "w") as f:
    json.dump(reconciled_json_data, f, indent=2, ensure_ascii=False)

print(f"Generated reconciled_clean.json ({total_reconciled_count} records).")
