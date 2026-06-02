-- Add calorie_target column to profiles for plateau breakthrough feature
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calorie_target INTEGER;
