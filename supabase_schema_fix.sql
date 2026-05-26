-- 1. Fix "full_name" constraint issue
DO $$
BEGIN
    -- If full_name exists, make it nullable so we don't get the "violates not-null constraint" error
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'full_name') THEN
        ALTER TABLE customers ALTER COLUMN full_name DROP NOT NULL;
    END IF;
END $$;

-- 2. Ensure 'name' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'name') THEN
        ALTER TABLE customers ADD COLUMN name TEXT;
    END IF;
END $$;

-- 3. Migrate data: Copy full_name to name if name is empty
UPDATE customers 
SET name = full_name 
WHERE (name IS NULL OR name = '') AND full_name IS NOT NULL;

-- 4. Ensure 'name' is not null (optional, but good practice after migration)
-- ALTER TABLE customers ALTER COLUMN name SET NOT NULL; -- Commented out to be safe

-- 5. Ensure other columns exist (from previous fixes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') THEN
        ALTER TABLE customers ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 6. Ensure Payments and Sales columns exist (idempotent)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'customer_id') THEN
        ALTER TABLE sales ADD COLUMN customer_id UUID REFERENCES customers(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'amount_paid') THEN
        ALTER TABLE sales ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'status') THEN
        ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'paid';
    END IF;
END $$;

-- 7. Re-apply policies to be sure
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
DROP POLICY IF EXISTS "Enable update access for all users" ON customers;

CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON payments;
DROP POLICY IF EXISTS "Enable insert access for all users" ON payments;

CREATE POLICY "Enable read access for all users" ON payments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON payments FOR INSERT WITH CHECK (true);

-- 7. Inventory settings (negative inventory toggle)
CREATE TABLE IF NOT EXISTS inventory_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    allow_negative_inventory BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO inventory_settings (id, allow_negative_inventory)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE inventory_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_settings;
DROP POLICY IF EXISTS "Enable update access for all users" ON inventory_settings;

CREATE POLICY "Enable read access for all users" ON inventory_settings FOR SELECT USING (true);
CREATE POLICY "Enable update access for all users" ON inventory_settings FOR UPDATE USING (true) WITH CHECK (true);

-- 7. Receipts table (missing in some databases)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL UNIQUE,
    receipt_data JSONB NOT NULL,
    printed_count INTEGER DEFAULT 0,
    last_printed TIMESTAMP WITH TIME ZONE
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON receipts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON receipts;
DROP POLICY IF EXISTS "Enable update access for all users" ON receipts;

CREATE POLICY "Enable read access for all users" ON receipts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON receipts FOR UPDATE USING (true);
