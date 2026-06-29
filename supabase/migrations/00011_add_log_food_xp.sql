-- =============================================
-- Add log_food and log_water XP reasons
-- Replaces award_xp function with new reasons
-- =============================================

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
    WHEN 'log_food'            THEN 10
    WHEN 'log_water'           THEN 10
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
