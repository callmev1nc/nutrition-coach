import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMealPlan, generateMealPlanStream } from '@/lib/gemini';
import { calculateAll } from '@/lib/calculations';
import { buildPreferenceBlock } from '@/lib/preference-block';
import type { MealPlan } from '@/types';

async function getProfile(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !profile) return null;
  return profile;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, force, stream } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const profile = await getProfile(supabase, user.id);
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!force) {
      const { data: existing } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ mealPlan: existing });
      }
    }

    const calculations = calculateAll(
      profile.weight_kg, profile.height_cm, profile.age, profile.gender,
      profile.body_fat_percent ?? null, profile.activity_level,
      profile.office_job, profile.training_days_per_week
    );

    const preferences = [
      profile.food_preferences,
      profile.medical_limitations ? `Medical limitations: ${profile.medical_limitations}` : '',
    ].filter(Boolean).join('. ');

    const budget = profile.weekly_budget ?? 70;

    const { data: prefRows } = await supabase
      .from('learned_preferences')
      .select('*')
      .eq('user_id', user.id);

    const ctx = {
      persona: profile.coach_persona,
      age: profile.age,
      gender: profile.gender,
      learnedPreferences: prefRows ?? [],
    };

    if (stream) {
      const gen = generateMealPlanStream(
        calculations.target_calories, calculations.protein_g,
        calculations.carbs_g, calculations.fat_g,
        preferences || 'No specific preferences', budget, ctx
      );

      const encoder = new TextEncoder();
      let assembled = '';
      const readable = new ReadableStream({
        async pull(controller) {
          try {
            for await (const chunk of gen) {
              assembled += chunk;
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();

            // Persist the streamed plan exactly like the non-streaming path,
            // so a later GET (and plan-vs-actual) can see it. Failures here are
            // non-fatal — the client already received the stream.
            try {
              const parsed = JSON.parse(assembled) as { meals: MealPlan['meals'] };
              if (parsed.meals?.length) {
                const totalCalories = parsed.meals.reduce((s, m) => s + m.calories, 0);
                const totalProtein = parsed.meals.reduce((s, m) => s + m.protein, 0);
                const totalCarbs = parsed.meals.reduce((s, m) => s + m.carbs, 0);
                const totalFat = parsed.meals.reduce((s, m) => s + m.fat, 0);
                await supabase
                  .from('meal_plans')
                  .upsert({
                    user_id: user.id, date: targetDate, meals: parsed.meals,
                    total_calories: totalCalories, total_protein: totalProtein,
                    total_carbs: totalCarbs, total_fat: totalFat,
                  }, { onConflict: 'user_id,date' });
              }
            } catch (persistErr) {
              console.error('Streamed meal plan persist failed:', persistErr);
            }
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const rawMealPlan = await generateMealPlan(
      calculations.target_calories, calculations.protein_g,
      calculations.carbs_g, calculations.fat_g,
      preferences || 'No specific preferences', budget, ctx
    );

    let parsedPlan: { meals: MealPlan['meals'] };
    try {
      parsedPlan = JSON.parse(rawMealPlan);
    } catch {
      console.error('Failed to parse Gemini meal plan response');
      return NextResponse.json(
        { error: 'Failed to generate a valid meal plan' },
        { status: 502 }
      );
    }

    const totalCalories = parsedPlan.meals.reduce((sum, m) => sum + m.calories, 0);
    const totalProtein = parsedPlan.meals.reduce((sum, m) => sum + m.protein, 0);
    const totalCarbs = parsedPlan.meals.reduce((sum, m) => sum + m.carbs, 0);
    const totalFat = parsedPlan.meals.reduce((sum, m) => sum + m.fat, 0);

    const { data: savedPlan, error: saveError } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id, date: targetDate,
        meals: parsedPlan.meals,
        total_calories: totalCalories, total_protein: totalProtein,
        total_carbs: totalCarbs, total_fat: totalFat,
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 });
    }

    return NextResponse.json({ mealPlan: savedPlan });
  } catch (error) {
    console.error('Meals POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { data: mealPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Failed to fetch meal plan:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load meal plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mealPlan: mealPlan ?? null });
  } catch (error) {
    console.error('Meals GET error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
