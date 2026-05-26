-- Add DELETE policy to sales table if it doesn't exist
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON sales;

CREATE POLICY "Enable delete access for authenticated users" ON sales
  FOR DELETE
  TO authenticated
  USING (true);
