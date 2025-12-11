-- ==============================================================================
-- Complete Setup Script for Hajia Salima's Collection
-- Run this script in the Supabase SQL Editor to set up the entire database schema.
-- ==============================================================================

-- 1. PROFILES TABLE
-- Stores user details, roles, and verification status.
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- Allow Managers and Developers (users with no role) to update/delete any profile
CREATE POLICY "Managers and Devs can update any profile" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) IS NULL
  );

CREATE POLICY "Managers and Devs can delete any profile" ON profiles
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) IS NULL
  );


-- 2. INVENTORY TABLE
-- Stores product information.
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  quantity INTEGER DEFAULT 0,
  price DECIMAL(10, 2) DEFAULT 0.00,
  description TEXT
);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Inventory Policies
CREATE POLICY "Enable read access for authenticated users" ON inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON inventory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON inventory
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON inventory
  FOR DELETE TO authenticated USING (true);


-- 3. CUSTOMERS TABLE
-- Stores customer information for credit sales.
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers Policies
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customers FOR UPDATE USING (true);


-- 4. SALES TABLE
-- Stores sales transactions.
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  product_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  salesperson_id UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES customers(id),
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
  amount_paid DECIMAL(10, 2) DEFAULT 0.00
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Sales Policies
CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sales FOR DELETE USING (true);


-- 5. PAYMENTS TABLE
-- Stores partial payments for credit sales.
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  recorded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Payments Policies
CREATE POLICY "Enable read access for all users" ON payments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON payments FOR INSERT WITH CHECK (true);


-- 6. FUNCTIONS & TRIGGERS
-- Automatically creates a profile when a new user signs up via Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, verified)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    COALESCE(new.raw_user_meta_data->>'role', 'salesperson'),
    FALSE -- New users are always unverified initially
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

