-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  role text check (role in ('manager', 'salesperson')) default 'salesperson',

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check ((select auth.uid()) = id);

create policy "Users can update own profile." on profiles
  for update using ((select auth.uid()) = id);

-- Create a table for inventory items
create table inventory (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  sku text unique,
  quantity integer default 0,
  price decimal(10, 2) default 0.00,
  description text
);

-- Enable RLS for inventory
alter table inventory enable row level security;

-- Allow read access to everyone (or just authenticated users)
create policy "Enable read access for authenticated users" on inventory
  for select
  to authenticated
  using (true);

-- Allow insert/update/delete only for managers
-- Note: This requires checking the profile role. 
-- For simplicity in this starter, we'll allow authenticated users to insert for now, 
-- but in a real app you'd use a policy like:
-- using (exists (select 1 from profiles where id = auth.uid() and role = 'manager'))

create policy "Enable insert for authenticated users" on inventory
  for insert
  to authenticated
  with check (true);

create policy "Enable update for authenticated users" on inventory
  for update
  to authenticated
  using (true);

create policy "Enable delete for authenticated users" on inventory
  for delete
  to authenticated
  using (true);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'salesperson');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
