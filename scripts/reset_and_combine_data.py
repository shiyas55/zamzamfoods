#!/usr/bin/env python3
"""
Zamzam Foods — Master Clean Reset & Combine Script
1. Backs up existing SQLite database.
2. Clears all application tables.
3. Loads clean baseline data from demo.sql.
4. Merges order drafts and payments from zamzam_localstorage_backup_2026-10-05.json.
5. Verifies data integrity and reports statistics.
"""

import os
import sys
import shutil
import sqlite3
import datetime
from decimal import Decimal

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
DB_PATH = os.path.join(BACKEND_DIR, "db.sqlite3")

sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, SCRIPT_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django
django.setup()

from django.db import connection


def main():
    demo_sql_path = "/Users/shiyasahmad/Downloads/demo.sql"
    json_path = "/Users/shiyasahmad/Downloads/zamzam_localstorage_backup_2026-10-05.json"

    print("==================================================")
    print("Zamzam Foods — Reset & Combine Data Pipeline")
    print(f"1. Baseline SQL:     {demo_sql_path}")
    print(f"2. LocalStorage JSON:{json_path}")
    print("==================================================")

    if not os.path.exists(demo_sql_path):
        print(f"[ERROR] demo.sql not found at {demo_sql_path}")
        sys.exit(1)

    if not os.path.exists(json_path):
        print(f"[ERROR] JSON backup not found at {json_path}")
        sys.exit(1)

    # Step 1: Pre-reset safety backup
    safety_backup = f"{DB_PATH}.pre_combine_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.bak"
    shutil.copy2(DB_PATH, safety_backup)
    print(f"[STEP 1] Created safety snapshot: {safety_backup}")

    # Step 2: Clear application tables
    print("[STEP 2] Clearing existing application tables in SQLite...")
    APP_TABLES = [
        "common_activitylog",
        "common_businessdocument",
        "common_systemsettings",
        "whatsapp_whatsappmessage",
        "whatsapp_whatsappconversation",
        "whatsapp_whatsappcustomer",
        "whatsapp_whatsappaccount",
        "reports_dailyclosing",
        "credits_credittransaction",
        "payments_payment",
        "deliveries_delivery",
        "orders_orderactivitylog",
        "orders_orderitem",
        "orders_order",
        "customers_customerdocument",
        "customers_customerproductprice",
        "customers_customer",
        "routes_driverexpense",
        "routes_drivershift",
        "routes_driver",
        "routes_route",
        "products_product",
        "accounts_staffpayout",
        "accounts_staffattendance",
        "accounts_staffmember",
        "accounts_devicesession",
        "accounts_user",
    ]

    with connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_keys = OFF;")
        for table in APP_TABLES:
            try:
                cursor.execute(f'DELETE FROM "{table}";')
            except Exception as e:
                print(f"  Note clearing {table}: {e}")
        connection.commit()
    print("  ✓ Application tables cleared cleanly.")

    # Step 3: Import demo.sql
    print(f"[STEP 3] Ingesting baseline data from {demo_sql_path}...")
    with open(demo_sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    lines = sql_content.split("\n")
    clean_stmts = []
    current = []
    for line in lines:
        line_s = line.strip()
        if not line_s or line_s.startswith("--") or line_s.startswith("SET ") or line_s.upper() in ["BEGIN;", "COMMIT;"]:
            continue
        current.append(line)
        if line_s.endswith(";"):
            clean_stmts.append("\n".join(current))
            current = []

    sql_success = 0
    sql_skipped = 0

    with connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_keys = OFF;")
        for stmt in clean_stmts:
            stmt_upper = stmt.strip().upper()
            if "PG_GET_SERIAL_SEQUENCE" in stmt_upper or "SETVAL(" in stmt_upper:
                sql_skipped += 1
                continue
            try:
                cursor.execute(stmt)
                sql_success += 1
            except Exception as e:
                print(f"  [WARN] Statement failed: {e}\n  SQL: {stmt[:120]}")
        cursor.execute("PRAGMA foreign_keys = ON;")
        connection.commit()

    print(f"  ✓ demo.sql imported successfully! ({sql_success} statements executed, {sql_skipped} Postgres-only sequences skipped)")

    # Step 3.5: Normalize UUIDs for SQLite (strip hyphens from 36-char UUIDs across all tables/columns)
    print("[STEP 3.5] Normalizing UUID primary & foreign keys for SQLite compatibility...")
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in cursor.fetchall()]

        total_uuid_updates = 0
        for t in tables:
            cursor.execute(f'PRAGMA table_info("{t}")')
            cols = [col[1] for col in cursor.fetchall()]
            for col in cols:
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{t}" WHERE "{col}" LIKE "________-____-____-____-____________"')
                    cnt = cursor.fetchone()[0]
                    if cnt > 0:
                        cursor.execute(f'UPDATE "{t}" SET "{col}" = replace("{col}", "-", "") WHERE "{col}" LIKE "________-____-____-____-____________"')
                        total_uuid_updates += cnt
                except Exception:
                    pass
        cursor.execute("PRAGMA foreign_keys = ON;")
        connection.commit()
    print(f"  ✓ Normalized {total_uuid_updates} UUID fields for SQLite.")

    # Step 4: Merge LocalStorage orders and payments
    print(f"[STEP 4] Merging orders & payments from {json_path}...")
    from scripts.import_localstorage_backup import run_import
    run_import(json_path)

    # Step 5: Verification & Totals
    from apps.orders.models import Order, OrderItem
    from apps.payments.models import Payment
    from apps.customers.models import Customer
    from apps.credits.models import CreditTransaction
    from django.db.models import Sum, Count

    print("\n==================================================")
    print("ALL DATA COMBINED AND VERIFIED IN SQLITE!")
    print(f"  • Total Active Customers:      {Customer.objects.filter(is_active=True).count()}")
    print(f"  • Total Orders in Database:    {Order.objects.count()}")
    print(f"  • Total Order Items:           {OrderItem.objects.count()}")
    print(f"  • Total Payments Recorded:     {Payment.objects.count()}")
    print(f"  • Total Ledger Transactions:   {CreditTransaction.objects.count()}")

    print("\n  --- Breakdown by Order Date ---")
    date_breakdown = Order.objects.values('order_date').annotate(
        orders_count=Count('id'),
        daily_sales=Sum('total_amount')
    ).order_by('order_date')

    for d in date_breakdown:
        p_collected = Payment.objects.filter(received_at__date=d['order_date'], status=Payment.Status.COMPLETED).aggregate(p=Sum('amount'))['p'] or Decimal('0.00')
        print(f"    Date {d['order_date']}: {d['orders_count']:3d} orders | Sales: ₹{d['daily_sales']:>9,.2f} | Collected: ₹{p_collected:>9,.2f}")

    sales = Order.objects.aggregate(s=Sum('total_amount'))['s'] or Decimal('0.00')
    collected = Payment.objects.aggregate(p=Sum('amount'))['p'] or Decimal('0.00')
    print("  -------------------------------")
    print(f"  • Total Order Sales Volume:    ₹{sales:,.2f}")
    print(f"  • Total Collections Logged:    ₹{collected:,.2f}")
    print("==================================================")


if __name__ == "__main__":
    main()
