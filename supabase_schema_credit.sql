-- Create customers table
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  phone text,
  notes text
);

alter table customers enable row level security;

create policy "Enable read access for authenticated users" on customers 
  for select to authenticated using (true);

create policy "Enable insert for authenticated users" on customers 
  for insert to authenticated with check (true);

create policy "Enable update for authenticated users" on customers 
  for update to authenticated using (true);

-- Update sales table
alter table sales add column if not exists customer_id uuid references customers(id);
alter table sales add column if not exists status text check (status in ('paid', 'pending')) default 'paid';
alter table sales add column if not exists amount_paid decimal(10, 2) default 0.00;

-- Backfill existing sales
update sales set amount_paid = total_price where amount_paid = 0.00 and status = 'paid';

-- Create payments table
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sale_id uuid references sales(id) on delete cascade,
  amount decimal(10, 2) not null,
  recorded_by uuid references auth.users(id)
);

alter table payments enable row level security;

create policy "Enable read access for authenticated users" on payments 
  for select to authenticated using (true);

create policy "Enable insert for authenticated users" on payments 
  for insert to authenticated with check (true);
