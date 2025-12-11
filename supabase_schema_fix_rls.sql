-- Allow managers to update any profile (to verify users)
-- We use a subquery to check if the executing user is a manager
-- The SELECT policy on profiles is "using (true)", so this subquery is safe from infinite recursion
CREATE POLICY "Managers can update any profile" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );

-- Allow managers to delete any profile
CREATE POLICY "Managers can delete any profile" ON profiles
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );
