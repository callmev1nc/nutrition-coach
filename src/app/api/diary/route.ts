import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveItemToUSDA, scaleToPortion } from '@/lib/usda/resolve';
import { recomputeHabitCalories } from '@/lib/diary-totals';
import { portionToGrams } from '@/lib/usda/cooking-yields';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const meal_type = searchParams.get('meal');

    let query = supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (meal_type) {
      query = query.eq('meal_type', meal_type);
    }

    const { data: entries, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totals = (entries ?? []).reduce(
      (acc, e) => {
        acc.calories += Number(e.calories);
        acc.protein_g += Number(e.protein_g);
        acc.carbs_g += Number(e.carbs_g);
        acc.fat_g += Number(e.fat_g);
        if (e.fiber_g) acc.fiber_g += Number(e.fiber_g);
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    );

    const { data: plan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();

    const planTotals = plan
      ? {
          calories: plan.total_calories,
          protein: plan.total_protein,
          carbs: plan.total_carbs,
          fat: plan.total_fat,
        }
      : null;

    return NextResponse.json({
      date,
      entries: entries ?? [],
      totals,
      plan: planTotals,
    });
  } catch (error) {
    console.error('Diary GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, meal_type, items } = body;

    if (!date || !meal_type || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'date, meal_type, and items are required' }, { status: 400 });
    }

    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
      return NextResponse.json({ error: 'Invalid meal_type' }, { status: 400 });
    }

    const insertedIds: string[] = [];
    // Capture the resolved fdc_id per item so the user_foods "recent" upsert can
    // match the (user_id, fdc_id, kind) unique constraint instead of always
    // inserting a null-fdc_id duplicate row.
    const recents: { name: string; fdc_id: number | null }[] = [];

    for (const item of items) {
      let resolved;
      try {
        resolved = await resolveItemToUSDA(item, supabase);
      } catch {
        return NextResponse.json(
          { error: `Could not resolve "${item.name}" in USDA database` },
          { status: 422 }
        );
      }

      recents.push({ name: item.name, fdc_id: resolved.fdc_id ?? null });

      // Convert the parsed portion to grams so per-100g nutrition scales correctly.
      const portionGrams = portionToGrams(item.quantity, item.unit);

      // Food row: scale to the portion WITHOUT oil. Oil is stored as its own
      // child row below so the daily total counts it exactly once — previously
      // oil was folded into this row AND added again as a child (double-count).
      const scaled = scaleToPortion(resolved, portionGrams);

      const { data: entry, error: insertError } = await supabase
        .from('food_entries')
        .insert({
          user_id: user.id,
          date,
          meal_type,
          description: item.description || null,
          fdc_id: resolved.fdc_id,
          food_name: resolved.food_name,
          brand_owner: resolved.brand_owner,
          portion_amount: portionGrams,
          portion_unit: item.unit || 'g',
          cooking_method: item.cooking_method || null,
          fat_trimmed: item.fat_trimmed ?? null,
          calories: scaled.calories,
          protein_g: scaled.protein_g,
          carbs_g: scaled.carbs_g,
          fat_g: scaled.fat_g,
          fiber_g: scaled.fiber_g ?? null,
          source: resolved.cooked ? 'usda_cooked' : 'usda',
          confidence: resolved.confidence,
        })
        .select('id')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      insertedIds.push(entry.id);

      // Oil is a discrete child entry keyed to the food via parent_entry_id.
      // It carries the oil's own calories/fat so the daily total includes it
      // exactly once. Oil ≈ 8.84 kcal/g and ~100% fat.
      if (item.oil) {
        const oilGrams = portionToGrams(item.oil.amount, item.oil.unit);
        if (oilGrams > 0) {
          const oilCalories = Math.round(oilGrams * 8.84);
          await supabase.from('food_entries').insert({
            user_id: user.id,
            date,
            meal_type,
            fdc_id: null,
            food_name: `${item.oil.name} (oil)`,
            portion_amount: oilGrams,
            portion_unit: 'g',
            fat_trimmed: false,
            parent_entry_id: entry.id,
            calories: oilCalories,
            protein_g: 0,
            carbs_g: 0,
            fat_g: Math.round(oilGrams * 10) / 10,
            source: 'manual',
            confidence: 'medium',
          });
        }
      }
    }

    await recomputeHabitCalories(supabase, user.id, date);

    const { data: updated } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true });

    for (const recent of recents) {
      try {
        await supabase.from('user_foods').upsert({
          user_id: user.id,
          fdc_id: recent.fdc_id,
          food_name: recent.name,
          kind: 'recent',
          last_used_at: new Date().toISOString(),
        }, { onConflict: 'user_id,fdc_id,kind' });
      } catch {
        // non-critical
      }
    }

    try {
      await supabase.rpc('award_xp', { p_reason: 'log_food' });
    } catch {
      // non-critical
    }

    return NextResponse.json({ entries: updated ?? [], date });
  } catch (error) {
    console.error('Diary POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
