-- =============================================
-- Teen Mode: gamification, personalization, mood, safety metadata
-- All ADDITIVE. No destructive changes. Safe to re-run (IF NOT EXISTS).
-- =============================================

-- ---------- PROFILES: XP, streaks, identity, personalization, mood ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freezes INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS last_active_date DATE,
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'volt',
  ADD COLUMN IF NOT EXISTS coach_persona TEXT NOT NULL DEFAULT 'hype',
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT NOT NULL DEFAULT '🔥',
  ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mood_today INTEGER,
  ADD COLUMN IF NOT EXISTS energy_today INTEGER;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_theme_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_chk CHECK (theme IN ('volt','sunset','mint','mono','bloom'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_coach_persona_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_coach_persona_chk CHECK (coach_persona IN ('hype','bestie','coach','chill'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_mood_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_mood_chk CHECK (mood_today IS NULL OR (mood_today BETWEEN 1 AND 5));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_energy_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_energy_chk CHECK (energy_today IS NULL OR (energy_today BETWEEN 1 AND 5));

-- ---------- HABIT LOGS: daily mood + energy check-in ----------
ALTER TABLE public.habit_logs ADD COLUMN IF NOT EXISTS mood INTEGER;
ALTER TABLE public.habit_logs DROP CONSTRAINT IF EXISTS habit_logs_mood_chk;
ALTER TABLE public.habit_logs
  ADD CONSTRAINT habit_logs_mood_chk CHECK (mood IS NULL OR (mood BETWEEN 1 AND 5));

ALTER TABLE public.habit_logs ADD COLUMN IF NOT EXISTS energy INTEGER;
ALTER TABLE public.habit_logs DROP CONSTRAINT IF EXISTS habit_logs_energy_chk;
ALTER TABLE public.habit_logs
  ADD CONSTRAINT habit_logs_energy_chk CHECK (energy IS NULL OR (energy BETWEEN 1 AND 5));

-- ---------- XP EVENTS LEDGER (audit + per-day-per-action dedup) ----------
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  awarded_for_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_xp_events_user_reason_day
  ON public.xp_events(user_id, reason, awarded_for_date);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own xp events" ON public.xp_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp events" ON public.xp_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---------- Atomic XP award + level-up (dedups via the unique index) ----------
-- SECURITY: derives the user from auth.uid() (never a client-supplied id) and
-- looks up the reward amount from a fixed server-side map (reason -> amount),
-- so a client can neither award XP to another user nor inflate the amount.
-- The client only passes `p_reason`.
--
-- Level curve (matches src/lib/gamification.ts): level L (>=2) needs cumulative
-- XP = 50 * (L-1) * L.  i.e. L2=100, L3=300, L4=600, L5=1000 ...
CREATE OR REPLACE FUNCTION public.award_xp(
  p_reason TEXT,
  p_award_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_amount INTEGER;
  v_xp INTEGER;
  v_prev_level INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'error', 'not authenticated');
  END IF;

  v_amount := CASE p_reason
    WHEN 'log_weight'          THEN 10
    WHEN 'log_habits'          THEN 15
    WHEN 'complete_workout'    THEN 50
    WHEN 'log_mood'            THEN 5
    WHEN 'chat_coach'          THEN 10
    WHEN 'generate_meal_plan'  THEN 20
    WHEN 'finish_workout_day'  THEN 30
    WHEN 'body_fat_measure'    THEN 10
    ELSE NULL
  END;

  IF v_amount IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'error', 'unknown reason');
  END IF;

  BEGIN
    INSERT INTO public.xp_events (user_id, amount, reason, awarded_for_date)
    VALUES (v_user, v_amount, p_reason, p_award_date);
  EXCEPTION WHEN unique_violation THEN
    SELECT xp_total, level INTO v_xp, v_prev_level
      FROM public.profiles WHERE id = v_user;
    RETURN jsonb_build_object(
      'xp_total', COALESCE(v_xp, 0),
      'level', COALESCE(v_prev_level, 1),
      'leveled_up', false,
      'previous_level', COALESCE(v_prev_level, 1),
      'awarded', false
    );
  END;

  SELECT xp_total, level INTO v_xp, v_prev_level
    FROM public.profiles WHERE id = v_user;

  v_xp := COALESCE(v_xp, 0) + v_amount;
  v_new_level := 1;
  WHILE v_xp >= 50 * v_new_level * (v_new_level + 1) LOOP
    v_new_level := v_new_level + 1;
  END LOOP;
  v_leveled_up := v_new_level > COALESCE(v_prev_level, 1);

  UPDATE public.profiles
    SET xp_total = v_xp,
        level = v_new_level,
        last_active_date = p_award_date,
        updated_at = now()
    WHERE id = v_user;

  RETURN jsonb_build_object(
    'xp_total', v_xp,
    'level', v_new_level,
    'leveled_up', v_leveled_up,
    'previous_level', COALESCE(v_prev_level, 1),
    'awarded', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(TEXT, DATE) TO authenticated;
