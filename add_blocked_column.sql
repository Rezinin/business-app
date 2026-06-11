-- Add blocked column to profiles table for user suspension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;
