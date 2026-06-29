-- =============================================
-- Phase 1: Food Diary schema
-- Per-item diary rows, favorites/recents, USDA cache
-- =============================================

CREATE TABLE IF NOT EXISTS public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  description text,
  fdc_id bigint,
  food_name text not null,
  brand_owner text,
  portion_amount numeric(8,2) not null,
  portion_unit text not null,
  cooking_method text check (cooking_method in ('raw','grilled','baked','fried','steamed','boiled','roasted','sauteed') or cooking_method is null),
  fat_trimmed boolean,
  parent_entry_id uuid references public.food_entries(id) on delete cascade,
  calories numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2),
  source text not null check (source in ('usda','usda_cooked','openfoodfacts','manual')),
  matched_meal_plan_food_name text,
  confidence text check (confidence in ('high','medium','low') or confidence is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS food_entries_user_date ON public.food_entries (user_id, date desc);
CREATE INDEX IF NOT EXISTS food_entries_parent ON public.food_entries (parent_entry_id) where parent_entry_id is not null;

CREATE UNIQUE INDEX IF NOT EXISTS food_entries_unique_food
  ON public.food_entries (user_id, date, meal_type, fdc_id, portion_amount, portion_unit)
  where parent_entry_id is null;

CREATE TABLE IF NOT EXISTS public.user_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fdc_id bigint,
  food_name text not null,
  brand_owner text,
  default_portion_amount numeric(8,2),
  default_portion_unit text,
  default_cooking_method text,
  kind text not null check (kind in ('favorite','recent')),
  last_used_at timestamptz not null default now(),
  use_count int not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, fdc_id, kind)
);

CREATE INDEX IF NOT EXISTS user_foods_user ON public.user_foods (user_id, kind, last_used_at desc);

CREATE TABLE IF NOT EXISTS public.food_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('usda','off')),
  source_id text not null,
  normalized_query text,
  description text not null,
  data_type text,
  cooked boolean default false,
  is_raw boolean default false,
  nutrients_per_100g jsonb not null,
  serving_size text,
  serving_quantity_g numeric,
  brand text,
  fetched_at timestamptz default now(),
  unique (source, source_id)
);

CREATE INDEX IF NOT EXISTS food_items_norm_query ON public.food_items (normalized_query);

ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_foods   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_entries owner rw" ON public.food_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

CREATE POLICY "user_foods owner rw" ON public.user_foods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

CREATE POLICY "food_items read only authenticated" ON public.food_items
  for select to authenticated using (true);
-- food_items is a shared USDA/OFF reference cache. Clients read it (SELECT
-- above); writes happen server-side via the service-role admin client
-- (src/lib/supabase/admin.ts), which bypasses RLS — so no client INSERT/UPDATE
-- policy is needed and no authenticated user can poison the cache via
-- PostgREST.
