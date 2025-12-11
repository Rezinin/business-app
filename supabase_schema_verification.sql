-- Add verified column to profiles
alter table profiles add column verified boolean default false;

-- Verify existing users so you don't get locked out
update profiles set verified = true;

-- Update the handle_new_user function to use the role from metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role, verified)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    coalesce(new.raw_user_meta_data->>'role', 'salesperson'),
    false -- New users are always unverified initially
  );
  return new;
end;
$$ language plpgsql security definer;
