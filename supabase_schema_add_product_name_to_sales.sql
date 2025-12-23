
-- Add product_name to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Backfill product_name from inventory for existing sales
UPDATE sales
SET product_name = inventory.name
FROM inventory
WHERE sales.product_id = inventory.id
AND sales.product_name IS NULL;
