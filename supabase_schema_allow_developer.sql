-- Drop existing strict policies
DROP POLICY IF EXISTS "Managers can update any profile" ON profiles;
DROP POLICY IF EXISTS "Managers can delete any profile" ON profiles;

-- Create new permissive policies for Managers AND Developers (NULL role)
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
