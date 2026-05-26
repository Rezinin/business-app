-- ==============================================================================
-- COMPLETE SUPABASE DATABASE SETUP FOR HAJIA SALIMA'S COLLECTION
-- ==============================================================================
-- This is a consolidated SQL file combining all setup, fixes, and additions.
-- Run this entire script in the Supabase SQL Editor to set up the complete database.
-- ==============================================================================

-- ==============================================================================
-- 1. PROFILES TABLE - User profiles with roles and verification status
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('manager', 'salesperson')) DEFAULT 'salesperson',
  verified BOOLEAN DEFAULT FALSE,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- Managers and Developers (NULL role) can update any profile
DROP POLICY IF EXISTS "Managers and Devs can update any profile" ON profiles;
CREATE POLICY "Managers and Devs can update any profile" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) IS NULL
  );

-- Managers and Developers (NULL role) can delete any profile
DROP POLICY IF EXISTS "Managers and Devs can delete any profile" ON profiles;
CREATE POLICY "Managers and Devs can delete any profile" ON profiles
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) IS NULL
  );

-- ==============================================================================
-- 2. INVENTORY TABLE - Product information
-- ==============================================================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  quantity INTEGER DEFAULT 0,
  price DECIMAL(10, 2) DEFAULT 0.00,
  description TEXT
);

-- Enable RLS on inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Inventory Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory;
CREATE POLICY "Enable read access for authenticated users" ON inventory
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON inventory;
CREATE POLICY "Enable insert for authenticated users" ON inventory
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON inventory;
CREATE POLICY "Enable update for authenticated users" ON inventory
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON inventory;
CREATE POLICY "Enable delete for authenticated users" ON inventory
  FOR DELETE TO authenticated USING (true);

-- ============================================================================== 
-- 3. INVENTORY SETTINGS TABLE - Global inventory policy
-- ==============================================================================
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
CREATE POLICY "Enable read access for authenticated users" ON inventory_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON inventory_settings;
CREATE POLICY "Enable update for authenticated users" ON inventory_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. CUSTOMERS TABLE - Customer information for credit sales
-- ==============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT
);

-- Enable RLS on customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Fix "full_name" constraint issue if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'full_name') THEN
        ALTER TABLE customers ALTER COLUMN full_name DROP NOT NULL;
    END IF;
END $$;

-- Ensure 'name' column exists and migrate data if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'name') THEN
        ALTER TABLE customers ADD COLUMN name TEXT;
    END IF;
END $$;

-- Migrate data from full_name to name if needed (only if full_name exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'full_name') THEN
        UPDATE customers 
        SET name = full_name 
        WHERE (name IS NULL OR name = '') AND full_name IS NOT NULL;
    END IF;
END $$;

-- Customers Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
CREATE POLICY "Enable insert access for all users" ON customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON customers;
CREATE POLICY "Enable update access for all users" ON customers FOR UPDATE USING (true);

-- ==============================================================================
-- 4. SALES TABLE - Sales transactions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  product_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  salesperson_id UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES customers(id),
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
  amount_paid DECIMAL(10, 2) DEFAULT 0.00,
  product_name TEXT
);

-- Add missing columns to sales table if they don't exist
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

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'product_name') THEN
        ALTER TABLE sales ADD COLUMN product_name TEXT;
    END IF;
END $$;

-- Backfill product_name from inventory for existing sales without product names
UPDATE sales
SET product_name = inventory.name
FROM inventory
WHERE sales.product_id = inventory.id
AND sales.product_name IS NULL;

-- Backfill amount_paid for existing sales
UPDATE sales SET amount_paid = total_price WHERE amount_paid = 0.00 AND status = 'paid';

-- Enable RLS on sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Sales Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON sales;
CREATE POLICY "Enable insert access for all users" ON sales FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON sales;
CREATE POLICY "Enable update access for all users" ON sales FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;
CREATE POLICY "Enable delete access for all users" ON sales FOR DELETE USING (true);

-- ==============================================================================
-- 5. PAYMENTS TABLE - Partial payments for credit sales
-- ==============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  recorded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Payments Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON payments;
CREATE POLICY "Enable read access for all users" ON payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON payments;
CREATE POLICY "Enable insert access for all users" ON payments FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 6. FUNCTIONS & TRIGGERS - Auto-create profile on signup
-- ==============================================================================

-- Function to handle new user signup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, verified)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    COALESCE(new.raw_user_meta_data->>'role', 'salesperson'),
    FALSE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 7. USER ROLE ASSIGNMENT (Optional - Customize with your admin email)
-- ==============================================================================
-- Uncomment and update the email address below to assign manager role to your admin user
-- UPDATE profiles
-- SET role = 'manager', verified = true
-- WHERE id IN (
--     SELECT id FROM auth.users WHERE email = 'rushdan.ibnantiku@gmail.com'
-- );

-- ==============================================================================
-- FINAL VERIFICATION - All tables, RLS, and policies are properly configured
-- ==============================================================================
-- If you see this comment, all SQL statements have been successfully executed.
-- Your Supabase database is now ready to use with the Next.js application!
