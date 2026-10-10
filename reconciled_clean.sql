-- ==============================================================================
-- ZAMZAM FOODS — FRESH PRODUCTION DATABASE (ZERO ORDERS & ZERO DUES)
-- Clean Initial Seed: Master Customers & Products Preserved | All Dues = 0.00
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- Zamzam Foods Desktop — Clean Local PostgreSQL Schema
-- Database: zamzam_local
-- Single Role (Owner) | Complete Offline Capability | High Performance Indexes
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Owner & Security
CREATE TABLE IF NOT EXISTS owner_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL DEFAULT 'Business Owner',
    pin_code VARCHAR(10) NOT NULL DEFAULT '7667',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    packet_size VARCHAR(50) NOT NULL DEFAULT '',
    order_number INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_order_number ON products(order_number);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- 3. Customers / Shops
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    alternative_phone VARCHAR(20) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    route_name VARCHAR(100) NOT NULL DEFAULT '',
    opening_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_route ON customers(route_name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- 4. Customer-Specific Pricing Matrix
CREATE TABLE IF NOT EXISTS customer_product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(12, 2) NOT NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cust_prod_active_unique ON customer_product_prices(customer_id, product_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cust_prices_cust ON customer_product_prices(customer_id);

-- 5. Orders / Daily Bills
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    previous_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    payment_reference VARCHAR(100) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_bill_date ON orders(bill_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 6. Order Items / Line Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_order_product UNIQUE (order_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 7. Payments / Financial Receipts
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    reference_number VARCHAR(100) NOT NULL DEFAULT '',
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    reversal_reason TEXT NOT NULL DEFAULT '',
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(received_at);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 8. Customer Credit Ledger (Double-Entry Financial History)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credit_cust ON credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_created ON credit_transactions(created_at);

-- 9. General Business Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    description TEXT NOT NULL DEFAULT '',
    receipt_reference VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 10. Staff Directory
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    staff_type VARCHAR(50) NOT NULL DEFAULT 'Worker',
    salary_type VARCHAR(30) NOT NULL DEFAULT 'DAILY_WAGE',
    monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    daily_wage NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);

-- 11. Staff Daily Attendance (Excel-style)
CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    daily_wage NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_date UNIQUE (staff_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON staff_attendance(date);

-- 12. Staff Payouts (Advances, Wages, Salary)
CREATE TABLE IF NOT EXISTS staff_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payout_type VARCHAR(30) NOT NULL DEFAULT 'SALARY',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference VARCHAR(100) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_payouts_date ON staff_payouts(date);

-- 13. Business Documentation & Records
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    description TEXT NOT NULL DEFAULT '',
    document_date DATE NOT NULL DEFAULT CURRENT_DATE,
    file_path TEXT NOT NULL DEFAULT '',
    file_name VARCHAR(255) NOT NULL DEFAULT '',
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(document_date);

-- 14. System Configuration & Backup Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(200) NOT NULL DEFAULT 'Zamzam Foods',
    phone_number VARCHAR(50) NOT NULL DEFAULT '+91 98470 12345',
    gst_number VARCHAR(50) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT 'Main Road, Pandikkad, Malappuram, Kerala',
    upi_id VARCHAR(100) NOT NULL DEFAULT '',
    invoice_footer_notes TEXT NOT NULL DEFAULT 'Thank you for your business. Fresh Kubbus & Romali rotis delivered daily.',
    pin_code VARCHAR(10) NOT NULL DEFAULT '7667',
    auto_backup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    backup_folder TEXT NOT NULL DEFAULT '',
    backup_on_close BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_backup_time VARCHAR(10) NOT NULL DEFAULT '23:59',
    retention_count INTEGER NOT NULL DEFAULT 30,
    last_backup_at TIMESTAMPTZ,
    last_cloud_upload_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Clean any transactional data
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE credit_transactions CASCADE;
TRUNCATE TABLE expenses CASCADE;

-- 1. Owner User (PIN 7667)
INSERT INTO owner_users (id, username, password_hash, full_name, pin_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'owner', 'pbkdf2_sha256$default$hash', 'Zamzam Owner', '7667')
ON CONFLICT (username) DO NOTHING;

-- 2. Products Master Catalog
INSERT INTO products (id, name, code, unit_price, packet_size, order_number, is_active)
VALUES ('aecd1280-ef53-4445-a8a6-7b0256046bd6', 'kubbus', '354', 5.00, '', 0, TRUE)
ON CONFLICT (id) DO UPDATE SET unit_price = EXCLUDED.unit_price, is_active = TRUE;
INSERT INTO products (id, name, code, unit_price, packet_size, order_number, is_active)
VALUES ('8f196b7d-42c2-4af8-90d7-b20fc63c7914', 'Romali', '432', 9.00, '', 0, TRUE)
ON CONFLICT (id) DO UPDATE SET unit_price = EXCLUDED.unit_price, is_active = TRUE;
INSERT INTO products (id, name, code, unit_price, packet_size, order_number, is_active)
VALUES ('8bf97a76-6248-4bc4-876f-6012c0850668', 'Bun', 'BUN', 37.00, '4', 0, TRUE)
ON CONFLICT (id) DO UPDATE SET unit_price = EXCLUDED.unit_price, is_active = TRUE;
INSERT INTO products (id, name, code, unit_price, packet_size, order_number, is_active)
VALUES ('442ad867-1d4a-4556-a47d-847a08124612', 'hotdog', '4', 37.00, '4', 1, TRUE)
ON CONFLICT (id) DO UPDATE SET unit_price = EXCLUDED.unit_price, is_active = TRUE;
INSERT INTO products (id, name, code, unit_price, packet_size, order_number, is_active)
VALUES ('07d63c31-163f-4d05-80ad-f5e604eec936', 'club', '5', 95.00, '1', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET unit_price = EXCLUDED.unit_price, is_active = TRUE;

-- 3. Customers Master Directory (Opening Due = 0.00, Current Balance = 0.00)
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('42e1bf84-de07-41ac-abf3-2bb4f74e7e01', 'alankar nadakkav', 'alankar', '9995874916', '', 'nadakkav', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('590d7a56-16db-4100-a363-debb5a096bc2', 'beach mansoor', 'mansoor', '9961399123', '', 'beach side', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('cc7dd423-0623-4058-964c-2e935186caf6', 'beach rumali', 'Faris Zamzam', '9778435326', '', 'beach', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('93351bf1-1a2d-40d8-b34f-6adfd4af79dc', 'bismi', 'mubassir,anas', '8157976310', '', '1111', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('23ab0b69-fdb1-49da-803b-0f38f3079fc7', 'cross road nadakkav', 'Faris Zamzam', '9048132285', '', 'nadakkav', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('383aeae6-e08a-4686-bb5e-664f11fdcb83', 'crunch bun puthiyangadi', 'Faris Zamzam', '9605333391', '', 'puthiyangadi', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('06461738-e4f1-45ea-a9e6-6076a53f79d0', 'malabar bakes', 'Faris Zamzam', '9072460015', '', '111111', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('c3f64959-21e4-4702-a992-8cd1c5d5b689', 'ninja mugadar beach', 'saheer', '9946223342', '', 'beach', 'anas company', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('a49ed078-9384-41e8-9e48-d2d894718dd8', '6th clock koduvally', 'Faris Zamzam', '9645431110', '', 'thamarasseri road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('97b29e8e-b39a-4b8f-ba8d-df17f096408c', 'alfain koduvally', 'Faris Zamzam', '9142210346', '', 'kunnamgalam road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('e48ccb86-5329-408d-8b48-5d45399b47ca', 'alka bekery', 'sugar bekery boss', '7306453619', '', 'nanmanda to 8 km', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('50eedcfe-7830-42cf-b7e8-baff55c7a444', 'AR bekery', 'muhammed', '111111111', '', 'panchayath building opposit', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('23261a04-aafb-4226-a083-8543df44b4a2', 'aroosh balusseri', 'Faris Zamzam', '9020337788', '', 'bbb', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('3abb6682-74e6-4cb9-bcb6-834ebcebd026', 'berrys koduvally', 'aachikka', '9946153877', '', '222', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('abb3e630-c065-440a-8701-0d4f70b533db', 'broast', 'shafeeque', '8943398497', '', 'famous kattangal opposit', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('77aaf71d-58b6-478c-83b0-185d8729f1a1', 'brothers mukkam', 'Faris Zamzam', '7559957461', '', 'agasthimuzhi,thamarasseri road left side', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('6d0fab5b-f5a1-4d69-91b0-2b7ad7274f43', 'chai.in', 'Faris Zamzam', '9562025850', '', 'kunnamangalam road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('0889dc8d-eb0f-4376-9685-a47c0ab331cc', 'chai kattangal', 'Faris Zamzam', '8592892373', '', 'nearest thurkish kattangal', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('631a1b07-6104-488e-9ec1-dae8fa71b1ff', 'corner narikkuni stand', 'Faris Zamzam', '8547145662', '', 'narikkuni bustand', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('f51bb7bf-d197-491d-a7af-773f9bfd4661', 'corner pullaloor', 'Faris Zamzam', '7034931144', '', '111', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('75352512-01fb-4a40-8068-aa762b289e85', 'donor mukkam', 'Faris Zamzam', '8139031975', '', 'agasthimuzhi,koodaranji road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('2c4e3160-a549-42e5-81e7-007f6759d558', 'FAMOUS KATTANGAL', 'riyas', '9800539574', '', 'riyas 9656719155', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('8e9b437e-683a-4316-82fc-506200d7234d', 'felafil karuvanpoyil', 'Faris Zamzam', '9447704365', '', '111', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('56332230-64b5-42c5-aeae-614cfc00f228', 'food keys koduvally', 'Faris Zamzam', '9188129560', '', '11', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1d049c43-2af2-4a19-8c52-7fa0308ca8ea', 'fresca', 'yettan', '9037983354', '', 'chethkadav,kunnamangalm  kattangal road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('5e6a19ca-5008-47c2-8865-396e175b2e92', 'galaxy', 'Faris Zamzam', '8921174002', '', 'nearest chai kattangal', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('23a2d638-5e81-4a64-87c8-483b22f3134f', 'G dine ulliyeri', 'Faris Zamzam', '8111897222', '', 'ulliyeri', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('d4a18ab0-6880-4ce8-b6fc-6af1575a640a', 'happy kiyakkoth koduvally', 'Faris Zamzam', '9746868190', '', 'kiyakkoth', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1cf8f2a4-ac4e-48f2-99f0-74d9e1f795c5', 'happy koduvally', 'Faris Zamzam', '9400238257', '', 'koduvalli kattangal route', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('63ccb492-a4f9-44b1-bd82-ea92d09139b7', 'happy narikkuni', 'Faris Zamzam', '9946112300', '', 'narikkuni padanilam road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('2efa7fce-4b48-41e3-824c-135d5b6e91b3', 'kakkodi bekery', 'Faris Zamzam', '8086571194', '', 'after alka', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('a303dabb-4ea7-4efd-a15b-eb5272f4f3fd', 'king felafil koduvally', '', '7306701446', '', '00', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('c1cf92ef-7902-40f5-9c6e-be5ae7df1322', 'mandi shop', '00000000', '00000000', '', 'kallanthode side', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('88a2c57e-5e0b-403f-9796-e6b281b30f8c', 'mart', '', '111111111', '', 'mart', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('037aef4b-6d12-4ad3-ba59-478a4104fea7', 'mart kattangal', 'Faris Zamzam', '1111111', '11111', 'kattangal', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('a5ad7e7c-975b-4e22-8c46-c851cba5e3fc', 'maruthadans bekery', 'Faris Zamzam', '8547873514', '', 'balusseri mukk junction', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('d46085e1-ef78-4a53-99b6-0a0f9acce034', 'miya miya', 'thatha', '9562597490', '', 'peringalom,chethkadav road miyamiya tea shop', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('57bd5f24-146e-4a51-a989-d71ad8e98897', 'msr corner', '00000', '6282954046', '', 'manasseri pumb side', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('0d72471e-d721-4102-a751-33b0af323102', 'mukkam rumali', 'Faris Zamzam', '8129353397', '', 'mukkam', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('b771c38f-4813-4f55-89e7-9fa1dc855482', 'nanmanda teashop', 'Faris Zamzam', '8547157778', '', 'nayara pumb oppositt nanmanda', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('960fa41b-75b4-4855-a7ef-57c51d47e916', 'nit kattangal', 'Faris Zamzam', '82818292292', '', 'near galaxy', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('346d0ee8-2f70-474b-b32b-f06cbc3f4660', 'nkg', 'Faris Zamzam', '9072720282', '', '44444', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('2d35e722-d6ee-4fc0-9f0c-ec6a262bfa45', 'nook manasseri', '00000', '9544229422', '', 'manasseri junction', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('d60478ba-8252-4856-bcd9-360195648218', 'pappaya pullaloor', 'Faris Zamzam', '7598917675', '', '111', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('0d653df0-863e-4afe-a906-5ccbf494679b', 'raidan kallanthode', 'raidan', '9633616145', '', 'raidan mandi  house', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('e05002de-155c-4686-a3b6-9474e914edbd', 'razak shop narikkuni', 'razak', '8281423703', '', 'narikkuni stand road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('f22a8cd6-8877-4826-a378-30c768753a1a', 'red salad', 'Faris Zamzam', '9645993994', '', 'tt', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('f6a3ed79-136a-4a8b-be11-cb48bbb9fcc0', 'royal koduvally', 'Faris Zamzam', '9645377135', '', 'narikkuni road', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1ccbbedd-f08d-4c99-9916-f0fdda1d408e', 'shawaya spot', 'Faris Zamzam', '7594856240', '', 'foodkeys opposit', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('a0421574-6334-4b84-a5e5-46243cff2d4a', 'smokies', 'shakir', '9605404991', '', 'nearest tasty bekery', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('397d5e3e-4202-471e-8e4e-21ff00728f14', 'sugar bekery', 'Faris Zamzam', '7306453619', '', 'fff', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('500e6118-e0ff-4000-985c-5fb0c291a591', 'sweet valley', 'muhammed', '000000000', '', 'kattangal junction', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('159927bc-d59c-42bd-b4e7-2c4c15f7aef6', 'tasty bekery', 'riyas', '8097606752', '', 'nearest smokies', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('de6356c9-0ddb-49dc-bc03-d7cee3b9dec0', 'tasty bekery', 'Faris Zamzam', '8172017158', '', 'frr', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('6760d06b-2b90-4487-936d-38b4fe162eb7', 'thurkish kattangal', 'fayas', '9539594296', '', 'nearest nit', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('a2d37b43-d21d-4df9-83fb-b3e618f8ca3f', 'top in balusseri', 'Faris Zamzam', '9847612407', '', 'balusseri stand opposit', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('e914b0ca-38ea-4022-b445-c3401bc22276', 'vavad felafil', 'Faris Zamzam', '9447704365', '', '11111', 'jeeto route', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('651e2320-d0f3-4474-9236-b9bd8d297f10', 'adam golden chick', 'Faris Zamzam', '9633232769', '', 'nallalam', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('c29e9f36-b976-43a2-b238-4a21a9e48587', 'alshai shawarma shop', 'shahad', '8714420728', '', 'media one side', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('40f3d622-ef3b-4763-b87d-7356be83219d', 'area 51 muhsin', 'muhsin', '9037805941', '', 'pushpa beach road', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('90b663d7-fffa-478e-bb4f-7dea1dc18801', 'big verity hotel', 'Faris Zamzam', '8357840634', '', 'poovattuparmba', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('acffbfc0-e27a-47a2-be42-44977d4525f5', 'burnight medical college', 'Faris Zamzam', '7902330166', '', 'medical college', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('c2aa4bea-5cc5-4884-9901-d1cc84ee40e8', 'cafe 19', 'Faris Zamzam', '9539919943', '', '11', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('75df1ec9-30cd-48f8-ad50-0494d387d98a', 'chai bea', 'Faris Zamzam', '7994525578', '', 'near chicko', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('d52eaa2a-9399-4fea-accd-63a036ecf0ff', 'chakkara panthal', 'anas kkr', '8075716246', '', 'kovoor', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('c4892f20-ee28-4dcf-98d5-f635c76e77c8', 'chick co', 'Faris Zamzam', '9037670428', '', 'near live alfahm', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('35d7dcde-4a67-4fd8-828a-f7620e79d3cf', 'chopstick palazhi', 'Faris Zamzam', '9567299344', '', 'opposit hilitmall', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('94dc3226-bb3a-4e28-94ae-953f79136112', 'cm momos', 'Faris Zamzam', '9567967769', '', 'puthoormadam', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('496dd817-f7dd-4793-b46c-c4181cf61b70', 'dahban mandi', 'Faris Zamzam', '8714561099', '', '1111', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('d8ce3cad-7cb2-49d3-96d5-3a25aa064c10', 'dana arakkinar', 'Faris Zamzam', '111111111', '', 'near ninja', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1a182ba5-f01f-412f-aec9-3db0bd775c67', 'dana areekad', 'Faris Zamzam', '8921395548', '', 'areekaad', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('536feb85-6ad8-4cb3-a1af-32e81f0ad7c5', 'food qissa', 'arsalan', '9544664487', '', 'kovoor', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('0b38a4d5-bc22-413f-8231-7f73a351f15f', 'grill cafe', 'raaib', '8606991612', '', 'kovoor', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('39eb1902-7d9f-4074-aa46-334c51db9a94', 'grill chouk treat', 'niyas', '9895600757', '', 'chakkumkadav', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('0ab72049-0b24-414e-b620-ccccd937ccc3', 'kannadikkal 2', 'Faris Zamzam', '9656775234', '', 'kannadikkal', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('5305c2a9-b5e0-44cd-b2dd-df56fc8f7725', 'karthika bakes kannadkkal 1', 'Faris Zamzam', '9745530417', '', 'kannadikkal', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1a233bc7-e647-47e0-862d-a509ccf29bee', 'khaleej restaurent', 'mansoor', '9961399123', '', '11', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('bcb83141-1c79-4ca2-9176-3e4c989cccee', 'live alfahm mangav', 'noushad', '7306081595', '', 'kaloor road mangav', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('39506eaf-b662-4bdf-8ff6-e9b373c58894', 'mandi pokkunnu', 'Faris Zamzam', '1111111', '', 'pokkunnu', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('74f6ce17-be92-4f40-9ddc-0445eb804beb', 'mims cool', 'Faris Zamzam', '9947656755', '', 'opposit mims hospital', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('ea6a58ed-76ad-4e1c-9310-3a9c9271ae35', 'morris kovoor', '9562399009', '9562399009', '', 'kovoor', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('47c25c46-6aee-49a3-a31c-5938e3f255cc', 'MR hypermarket', 'afsal', '9061566155', '', 'opposit kuthiravattam memtal hospital', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('802f067e-e6ee-4c09-8ab2-b8f13cc17229', 'mr hypermartket', 'Faris Zamzam', '8714415798', '', 'perumanna poovattuparamba', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('0d413073-7e88-41a0-b409-30ca27db474a', 'mr mandi velliparamba', 'sinan', '9207972309', '', 'sd', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('0a680a34-0db8-4491-9c3f-871b8d9bb4db', 'ngo crunchy tales', 'Faris Zamzam', '7356644560', '', 'near ngo qurters', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('c1bee817-98f1-4b76-a7bc-8748f13e0fe5', 'ninja arakkinar', 'Faris Zamzam', '9847119900', '', 'arakkinar', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1fb39cd6-c1b9-4fc2-b85e-99fce18b2c1b', 'orkid bekery velliparmba', 'Faris Zamzam', '1111111', '', 'rr', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('fa25ce12-0bb5-4c5e-bf6a-a8ce9960c417', 'ossobocco', 'Faris Zamzam', '7012148560', '', 'kovoor', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('7bc5658d-f208-44e9-b7c6-6db0313470bd', 'parambil;', 'ratheesh', '7736102358', '', 'near chopstick', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('3022c00b-28ae-41c6-af0e-ae2e501aa3c4', 'raheem', 'raheem', '9995938074', '', 'perumanna', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('7509f98b-5380-4e96-bd88-3c861d7acce7', 'raheem shop mediaone', 'Faris Zamzam', '9605502064', '', 'media one side', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('f257d44b-bd0d-453c-a990-ec2ad9828ee9', 'raidan mandi', 'Faris Zamzam', '11111111', '', 'mathottam', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('b6643869-e550-4846-8fdf-aa7fa817977e', 'rajitha chappathi company', 'Faris Zamzam', '8089170587', '', 'kuttikattoor simla oppsit', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('8b1162b2-53e6-471d-9f22-07cc459b4c88', 'shaz live alfahm', 'noushad', '7012008262', '', 'chevayoor', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1d35e983-f0fe-4759-b38b-058b546be03e', 'sulthan mandi', 'Faris Zamzam', '8075904637', '', 'nearest media one', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('1d537e3a-af1a-447b-8e86-915b398cdca0', 'tasty hut restaurent', '11111', '11111111', '', 'medical college', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('4f570478-e33e-47e8-930f-6607b8db78c0', 'thuba bakery', 'mansoor', '9101392278', '', 'poovattuparmba', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('4d35c0eb-240e-4638-89c0-e2f283858605', 'zeezo mims', 'Faris Zamzam', '7907144023', '', 'nearest mims', 'kozhikode town', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('dc0833e8-5314-4c90-a64d-5fac03113c3b', '6o clock karanthur', 'thajudheen', '7356017667', '', 'kunnamangalam karanthur', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('94bd972d-9d43-4979-99b5-8fdfe2b8ff49', 'ajwa karanthur', 'rafeeque', '9061117522', '', 'near markez', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('fa5f8714-b3d3-4754-b791-9ae7a9d0a1af', 'al aroosh mandi', 'Faris Zamzam', '9207215117', '', 'kunnamangalam', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('bef9c287-0151-4a7c-802c-ea0c1668d056', 'berrys pottammal kozhikode', 'musair vk', '7510264182', '', 'pottammal', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('d34d7a6f-d41c-4941-ba02-a6daf4bdf248', 'famous mundikkal thazham', 'shafi', '8086100817', '', 'mundikkal thazham', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('bda56798-ea35-4dc8-832e-d52ac1b2f05c', 'famous padanilam', 'Faris Zamzam', '11111111', '', 'padanilam', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('b78b29e6-c443-4142-9735-0feedfea0c89', 'friends bekery', 'ashik', '9498807837', '', 'near jisha', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('54fc57f3-9778-4594-9224-c5ebef1d3269', 'jisha bekery', 'jisha', '9544411062', '', 'kuttikattoor', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('fbd00739-694b-49ea-83db-e512afd52a2b', 'jucify kkr', 'Faris Zamzam', '9745822839', '', 'kuttikattooor', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('814ae516-6610-454e-84f0-31002126828c', 'le shawaya', 'bhai', '8943907415', '', 'karanthur', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('680122de-47da-424e-851d-3f955b56a58c', 'MR  supermarket muriyanal', 'Faris Zamzam', '9946854641', '', 'muriyanal jio pumb side', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('9e261061-bdc2-4d8c-bc20-179a943b57ab', 'mundikkal tea shop', 'Faris Zamzam', '9961321783', '', 'near cwrdm', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('da1f9122-bf56-48e6-9ebf-2e69d9b7a1c7', 'periyangad bekery', 'Faris Zamzam', '7356119556', '', 'periyangad', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('daaf2b27-7449-464a-95bb-1baae98f4490', 'raheem shop mundikkal', 'Faris Zamzam', '111111', '', 'mundikkal junction', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('f3232a50-6428-41ec-bbd0-f5ecbd7e20c2', 'royal feast padanilam', 'Faris Zamzam', '9746440450', '', 'padanilam', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('85d0f7a3-fb03-4443-a475-1a8f6790fa12', 'saps mundikkal thazham', 'Faris Zamzam', '7736553020', '', 'mundikkal thazham', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('33de219c-9f40-46d7-b047-9293ca2bd261', 'tea topia kunnamangalam', 'jinas', '9633494101', '', 'kunnamangalam', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('cdd8d1b3-7f8c-4f3f-a894-a4c712a236b6', 'thuba kuttikattoor', 'Faris Zamzam', '11111111', '', 'near thurkish', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('5eb48c17-b04b-406f-8343-d1e79e85fc1f', 'thukish kunnamgalam', 'fayas', '8822788162', '', 'kunnamangalam', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('6695c1f7-9c61-478c-b8b6-c1c7471c0e43', 'thurkish kuttikattoor', 'fasil,fays', '6238734002', '', 'kuttikattoor,town', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('95d45d15-3c4c-4f30-a05f-9201a29dd6bf', 'usna bakes', 'usna', '9846163311', '', 'anakkuzhikkara', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('8cf802b3-67df-40ed-ba1c-fd39ad0e95fe', 'vinod bekery peruvayal', 'Faris Zamzam', '8907557069', '', 'peruvayal', 'KUNNAMANGALAM,MUNDIKKALTHAZAHM ,KANNADIKKAL', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('6669f392-6a1b-4379-b65b-8e33909fc152', 'anshif kubbooos', 'anshif', '7306136324', '', 'poovattuparampa', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('20dab026-f4da-4c7c-907b-ac77521bf390', 'bun basket', 'muneer', '9400213293', '', 'cwrdm opposit', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('d6b1d0fd-6527-4706-870c-2f25b78f1bdc', 'chappathi kakka', 'Faris Zamzam', '9567544041', '', 'chappathi company kkr', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('c02ad963-8cf1-4307-8bf5-41fa028c9517', 'easy foods kkr', 'ismayil', '6238406994', '', 'kuttikattoor', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('b7e62a2f-9aa8-4d9e-aaaa-2d7c630fe7cf', 'sp', '111111', '1111111', '', 'cmpany', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('07be323f-97b2-4933-9617-eae60806aca7', 'velliparamba chappathi yettan', 'Faris Zamzam', '11111111', '', '111111', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('5fd79c4c-357b-426e-9d76-5fd0538bfb3e', 'xylem kitchen pvt ltd', 'Faris Zamzam', '8714606785', '', 'poovattuparamba', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;
INSERT INTO customers (id, name, owner_name, phone, alternative_phone, address, route_name, opening_due, current_balance, is_active)
VALUES ('8e57d2e3-1a71-40eb-9324-31888c1aba9c', 'zain kubboos', 'usman', '9349032555', '', 'peruvayal', 'zamzam foods', 0.00, 0.00, TRUE)
ON CONFLICT (id) DO UPDATE SET opening_due = 0.00, current_balance = 0.00, route_name = EXCLUDED.route_name;

-- 4. Customer Custom Product Pricing Matrix
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c7878f4d-c169-4b91-b45f-e94f07c53edb', 'dc0833e8-5314-4c90-a64d-5fac03113c3b', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('baed2600-e9f6-4990-b71a-6dbddcffddc1', 'dc0833e8-5314-4c90-a64d-5fac03113c3b', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('21807e8d-3d86-4e6a-9283-85c209db7874', 'a49ed078-9384-41e8-9e48-d2d894718dd8', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('185c9a3d-4504-44aa-ba2b-00060ccd666d', 'a49ed078-9384-41e8-9e48-d2d894718dd8', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4980f172-8565-48dc-a11a-0f4ef764d48f', '651e2320-d0f3-4474-9236-b9bd8d297f10', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('dc8fc20e-50c1-479f-8c47-34602e855701', '651e2320-d0f3-4474-9236-b9bd8d297f10', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('36feefd7-ed78-472f-85c6-6f986dd113b7', '94bd972d-9d43-4979-99b5-8fdfe2b8ff49', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1aa00ca3-8742-484f-8f45-316297285a76', '94bd972d-9d43-4979-99b5-8fdfe2b8ff49', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b4c92463-cbc7-4f5b-88ec-7f3107affe3e', '42e1bf84-de07-41ac-abf3-2bb4f74e7e01', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cfa35829-de05-4ac6-85d5-ac6d13f538d9', '42e1bf84-de07-41ac-abf3-2bb4f74e7e01', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6f1b885d-861b-4f79-a57a-e62727a02d92', 'fa5f8714-b3d3-4754-b791-9ae7a9d0a1af', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c302fa50-6850-4912-9cb4-bf2ebc8a0efa', 'fa5f8714-b3d3-4754-b791-9ae7a9d0a1af', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4e7ad5a8-b31d-40bf-9ff4-6f0972c6bced', '97b29e8e-b39a-4b8f-ba8d-df17f096408c', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.25, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c1f26485-a9ef-4a0b-aab7-63f2aa262d1c', '97b29e8e-b39a-4b8f-ba8d-df17f096408c', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('ed4f85fb-dfaa-4d05-9e96-dd686fd011f3', 'e48ccb86-5329-408d-8b48-5d45399b47ca', '8bf97a76-6248-4bc4-876f-6012c0850668', 37.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('157b2552-5acb-4998-a7e5-1dcbc5d84893', 'e48ccb86-5329-408d-8b48-5d45399b47ca', '8bf97a76-6248-4bc4-876f-6012c0850668', 37.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('77c8f80f-4853-491a-b9b9-4de689d83aa2', 'e48ccb86-5329-408d-8b48-5d45399b47ca', '07d63c31-163f-4d05-80ad-f5e604eec936', 95.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('eac694cd-1ec6-4309-aeb8-b9b8fb73faa8', 'e48ccb86-5329-408d-8b48-5d45399b47ca', '442ad867-1d4a-4556-a47d-847a08124612', 37.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('90e6887a-b727-4fa6-a60d-ea59e130d30d', 'e48ccb86-5329-408d-8b48-5d45399b47ca', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('30703153-4e60-4203-b7f1-b124412a626e', 'e48ccb86-5329-408d-8b48-5d45399b47ca', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1714ebcf-4db3-4bac-b141-09ecfb0d9897', 'e48ccb86-5329-408d-8b48-5d45399b47ca', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cd4b40de-f8c8-4d29-ae95-ec50fbf3ce7b', 'e48ccb86-5329-408d-8b48-5d45399b47ca', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d21b6e28-fb65-45ad-a969-c9f74ab8f835', 'c29e9f36-b976-43a2-b238-4a21a9e48587', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('808a239a-edb4-48ab-9cfa-907761cb94eb', 'c29e9f36-b976-43a2-b238-4a21a9e48587', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b18bd841-ac3d-4e13-b3b8-dc24ac56bd08', '6669f392-6a1b-4379-b65b-8e33909fc152', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('226a58bb-fa8e-4899-9d7a-0aa9f39b11be', '6669f392-6a1b-4379-b65b-8e33909fc152', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('89fa51ad-19ff-42e1-8778-24b2001eaba9', '50eedcfe-7830-42cf-b7e8-baff55c7a444', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('58815541-bfff-4f07-89b2-07e43d01d56e', '50eedcfe-7830-42cf-b7e8-baff55c7a444', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4369909a-2de0-4ca7-b562-309c90517b5b', '40f3d622-ef3b-4763-b87d-7356be83219d', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('caa37fba-b265-4780-a9b2-05773ff8fef7', '40f3d622-ef3b-4763-b87d-7356be83219d', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6a69fcc4-88a9-4985-bf2b-dcb1917f13da', '23261a04-aafb-4226-a083-8543df44b4a2', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6d4a8061-7a1d-49cc-8444-75e02d45f2ca', '23261a04-aafb-4226-a083-8543df44b4a2', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5b5d2b67-e40a-4fde-b599-adde86564156', '590d7a56-16db-4100-a363-debb5a096bc2', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6d6110e7-abb2-4461-996c-eecb8c3796b5', '590d7a56-16db-4100-a363-debb5a096bc2', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8b136a47-b24b-456d-9a81-4092288496cb', 'cc7dd423-0623-4058-964c-2e935186caf6', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('970b25ed-1bf9-46f0-86dd-fcb03e99aced', 'cc7dd423-0623-4058-964c-2e935186caf6', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f2ae99c0-0b76-4572-916c-08617b322397', '3abb6682-74e6-4cb9-bcb6-834ebcebd026', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('638ca8b4-f145-41e3-ba1e-383fe64adffa', '3abb6682-74e6-4cb9-bcb6-834ebcebd026', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1bb84a6c-57d2-4e10-8c5d-70ff8d2c205d', 'bef9c287-0151-4a7c-802c-ea0c1668d056', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bd6c0f5e-eb49-404b-b2d4-258b68354b3f', 'bef9c287-0151-4a7c-802c-ea0c1668d056', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 7.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('21ad2891-d43b-4363-969b-b38263e06fa4', '90b663d7-fffa-478e-bb4f-7dea1dc18801', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d0789fbf-97c3-47a7-a51e-cd532ec37419', '90b663d7-fffa-478e-bb4f-7dea1dc18801', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bca1026f-3e8f-4047-873d-84ad3de48308', '93351bf1-1a2d-40d8-b34f-6adfd4af79dc', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 3.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('af2bd0aa-9504-441c-a3bf-fa922828fa30', '93351bf1-1a2d-40d8-b34f-6adfd4af79dc', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 7.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8005d155-809f-495b-ab15-4819dab6cf75', 'abb3e630-c065-440a-8701-0d4f70b533db', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.25, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e40822fc-09a7-4910-9768-43cffab76b21', 'abb3e630-c065-440a-8701-0d4f70b533db', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d9cf00ee-4e77-4cc1-a82d-21455eb72ebd', '77aaf71d-58b6-478c-83b0-185d8729f1a1', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bdd8d130-8d75-4be9-9e34-f44c4a93db37', '77aaf71d-58b6-478c-83b0-185d8729f1a1', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('17dacb24-4c2c-4f47-8ab4-432773c16152', '20dab026-f4da-4c7c-907b-ac77521bf390', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('52d3bd50-f8e9-462a-b2b4-6e3c68455b20', '20dab026-f4da-4c7c-907b-ac77521bf390', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a3a7e8d1-7554-435a-ae34-c7b594368755', 'acffbfc0-e27a-47a2-be42-44977d4525f5', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('91d5ec5a-11f0-49cb-98af-713c677b0477', 'acffbfc0-e27a-47a2-be42-44977d4525f5', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f9cc53b2-9236-4271-8a70-8ba0ae14d5fe', 'c2aa4bea-5cc5-4884-9901-d1cc84ee40e8', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f48b7195-461f-4a24-81fb-3f711679d423', 'c2aa4bea-5cc5-4884-9901-d1cc84ee40e8', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c63140a6-d5b2-439c-b493-ac745eb22db1', '75df1ec9-30cd-48f8-ad50-0494d387d98a', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b650096c-0cf9-4dc7-8d65-7f238e4afaca', '75df1ec9-30cd-48f8-ad50-0494d387d98a', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bd116628-2608-4b9b-8654-b2c7388aecc7', '6d0fab5b-f5a1-4d69-91b0-2b7ad7274f43', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('84b5fbc8-27f7-40e8-93b1-4afef7e5d223', '6d0fab5b-f5a1-4d69-91b0-2b7ad7274f43', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('86000b77-6ce6-4787-a4af-94862a2af6be', '0889dc8d-eb0f-4376-9685-a47c0ab331cc', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0fa1e82c-b4ea-448c-ad33-61c707039047', '0889dc8d-eb0f-4376-9685-a47c0ab331cc', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('72f9a6c2-25ae-4abf-9b0b-f9c24a87077f', 'd52eaa2a-9399-4fea-accd-63a036ecf0ff', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('09921eba-f6e2-4d27-9319-4b08cdd81f59', 'd52eaa2a-9399-4fea-accd-63a036ecf0ff', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4af70b1f-78ab-40d0-81ed-48b23448a809', 'd6b1d0fd-6527-4706-870c-2f25b78f1bdc', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e4603dc9-898d-45b6-838d-ee1e645105ae', 'd6b1d0fd-6527-4706-870c-2f25b78f1bdc', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('9ebc9dab-d296-4fff-b89a-f911c8749cd8', 'c4892f20-ee28-4dcf-98d5-f635c76e77c8', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('fbb412b1-0c06-45ea-ad02-1d648485c7eb', 'c4892f20-ee28-4dcf-98d5-f635c76e77c8', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('50b7376e-612a-48c8-802c-3a93c537680a', '35d7dcde-4a67-4fd8-828a-f7620e79d3cf', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('58a6229c-84ad-495f-8656-516343b72a65', '35d7dcde-4a67-4fd8-828a-f7620e79d3cf', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6d988b7c-3bf1-44d6-8126-c9f32f37a77e', '94dc3226-bb3a-4e28-94ae-953f79136112', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4057510a-9179-4169-a739-7715291039d6', '94dc3226-bb3a-4e28-94ae-953f79136112', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8b3872d3-6c09-4f44-afed-a77d521cfa15', '631a1b07-6104-488e-9ec1-dae8fa71b1ff', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('92519b0e-74f6-4210-83ed-8aee9f30cc2a', '631a1b07-6104-488e-9ec1-dae8fa71b1ff', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8fc599d4-3950-45ba-a79c-3143d8e8a809', 'f51bb7bf-d197-491d-a7af-773f9bfd4661', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cfe7f372-c4d6-4ae1-b38d-a70e8670721c', 'f51bb7bf-d197-491d-a7af-773f9bfd4661', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a0feedda-ee4e-4885-8aff-3c443ca5aa33', '23ab0b69-fdb1-49da-803b-0f38f3079fc7', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a8647d27-e241-46c6-bd5f-2bb5aa498279', '23ab0b69-fdb1-49da-803b-0f38f3079fc7', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('3cc5aba9-3fba-4c90-874b-d6d9ff4e6740', '383aeae6-e08a-4686-bb5e-664f11fdcb83', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e4fe2326-7973-4f56-8d75-9e933be82a40', '383aeae6-e08a-4686-bb5e-664f11fdcb83', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('3d70e4f7-cc14-40f8-b933-e5eca1f72f27', '496dd817-f7dd-4793-b46c-c4181cf61b70', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('be9c0eba-b423-4674-8d10-6e026dad9e30', '496dd817-f7dd-4793-b46c-c4181cf61b70', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e58365ca-2c94-4e39-b4ae-b0ac6de3c7d0', 'd8ce3cad-7cb2-49d3-96d5-3a25aa064c10', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('297b91da-7433-463f-9db2-d37366c66ec4', 'd8ce3cad-7cb2-49d3-96d5-3a25aa064c10', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bca2ba1b-d503-4d55-86ce-9995a59d5b0c', '1a182ba5-f01f-412f-aec9-3db0bd775c67', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4c38d8f7-67c0-4bcd-a3bb-f34c861b06bf', '1a182ba5-f01f-412f-aec9-3db0bd775c67', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0490a5c8-a668-4873-b818-ad2a885da4f1', '75352512-01fb-4a40-8068-aa762b289e85', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4332d8d2-4f50-4e06-a6f6-6d65e673189a', '75352512-01fb-4a40-8068-aa762b289e85', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('014a57e8-4907-469e-9a2b-8e280d5b4e66', 'c02ad963-8cf1-4307-8bf5-41fa028c9517', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0671cc4b-53d6-4d5e-ab44-412d34a2ec8c', 'c02ad963-8cf1-4307-8bf5-41fa028c9517', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('2b9eb4e0-6c2c-4da2-86af-f454be23d005', '2c4e3160-a549-42e5-81e7-007f6759d558', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4b0b5239-3024-41e1-a875-621a5dd49270', '2c4e3160-a549-42e5-81e7-007f6759d558', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('97143dfb-ecfa-4fbc-9d29-f3d296608e03', 'd34d7a6f-d41c-4941-ba02-a6daf4bdf248', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('18446ca7-661e-4ab0-ae94-29d24127456d', 'd34d7a6f-d41c-4941-ba02-a6daf4bdf248', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('21710c69-4c21-4d07-a1e0-8ae24a268888', 'bda56798-ea35-4dc8-832e-d52ac1b2f05c', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cfaf6d53-c913-4a4c-8c5a-346ffa0f2681', 'bda56798-ea35-4dc8-832e-d52ac1b2f05c', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a322fb6e-1d9d-4ba7-8439-1f795960a2e6', '8e9b437e-683a-4316-82fc-506200d7234d', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e274743f-baa5-40fc-b0d1-41e52974364e', '8e9b437e-683a-4316-82fc-506200d7234d', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('45f941de-1cb6-4d03-948b-2b9b9820d2e4', '56332230-64b5-42c5-aeae-614cfc00f228', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('aad33674-a19b-43f5-b6e9-b3fa730727f1', '56332230-64b5-42c5-aeae-614cfc00f228', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('65c72a0d-6552-45cb-8ee6-abcca5b9b6a6', '536feb85-6ad8-4cb3-a1af-32e81f0ad7c5', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6fd7417d-02d7-4741-a26f-27eb9c83aa5b', '536feb85-6ad8-4cb3-a1af-32e81f0ad7c5', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('7e4910ec-d65e-45f0-bd7b-7be6bb1e77ad', 'b78b29e6-c443-4142-9735-0feedfea0c89', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0d6ac5bb-97c9-4ad7-abe8-a71995e07d4c', 'b78b29e6-c443-4142-9735-0feedfea0c89', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('2197b544-ec11-4190-ba08-81f2ab2c911b', '5e6a19ca-5008-47c2-8865-396e175b2e92', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('3752e9ab-8e13-497b-a8fb-55e3270aaf8e', '5e6a19ca-5008-47c2-8865-396e175b2e92', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f4ef7f80-b2b4-4ddb-88fd-f7258fc80dd8', '23a2d638-5e81-4a64-87c8-483b22f3134f', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('41af2556-e2be-4826-85e3-49d7b76fb2be', '23a2d638-5e81-4a64-87c8-483b22f3134f', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1c930c3d-fb55-42a6-85de-3a35bfab7411', '0b38a4d5-bc22-413f-8231-7f73a351f15f', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d1bf00b6-c33f-461a-85b2-39f7c8e05561', '0b38a4d5-bc22-413f-8231-7f73a351f15f', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5262b868-7b48-45af-8229-fca611854430', '39eb1902-7d9f-4074-aa46-334c51db9a94', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('dfd0aca0-47ab-47ed-bed9-c1949b0072b0', '39eb1902-7d9f-4074-aa46-334c51db9a94', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6c53a637-ffc1-4b29-bb02-556cf5637c06', 'd4a18ab0-6880-4ce8-b6fc-6af1575a640a', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8bb18ba3-c686-43f2-a0aa-e60ae8d39d6a', 'd4a18ab0-6880-4ce8-b6fc-6af1575a640a', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('11b374bf-bc5a-4598-a2ca-308b6b4e0f57', '1cf8f2a4-ac4e-48f2-99f0-74d9e1f795c5', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('75f17439-da16-4b2d-b325-a1e8cc376e48', '1cf8f2a4-ac4e-48f2-99f0-74d9e1f795c5', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('960c4181-7736-4771-a353-53b891e779f0', '63ccb492-a4f9-44b1-bd82-ea92d09139b7', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('180780a0-c3b9-4615-849f-3238a9c37cdd', '63ccb492-a4f9-44b1-bd82-ea92d09139b7', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('13118c68-afa4-43fa-bc21-0005365f9a3f', '54fc57f3-9778-4594-9224-c5ebef1d3269', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('744371f3-7847-4655-ae11-775b313139ed', '54fc57f3-9778-4594-9224-c5ebef1d3269', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c15fd5cd-b020-4eeb-9ecc-965868101ff2', 'fbd00739-694b-49ea-83db-e512afd52a2b', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('2b14a6bd-aeb0-4601-b85c-0810c22aa465', 'fbd00739-694b-49ea-83db-e512afd52a2b', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('7f7d96ca-679d-42d8-ba84-7ce201612338', '2efa7fce-4b48-41e3-824c-135d5b6e91b3', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('90b63c16-61d1-4995-8290-c141bb6f6171', '2efa7fce-4b48-41e3-824c-135d5b6e91b3', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('658c48fc-3560-465a-87e3-92bfe27e9268', '0ab72049-0b24-414e-b620-ccccd937ccc3', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('7e72b59a-7db2-45c1-a06b-91252a72b30e', '0ab72049-0b24-414e-b620-ccccd937ccc3', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('022ca962-91d6-4a67-b10d-3babef649365', '5305c2a9-b5e0-44cd-b2dd-df56fc8f7725', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('889004e7-df4d-4ade-a787-7b8f5946dbc8', '5305c2a9-b5e0-44cd-b2dd-df56fc8f7725', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('591e978c-65b3-49e4-a19f-0e80e9ca7a24', '1a233bc7-e647-47e0-862d-a509ccf29bee', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('56047340-4dfc-4c3e-828f-cf0466514a60', '1a233bc7-e647-47e0-862d-a509ccf29bee', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('3dddbf3e-55d1-48cf-b116-75c2894079b5', 'a303dabb-4ea7-4efd-a15b-eb5272f4f3fd', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e0028019-641a-461d-8224-93d569259b87', 'a303dabb-4ea7-4efd-a15b-eb5272f4f3fd', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('7f100ff4-7b81-42f7-ae5b-f3f3e16b262f', '814ae516-6610-454e-84f0-31002126828c', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('60556d68-7e8b-41af-b8ea-e580bdf0f3d0', '814ae516-6610-454e-84f0-31002126828c', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0d4e54e2-9755-4d2a-ab37-778bc5461d52', 'bcb83141-1c79-4ca2-9176-3e4c989cccee', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a2ff9cb7-7b4b-4a15-bbee-5d29b05317f1', 'bcb83141-1c79-4ca2-9176-3e4c989cccee', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8d46ea5f-eb5f-42cb-a768-e85336f5889c', '06461738-e4f1-45ea-a9e6-6076a53f79d0', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('292c2439-6825-48e1-a6b0-8d435bb87b32', '06461738-e4f1-45ea-a9e6-6076a53f79d0', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d4eb99fe-dea9-428d-bed1-54fdf33d41d8', '39506eaf-b662-4bdf-8ff6-e9b373c58894', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('fdf73ced-557b-4135-8bb7-e644bde279ec', '39506eaf-b662-4bdf-8ff6-e9b373c58894', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5d345b1a-7044-4e3d-b457-882e990c6125', 'c1cf92ef-7902-40f5-9c6e-be5ae7df1322', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4660b482-57e0-4ebb-8e0f-66d949754f29', 'c1cf92ef-7902-40f5-9c6e-be5ae7df1322', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d000f916-a658-4c9a-833c-0e550f258b87', '88a2c57e-5e0b-403f-9796-e6b281b30f8c', '8bf97a76-6248-4bc4-876f-6012c0850668', 37.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6ce669c1-e47e-4f61-bc65-86a9e1953ea0', '88a2c57e-5e0b-403f-9796-e6b281b30f8c', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5a4f5e35-1418-429e-9b2d-4e9a56dc2d76', '88a2c57e-5e0b-403f-9796-e6b281b30f8c', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('15f41ae1-7a83-487d-a098-ee240e5ac9a9', '037aef4b-6d12-4ad3-ba59-478a4104fea7', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-03', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('85cb76bb-a355-4960-8721-16b3ebb10303', '037aef4b-6d12-4ad3-ba59-478a4104fea7', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-03', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f676e02a-961d-4690-aab6-ed31fcb99195', 'a5ad7e7c-975b-4e22-8c46-c851cba5e3fc', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e64b7707-40a5-4247-9717-3dc63058ea4c', 'a5ad7e7c-975b-4e22-8c46-c851cba5e3fc', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 20.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1bce9716-ed8e-4492-8384-d661924f057e', '74f6ce17-be92-4f40-9ddc-0445eb804beb', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cb9093eb-5507-4e82-90b6-b6118dead1a2', '74f6ce17-be92-4f40-9ddc-0445eb804beb', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cdc70d91-6c5a-4d53-be17-4797cffab6be', 'd46085e1-ef78-4a53-99b6-0a0f9acce034', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-01', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('016faea4-717c-42b1-bd2e-0681c05fa743', 'd46085e1-ef78-4a53-99b6-0a0f9acce034', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f6ac997c-7b98-4370-8018-a767fc92cff1', 'ea6a58ed-76ad-4e1c-9310-3a9c9271ae35', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e634e017-c834-44b4-93b6-bd5f1cc10368', 'ea6a58ed-76ad-4e1c-9310-3a9c9271ae35', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4c0c3801-b20a-46ee-a947-7226ccd8f582', '47c25c46-6aee-49a3-a31c-5938e3f255cc', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6ac1463e-3d16-4de9-8745-8a307e88436a', '47c25c46-6aee-49a3-a31c-5938e3f255cc', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5af75a18-f686-4770-a168-5dc57d505447', '802f067e-e6ee-4c09-8ab2-b8f13cc17229', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d91937f4-1055-425a-b3ed-a9d61ccb4661', '802f067e-e6ee-4c09-8ab2-b8f13cc17229', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('79d2dbdf-0648-48a1-acb1-191b02504e60', '0d413073-7e88-41a0-b409-30ca27db474a', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e046d26f-7110-4626-b147-4a3438d77c39', '0d413073-7e88-41a0-b409-30ca27db474a', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bf6d7b32-113f-4400-9a54-07d5d224c1cc', '680122de-47da-424e-851d-3f955b56a58c', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('eaeaa59f-b30b-4d0f-9da6-936b2f42257a', '680122de-47da-424e-851d-3f955b56a58c', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('98438421-037d-470d-bab7-8b30ee4a99f8', '57bd5f24-146e-4a51-a989-d71ad8e98897', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1837c3a3-0eaa-4502-9986-8e238bd901da', '57bd5f24-146e-4a51-a989-d71ad8e98897', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a14a92b8-935f-499c-b1ce-2fe93cb7e653', '0d72471e-d721-4102-a751-33b0af323102', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f2de5b8e-3e4e-46c0-af40-9c475e4aa4ca', '0d72471e-d721-4102-a751-33b0af323102', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f801a454-4249-49c3-898e-5e0127d8b52e', '9e261061-bdc2-4d8c-bc20-179a943b57ab', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('10b7fe5f-c9f5-4076-bf70-60265c34c2d8', '9e261061-bdc2-4d8c-bc20-179a943b57ab', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8dd4da6e-6f83-4637-9e2c-621d5bbe8518', 'b771c38f-4813-4f55-89e7-9fa1dc855482', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('210c7850-bdaf-4d78-a9ef-6ec07efba97a', 'b771c38f-4813-4f55-89e7-9fa1dc855482', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0507e3ed-5d96-4bb8-a4b9-483e52095c50', '0a680a34-0db8-4491-9c3f-871b8d9bb4db', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cefdb5e9-123d-45d2-bba6-3da02a744a90', '0a680a34-0db8-4491-9c3f-871b8d9bb4db', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b6fc0612-e01a-4e04-a156-a5f418d938b2', 'c1bee817-98f1-4b76-a7bc-8748f13e0fe5', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b7f1c4da-001e-4d28-86ac-e904c0f2ce15', 'c1bee817-98f1-4b76-a7bc-8748f13e0fe5', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c9d53c43-bf7d-4dad-8176-98794e43bbad', 'c3f64959-21e4-4702-a992-8cd1c5d5b689', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('547deca9-d4d1-4a36-bbcc-b8e5f3a3c456', 'c3f64959-21e4-4702-a992-8cd1c5d5b689', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('ec7f1a69-297d-4355-87e8-31300a816a77', '960fa41b-75b4-4855-a7ef-57c51d47e916', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d33f8074-e392-43b3-a7bf-090912d24224', '960fa41b-75b4-4855-a7ef-57c51d47e916', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('beac90b9-ef72-45a7-8443-1eaaa6f49ecb', '346d0ee8-2f70-474b-b32b-f06cbc3f4660', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1c63ce14-8302-47db-a261-0e54717e7903', '346d0ee8-2f70-474b-b32b-f06cbc3f4660', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d0fdb689-5ce9-4b72-bfb8-9668bce44d34', '2d35e722-d6ee-4fc0-9f0c-ec6a262bfa45', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8bc4e293-c095-4fc5-9de2-96b1ddf54e45', '2d35e722-d6ee-4fc0-9f0c-ec6a262bfa45', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('fe1ce1fd-930d-441e-9e1f-11edd56bc3dd', '1fb39cd6-c1b9-4fc2-b85e-99fce18b2c1b', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('ee6b6abf-b1dd-41a8-b2f5-1382716dbabe', '1fb39cd6-c1b9-4fc2-b85e-99fce18b2c1b', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('eaed5cd6-9da2-4419-a522-b841d2f780d9', 'fa25ce12-0bb5-4c5e-bf6a-a8ce9960c417', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('99ade168-e80b-4d90-9729-9aa69cc73c39', 'fa25ce12-0bb5-4c5e-bf6a-a8ce9960c417', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e5e3a7ec-5bc6-4e33-9562-2d8e7fc65071', 'd60478ba-8252-4856-bcd9-360195648218', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('fcb6f8de-d9f4-4241-a043-a00c4c5b00bc', 'd60478ba-8252-4856-bcd9-360195648218', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f76f59d3-ef07-4125-82bb-81f08358a365', '7bc5658d-f208-44e9-b7c6-6db0313470bd', '8bf97a76-6248-4bc4-876f-6012c0850668', 37.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5d70a31c-4187-4014-a6e3-afa51d8f8765', '7bc5658d-f208-44e9-b7c6-6db0313470bd', '07d63c31-163f-4d05-80ad-f5e604eec936', 95.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8779ff71-0ea5-41b2-9182-8647063e50de', '7bc5658d-f208-44e9-b7c6-6db0313470bd', '442ad867-1d4a-4556-a47d-847a08124612', 37.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('66e4237a-55d0-4f1c-a630-b9957920da28', '7bc5658d-f208-44e9-b7c6-6db0313470bd', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d17c489d-a6b1-4ecd-811b-0cf7179a70b7', '7bc5658d-f208-44e9-b7c6-6db0313470bd', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4050a8eb-ee03-4aa8-bd18-fc57b62ef1f6', 'da1f9122-bf56-48e6-9ebf-2e69d9b7a1c7', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('2fe6cdd9-9bd3-4c4d-a5ea-ed49f91db4ef', 'da1f9122-bf56-48e6-9ebf-2e69d9b7a1c7', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('915f0100-bf5d-4fb4-880c-b690a61b431e', '3022c00b-28ae-41c6-af0e-ae2e501aa3c4', '8bf97a76-6248-4bc4-876f-6012c0850668', 37.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('60845fa3-fc60-46d4-bcc4-3d8190b14b4b', '3022c00b-28ae-41c6-af0e-ae2e501aa3c4', '07d63c31-163f-4d05-80ad-f5e604eec936', 95.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d400a881-d24a-43e6-882e-cc2edd3746ca', '3022c00b-28ae-41c6-af0e-ae2e501aa3c4', '442ad867-1d4a-4556-a47d-847a08124612', 37.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b8d8be53-4b62-407e-9372-e33bb8ea020c', '3022c00b-28ae-41c6-af0e-ae2e501aa3c4', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 3.50, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('582e7b75-99c6-48f1-aa30-3702fdc382e2', '3022c00b-28ae-41c6-af0e-ae2e501aa3c4', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 7.50, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('273a1ece-836e-40ec-bce4-110e7d84f9a3', '7509f98b-5380-4e96-bd88-3c861d7acce7', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d4b9367a-5191-41f6-9571-40374c932eec', '7509f98b-5380-4e96-bd88-3c861d7acce7', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 20.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('02f5d8c7-27ca-4b6f-b898-174a5217b11b', 'daaf2b27-7449-464a-95bb-1baae98f4490', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6c50703f-ecce-43a8-a3d2-60a4a4fe8560', 'daaf2b27-7449-464a-95bb-1baae98f4490', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('839cbe52-a2d2-46c3-a226-c5a739063798', '0d653df0-863e-4afe-a906-5ccbf494679b', '8bf97a76-6248-4bc4-876f-6012c0850668', 37.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('9d131446-32ab-498d-9517-21ea843ba69b', '0d653df0-863e-4afe-a906-5ccbf494679b', '07d63c31-163f-4d05-80ad-f5e604eec936', 95.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('4c120e99-4702-49d6-b087-f4c93c159dff', '0d653df0-863e-4afe-a906-5ccbf494679b', '442ad867-1d4a-4556-a47d-847a08124612', 37.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('347586f9-46ff-4288-8885-fd1ddffe7769', '0d653df0-863e-4afe-a906-5ccbf494679b', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 6.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cd668798-8f67-4c68-9981-2bb6ab1ed682', '0d653df0-863e-4afe-a906-5ccbf494679b', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('9781f6f3-d8d9-4c34-97a8-0b36cf00d91e', '0d653df0-863e-4afe-a906-5ccbf494679b', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('fe7f869d-670a-41a6-b8c9-edff6d7c3ed0', '0d653df0-863e-4afe-a906-5ccbf494679b', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-07', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a5db948b-95b9-471b-b1a7-5c1e4e25bc58', 'f257d44b-bd0d-453c-a990-ec2ad9828ee9', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('84f1b0f4-a77e-470f-a487-064723a55e56', 'f257d44b-bd0d-453c-a990-ec2ad9828ee9', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('84abd18d-9f43-4924-95f8-c145241f780e', 'b6643869-e550-4846-8fdf-aa7fa817977e', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('35544125-d069-41fd-ac6f-84b3b9f77e40', 'b6643869-e550-4846-8fdf-aa7fa817977e', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c51d8a89-0298-4e73-9129-6da43a9e5b28', 'e05002de-155c-4686-a3b6-9474e914edbd', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0dd6f7b8-4098-48dd-855a-e92e1ca50400', 'e05002de-155c-4686-a3b6-9474e914edbd', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5e51b1ff-b155-41ed-9f9f-b6dc73ef579b', 'f22a8cd6-8877-4826-a378-30c768753a1a', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('efaed6be-2bbc-4213-891c-54e431cde322', 'f22a8cd6-8877-4826-a378-30c768753a1a', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5e1b9f7e-31e8-45fb-a421-8823460297b0', 'f3232a50-6428-41ec-bbd0-f5ecbd7e20c2', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('7168f42f-9251-4ea0-9fc9-b9e09db98aa4', 'f3232a50-6428-41ec-bbd0-f5ecbd7e20c2', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c9137164-acb0-4f5d-8a14-d0bc28a0fcf0', 'f6a3ed79-136a-4a8b-be11-cb48bbb9fcc0', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('3596440f-0214-4265-aadf-d845f3343aee', 'f6a3ed79-136a-4a8b-be11-cb48bbb9fcc0', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('6467996f-fbe5-49d8-9e0a-96d1764e3e7f', '85d0f7a3-fb03-4443-a475-1a8f6790fa12', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cf12447c-0ae8-4c92-a8a2-d3961f7704d1', '85d0f7a3-fb03-4443-a475-1a8f6790fa12', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('d01e9e58-320f-433a-a0e2-249840a715c2', '1ccbbedd-f08d-4c99-9916-f0fdda1d408e', '8bf97a76-6248-4bc4-876f-6012c0850668', 37.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('22f70186-796e-46b7-95d0-ede903a51754', '1ccbbedd-f08d-4c99-9916-f0fdda1d408e', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('47425d7d-2a3f-4e2c-aa2b-157573e5b05a', '1ccbbedd-f08d-4c99-9916-f0fdda1d408e', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-05', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('c4978a40-5283-43ec-b8d2-3987a5f60fa6', '8b1162b2-53e6-471d-9f22-07cc459b4c88', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('2bacefb0-55ef-4ec7-a713-bed6d515caf5', '8b1162b2-53e6-471d-9f22-07cc459b4c88', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cb67b05c-f90e-4412-b26c-1a8e8c88625e', 'a0421574-6334-4b84-a5e5-46243cff2d4a', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e28f3d57-7294-4644-b344-b6286628d6d0', 'a0421574-6334-4b84-a5e5-46243cff2d4a', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bce99c2a-2b6b-472d-b4c4-6e402b673b14', 'b7e62a2f-9aa8-4d9e-aaaa-2d7c630fe7cf', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('efc49067-070f-4a53-8445-50b2139ff145', 'b7e62a2f-9aa8-4d9e-aaaa-2d7c630fe7cf', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('1303aa36-ba7d-480f-a4d8-92466fbb634a', '397d5e3e-4202-471e-8e4e-21ff00728f14', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f518f097-2e27-4612-9036-8db79130211f', '397d5e3e-4202-471e-8e4e-21ff00728f14', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cc8187c6-b5f0-44a2-a22a-bd0e6bb61148', '1d35e983-f0fe-4759-b38b-058b546be03e', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e338ae21-5cc9-40a0-ab68-c24a23344055', '1d35e983-f0fe-4759-b38b-058b546be03e', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('fb26a876-c7c5-411c-95be-f32812c6005e', '500e6118-e0ff-4000-985c-5fb0c291a591', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('84d286f8-372f-44e8-b2f5-ad7f4e52ebcd', '500e6118-e0ff-4000-985c-5fb0c291a591', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 20.00, '2026-10-01', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8119cb5a-ad7e-494f-bb0f-85ed3332ec88', '159927bc-d59c-42bd-b4e7-2c4c15f7aef6', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('f6fc227b-bb83-4707-be8b-de83d8d6a4ad', 'de6356c9-0ddb-49dc-bc03-d7cee3b9dec0', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5f332e14-fd4a-4da0-b0ae-3c697b481da1', '159927bc-d59c-42bd-b4e7-2c4c15f7aef6', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('87f0a3f0-1471-40ed-96ee-fc92ef071171', 'de6356c9-0ddb-49dc-bc03-d7cee3b9dec0', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8e55eb8d-9f92-4285-a729-1f2504d3ae19', '1d537e3a-af1a-447b-8e86-915b398cdca0', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('bc123e40-300c-4f7b-b9d3-2f0b4ece43fc', '1d537e3a-af1a-447b-8e86-915b398cdca0', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 8.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('3a4185f9-3413-4310-b343-32d56f5ceeac', '33de219c-9f40-46d7-b047-9293ca2bd261', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('edd9fbbc-3de0-4f36-a349-57d4c00543f8', '33de219c-9f40-46d7-b047-9293ca2bd261', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('9090f044-0db8-4169-b637-3504dfa860b0', '4f570478-e33e-47e8-930f-6607b8db78c0', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('78510ff6-365a-47cc-a934-27b1568a2fb2', '4f570478-e33e-47e8-930f-6607b8db78c0', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('64a846b2-5ad2-495f-87cc-24b8e858884e', 'cdd8d1b3-7f8c-4f3f-a894-a4c712a236b6', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('ab9b3a19-e5b5-4814-81b1-05eea90491ce', 'cdd8d1b3-7f8c-4f3f-a894-a4c712a236b6', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('8b6b9e3a-3442-4ce6-a08b-d191dbd9f1d9', '5eb48c17-b04b-406f-8343-d1e79e85fc1f', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('2a8534ce-8de4-4d3f-878d-b8437340b25e', '5eb48c17-b04b-406f-8343-d1e79e85fc1f', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0c06bb2f-d25f-438a-b531-d2f3c29d437b', '6760d06b-2b90-4487-936d-38b4fe162eb7', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cdbb0884-ef49-48f1-830a-2ba9c0e9beac', '6760d06b-2b90-4487-936d-38b4fe162eb7', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0c9e9764-e199-4e38-89d1-b3af02a1821f', '6695c1f7-9c61-478c-b8b6-c1c7471c0e43', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('10a07f73-b8b6-47a6-bcdb-c4cd45eb606d', '6695c1f7-9c61-478c-b8b6-c1c7471c0e43', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('2241436f-b81c-4cd7-942d-50428eea5327', 'a2d37b43-d21d-4df9-83fb-b3e618f8ca3f', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('e1f6b80a-f783-4f99-bf14-ce39daa84e5a', 'a2d37b43-d21d-4df9-83fb-b3e618f8ca3f', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5c4b2111-f15c-44cc-badd-ae5f8ff0c033', '95d45d15-3c4c-4f30-a05f-9201a29dd6bf', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b0317c17-6555-4aaf-9e26-095a0636049f', '95d45d15-3c4c-4f30-a05f-9201a29dd6bf', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('15b091f0-8f53-43e8-abb8-171d05ad7d8b', 'e914b0ca-38ea-4022-b445-c3401bc22276', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('825d62cc-40d9-4755-8ea2-a471077056d6', 'e914b0ca-38ea-4022-b445-c3401bc22276', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('edc72c0e-8bc2-4f9c-80f6-11112b8f35a8', '07be323f-97b2-4933-9617-eae60806aca7', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('5258fb32-be5b-4781-b8f9-2eeef6689122', '07be323f-97b2-4933-9617-eae60806aca7', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0753a1db-0a21-4314-a09a-376322063969', '8cf802b3-67df-40ed-ba1c-fd39ad0e95fe', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a04f6206-67cb-40c7-947a-29d0904a6fb6', '8cf802b3-67df-40ed-ba1c-fd39ad0e95fe', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('0d874e0b-ff31-4489-8ef9-646f7e4e7bb4', '5fd79c4c-357b-426e-9d76-5fd0538bfb3e', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('cd49d1c5-1357-47ee-8c5a-749c83d9975f', '5fd79c4c-357b-426e-9d76-5fd0538bfb3e', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('a00722c7-ffe6-4126-853e-edfcde5278d6', '8e57d2e3-1a71-40eb-9324-31888c1aba9c', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 4.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b9d5ce7f-09cd-41be-8060-90347a924fe0', '8e57d2e3-1a71-40eb-9324-31888c1aba9c', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 7.50, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('aa824dab-0f5f-4120-a9db-4bfb009c0ea1', '4d35c0eb-240e-4638-89c0-e2f283858605', 'aecd1280-ef53-4445-a8a6-7b0256046bd6', 5.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO customer_product_prices (id, customer_id, product_id, price, effective_from, is_active)
VALUES ('b07e7679-b72a-42ed-81e7-34f33c91e300', '4d35c0eb-240e-4638-89c0-e2f283858605', '8f196b7d-42c2-4af8-90d7-b20fc63c7914', 9.00, '2026-10-02', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5. System Settings
INSERT INTO system_settings (id, business_name, phone_number, pin_code, auto_backup_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', 'Zamzam Foods', '+91 98470 12345', '7667', TRUE)
ON CONFLICT (id) DO UPDATE SET pin_code = '7667';

UPDATE customers SET opening_due = 0.00, current_balance = 0.00;
