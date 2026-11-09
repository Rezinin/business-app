-- ==============================================================================
-- REZININ ENTERPRISE POS: COMPLETE CONSOLIDATED SQL SCRIPT
-- Safe & Idempotent: Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- It will automatically add missing columns, tables, and update RLS policies
-- without overwriting or deleting any of your existing store data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES: Ensure all RBAC permission columns exist
-- ------------------------------------------------------------------------------
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS can_pair_barcodes BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS can_add_products BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Allow Managers to update salesperson permission flags
DROP POLICY IF EXISTS "Managers and Devs can update any profile" ON profiles;
CREATE POLICY "Managers and Devs can update any profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'manager' OR role IS NULL)
    )
  );

-- ------------------------------------------------------------------------------
-- 2. INVENTORY: Separate SKU (Internal Code) & Barcode (Universal Scanner)
-- ------------------------------------------------------------------------------
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS sku TEXT;

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Create unique index on Barcode & SKU (allows nulls for unbarcoded items)
CREATE UNIQUE INDEX IF NOT EXISTS inventory_barcode_unique_idx ON inventory (barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_sku_unique_idx ON inventory (sku) WHERE sku IS NOT NULL;

-- Enable RLS on inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Read policy: All authenticated users can view product inventory
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON inventory;
CREATE POLICY "Enable read access for authenticated users" ON inventory
  FOR SELECT TO authenticated USING (true);

-- Insert policy: Managers OR Salespersons with 'can_add_products' permission
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON inventory;
DROP POLICY IF EXISTS "Enable insert with permission check" ON inventory;
CREATE POLICY "Enable insert with permission check" ON inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'manager' OR can_add_products = true)
    )
  );

-- Update policy: Managers OR authorized Salespersons (for barcode pairing or restock)
DROP POLICY IF EXISTS "Enable update for inventory" ON inventory;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON inventory;
DROP POLICY IF EXISTS "Enable update with permission check" ON inventory;
CREATE POLICY "Enable update with permission check" ON inventory
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'manager' OR can_pair_barcodes = true OR can_add_products = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'manager' OR can_pair_barcodes = true OR can_add_products = true)
    )
  );

-- Delete policy: Managers only
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON inventory;
DROP POLICY IF EXISTS "Enable delete for managers only" ON inventory;
CREATE POLICY "Enable delete for managers only" ON inventory
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'manager'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. INVENTORY SETTINGS: Store-wide policy (e.g. allow negative inventory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  allow_negative_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO inventory_settings (id, allow_negative_inventory)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE inventory_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_settings;
CREATE POLICY "Enable read access for all users" ON inventory_settings 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON inventory_settings;
DROP POLICY IF EXISTS "Enable update access for all users" ON inventory_settings;
CREATE POLICY "Enable update access for all users" ON inventory_settings 
  FOR UPDATE USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. RECEIPTS TABLE: Digital receipt archive & reprints
-- ------------------------------------------------------------------------------
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
CREATE POLICY "Enable read access for all users" ON receipts 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON receipts;
CREATE POLICY "Enable insert access for all users" ON receipts 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON receipts;
CREATE POLICY "Enable update access for all users" ON receipts 
  FOR UPDATE USING (true);

-- ------------------------------------------------------------------------------
-- 5. VERIFICATION QUERY: Run this to confirm all tables and columns are active
-- ------------------------------------------------------------------------------
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'inventory', 'inventory_settings', 'receipts')
  AND column_name IN ('can_pair_barcodes', 'can_add_products', 'blocked', 'verified', 'sku', 'barcode', 'allow_negative_inventory', 'receipt_number')
ORDER BY table_name, column_name;
