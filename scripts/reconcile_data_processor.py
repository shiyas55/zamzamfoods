import json
from decimal import Decimal

with open("last.json") as f:
    data = json.load(f)

records = data["records"]
customers = {c["pk"]: c["fields"] for c in records["customers"] if c["model"] == "customers.customer"}
orders = [o for o in records["orders"] if o["model"] == "orders.order"]
credits = [c for c in records["credits"] if c["model"] == "credits.credittransaction"]

oct1_orders = {o["fields"]["customer"]: o for o in orders if o["fields"]["order_date"] == "2026-10-01"}
oct2_orders = {o["fields"]["customer"]: o for o in orders if o["fields"]["order_date"] == "2026-10-02"}

pre_dues = {}
for cid, cfields in sorted(customers.items(), key=lambda x: x[1]["name"].lower()):
    name = cfields["name"]
    o1 = oct1_orders.get(cid)
    o2 = oct2_orders.get(cid)

    pre_due = None
    source = None
    if o1:
        tx = next((c for c in credits if c["fields"]["reference_order"] == o1["pk"] and c["fields"]["transaction_type"] == "CREDIT_SALE"), None)
        if tx:
            pre_due = Decimal(tx["fields"]["balance_after"]) - Decimal(tx["fields"]["amount"])
            source = f"Oct 1 order #{o1['fields']['order_number']}"
    elif o2:
        tx = next((c for c in credits if c["fields"]["reference_order"] == o2["pk"] and c["fields"]["transaction_type"] == "CREDIT_SALE"), None)
        if tx:
            pre_due = Decimal(tx["fields"]["balance_after"]) - Decimal(tx["fields"]["amount"])
            source = f"Oct 2 order #{o2['fields']['order_number']}"

    if pre_due is None:
        pre_due = Decimal(cfields["current_balance"])
        source = "customer current_balance"

    pre_dues[cid] = (name, pre_due, source)

print(f"Extracted pre-dues for {len(pre_dues)} customers.")
print(f"Sample of 20 customers:")
for cid, (name, pdue, src) in list(pre_dues.items())[:20]:
    print(f"  {name:<28}: Pre-Due = ₹{pdue:>10.2f} (from {src})")
