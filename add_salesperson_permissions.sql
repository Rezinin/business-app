-- Add can_add_products permission column to profiles
ALTER TABLE profiles ADD COLUMN can_add_products BOOLEAN DEFAULT false;

-- Update RLS policies for inventory to enforce product add restrictions
-- Drop existing insert policy (if it allows all authenticated users)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON inventory;

-- New insert policy: Allow managers OR salespersons with can_add_products permission
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

-- Delete policy: Only managers can delete
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON inventory;

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
