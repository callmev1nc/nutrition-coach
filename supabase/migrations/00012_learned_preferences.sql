-- =============================================
-- Phase 2: Learned preferences (memory)
-- Captures like/dislike/avoid/allergy signals
-- =============================================

CREATE TABLE IF NOT EXISTS public.learned_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  signal text not null check (signal in ('like','dislike','avoid','allergy')),
  weight int not null default 1,
  source text not null check (source in ('coach_chat','meal_feedback','plan_vs_actual','explicit')),
  evidence text,
  last_seen timestamptz not null default now(),
  created_at timestamptz default now(),
  unique (user_id, food_name, signal)
);

CREATE INDEX IF NOT EXISTS learned_prefs_user ON public.learned_preferences (user_id, signal);

ALTER TABLE public.learned_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs owner rw" ON public.learned_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
