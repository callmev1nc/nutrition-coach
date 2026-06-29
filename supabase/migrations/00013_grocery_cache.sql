-- =============================================
-- Phase 3: Grocery cache columns on meal_plans
-- =============================================

ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS grocery_list jsonb,
  ADD COLUMN IF NOT EXISTS grocery_budget numeric;
