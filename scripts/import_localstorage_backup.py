#!/usr/bin/env python3
"""
Zamzam Foods — Import LocalStorage Order Drafts into Django Database
Imports 121+ uncommitted drafts and payments from local storage backup into SQLite/PostgreSQL.
"""

import os
import sys
import json
import datetime
from decimal import Decimal

# Ensure backend path is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

sys.path.insert(0, BACKEND_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django
django.setup()

from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User
from apps.customers.models import Customer
from apps.products.models import Product
from apps.orders.models import Order
from apps.orders.services import create_order_service
from apps.payments.models import Payment
from apps.payments.services import record_payment_service


def run_import(json_path):
    print("==================================================")
    print("Zamzam Foods — LocalStorage Drafts Importer")
    print(f"Source Backup: {json_path}")
    print("==================================================")

    if not os.path.exists(json_path):
        print(f"[ERROR] Backup file not found at: {json_path}")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    draft_keys = [k for k in data if k.startswith("zamzam_order_draft_")]
    print(f"Found {len(draft_keys)} total order drafts in backup file.")

    admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    print(f"Using audit user: {admin_user.username} ({admin_user.get_full_name() or admin_user.role})")

    products_by_id = {str(p.id): p for p in Product.objects.all()}
    kubbus = Product.objects.filter(name__iexact="kubbus").first()
    romali = Product.objects.filter(name__iexact="romali").first()

    created_orders = 0
    skipped_existing = 0
    recorded_cash_payments = 0
    recorded_gpay_payments = 0
    total_cash_amount = Decimal("0.00")
    total_gpay_amount = Decimal("0.00")
    total_kubbus_qty = 0
    total_romali_qty = 0

    # Sort drafts by date so older orders are imported in chronological sequence
    sorted_draft_keys = sorted(draft_keys)

    for k in sorted_draft_keys:
        parts = k.split("_")
        date_str = parts[3]
        cust_id = parts[4]
        draft = data[k]

        customer = Customer.objects.filter(id=cust_id).first()
        if not customer:
            print(f"[WARN] Customer {cust_id} not found in database. Skipping.")
            continue

        order_date = datetime.date.fromisoformat(date_str)

        # Check for existing order on that date
        existing_order = Order.objects.filter(customer=customer, order_date=order_date).first()
        
        # Build items list
        k_qty = int(draft.get("kubbusQty") or 0)
        r_qty = int(draft.get("romaliQty") or 0)
        prod_qtys = draft.get("productQuantities") or {}

        items_data = []
        if prod_qtys:
            for pid, q_val in prod_qtys.items():
                qty = int(q_val or 0)
                if qty > 0 and pid in products_by_id:
                    items_data.append({"product_id": pid, "quantity": qty})
        else:
            if k_qty > 0 and kubbus:
                items_data.append({"product_id": str(kubbus.id), "quantity": k_qty})
            if r_qty > 0 and romali:
                items_data.append({"product_id": str(romali.id), "quantity": r_qty})

        order = existing_order
        if existing_order:
            skipped_existing += 1
            print(f"  • Existing order found: #{existing_order.order_number} for {customer.name} on {date_str}")
        elif items_data:
            try:
                # Sequential order number for that specific date
                daily_seq = Order.objects.filter(order_date=order_date).count() + 1
                ord_num = f"ORD-{order_date.strftime('%Y%m%d')}-{daily_seq:04d}"

                order = create_order_service(
                    customer_id=customer.id,
                    items_data=items_data,
                    order_date=order_date,
                    notes=f"Recovered from localStorage backup ({date_str})",
                    created_by=admin_user,
                    source="MANAGER",
                    entered_by_role="MANAGER",
                    entered_by_name=admin_user.get_full_name() or admin_user.username,
                    order_number=ord_num,
                )
                created_orders += 1

                # Backdate the corresponding CreditTransaction to order_date
                from apps.credits.models import CreditTransaction
                CreditTransaction.objects.filter(reference_order=order).update(created_at=payment_time)

                for item in items_data:
                    p = products_by_id.get(item["product_id"])
                    if p:
                        if p.name.lower() == "kubbus":
                            total_kubbus_qty += item["quantity"]
                        elif p.name.lower() == "romali":
                            total_romali_qty += item["quantity"]

                print(f"  ✓ Created Order #{order.order_number} for {customer.name} ({date_str}) - Total ₹{order.total_amount}")
            except Exception as e:
                print(f"[ERROR] Failed to create order for {customer.name}: {e}")

        # Parse payments
        cash_raw = str(draft.get("cashAmount") or "").strip()
        gpay_raw = str(draft.get("gpayAmount") or "").strip()
        cash_amt = Decimal(cash_raw) if cash_raw else Decimal("0.00")
        gpay_amt = Decimal(gpay_raw) if gpay_raw else Decimal("0.00")

        # Payment received timestamp set to order_date at 12:00 UTC
        payment_time = timezone.make_aware(datetime.datetime.combine(order_date, datetime.time(12, 0)))

        # Record Cash payment if not already recorded
        if cash_amt > Decimal("0.00"):
            # Check if duplicate payment exists
            existing_pay = Payment.objects.filter(
                customer=customer,
                amount=cash_amt,
                payment_method=Payment.Method.CASH,
                received_at__date=order_date
            ).first()
            if not existing_pay:
                try:
                    pay = record_payment_service(
                        customer_id=customer.id,
                        amount=cash_amt,
                        payment_method=Payment.Method.CASH,
                        collected_by=admin_user,
                        order_id=order.id if order else None,
                        notes=f"Wholesale counter cash collection ({date_str}) [LocalStorage Recovery]",
                        received_at=payment_time,
                    )
                    CreditTransaction.objects.filter(reference_payment=pay).update(created_at=payment_time)
                    recorded_cash_payments += 1
                    total_cash_amount += cash_amt
                    print(f"    ↳ Recorded Cash: ₹{cash_amt} for {customer.name}")
                except Exception as e:
                    print(f"[ERROR] Failed to record cash payment for {customer.name}: {e}")

        # Record GPay payment if not already recorded
        if gpay_amt > Decimal("0.00"):
            existing_gpay = Payment.objects.filter(
                customer=customer,
                amount=gpay_amt,
                payment_method=Payment.Method.GPAY_UPI,
                received_at__date=order_date
            ).first()
            if not existing_gpay:
                try:
                    pay = record_payment_service(
                        customer_id=customer.id,
                        amount=gpay_amt,
                        payment_method=Payment.Method.GPAY_UPI,
                        collected_by=admin_user,
                        order_id=order.id if order else None,
                        notes=f"Wholesale counter GPay collection ({date_str}) [LocalStorage Recovery]",
                        received_at=payment_time,
                    )
                    CreditTransaction.objects.filter(reference_payment=pay).update(created_at=payment_time)
                    recorded_gpay_payments += 1
                    total_gpay_amount += gpay_amt
                    print(f"    ↳ Recorded GPay: ₹{gpay_amt} for {customer.name}")
                except Exception as e:
                    print(f"[ERROR] Failed to record GPay payment for {customer.name}: {e}")

    print("\n==================================================")
    print("IMPORT COMPLETE & VERIFIED!")
    print(f"  • New Orders Created:         {created_orders}")
    print(f"  • Pre-existing Orders Kept:   {skipped_existing}")
    print(f"  • Total Kubbus Packets:       {total_kubbus_qty:,}")
    print(f"  • Total Romali Packets:       {total_romali_qty:,}")
    print(f"  • Cash Payments Recorded:     {recorded_cash_payments} (₹{total_cash_amount:,.2f})")
    print(f"  • GPay Payments Recorded:     {recorded_gpay_payments} (₹{total_gpay_amount:,.2f})")
    print(f"  • Total Collections Ingested: ₹{(total_cash_amount + total_gpay_amount):,.2f}")
    print("==================================================")


if __name__ == "__main__":
    backup_file = sys.argv[1] if len(sys.argv) > 1 else "/Users/shiyasahmad/Downloads/zamzam_localstorage_backup_2026-10-05.json"
    run_import(backup_file)
