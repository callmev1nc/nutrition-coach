/**
 * Recompute daily calories_consumed from food_entries and sync to habit_logs.
 *
 * After every diary mutation (insert/update/delete) the caller MUST invoke this
 * so habit_logs.calories_consumed stays accurate for the dashboard and plan-vs-actual.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function recomputeHabitCalories(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<void> {
  const { data, error } = await supabase
    .from('food_entries')
    .select('calories')
    .eq('user_id', userId)
    .eq('date', date);

  if (error) {
    console.error('recomputeHabitCalories: query failed', error.message);
    return;
  }

  const totalCalories = (data ?? []).reduce((sum, row) => sum + Number(row.calories), 0);

  const { error: upsertError } = await supabase
    .from('habit_logs')
    .upsert(
      {
        user_id: userId,
        date,
        calories_consumed: totalCalories,
      },
      { onConflict: 'user_id, date' }
    );

  if (upsertError) {
    console.error('recomputeHabitCalories: upsert failed', upsertError.message);
  }
}
