
-- Create a table for sales records
create table sales (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id uuid references inventory(id) on delete set null,
  quantity integer not null,
  total_price decimal(10, 2) not null,
  salesperson_id uuid references auth.users(id)
);

-- Enable RLS for sales
alter table sales enable row level security;

create policy "Enable read access for authenticated users" on sales
  for select
  to authenticated
  using (true);

create policy "Enable insert for authenticated users" on sales
  for insert
  to authenticated
  with check (true);

-- Function to delete a user (for managers)
-- Note: Deleting from auth.users requires special privileges or a postgres function
-- This is a simplified version that might need to be run by a service role or superuser
-- For this demo, we will just delete from profiles and let Supabase handle the auth user cleanup if configured,
-- or we just accept that we can't delete auth users easily from SQL without extensions.
-- A better approach for the app is to use the Supabase Admin API in a Server Action.
