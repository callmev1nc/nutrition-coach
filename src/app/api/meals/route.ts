import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMealPlan } from '@/lib/gemini';
import { calculateAll } from '@/lib/calculations';
import type { MealPlan } from '@/types';

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { date } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const calculations = calculateAll(
      profile.weight_kg,
      profile.height_cm,
      profile.age,
      profile.gender,
      profile.body_fat_percent ?? null,
      profile.activity_level,
      profile.office_job,
      profile.training_days_per_week
    );

    const preferences = [
      profile.food_preferences,
      profile.medical_limitations
        ? `Medical limitations: ${profile.medical_limitations}`
        : '',
    ]
      .filter(Boolean)
      .join('. ');

    const budget = profile.weekly_budget ?? 70;

    const rawMealPlan = await generateMealPlan(
      calculations.target_calories,
      calculations.protein_g,
      calculations.carbs_g,
      calculations.fat_g,
      preferences || 'No specific preferences',
      budget
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

    const totalCalories = parsedPlan.meals.reduce(
      (sum, m) => sum + m.calories,
      0
    );
    const totalProtein = parsedPlan.meals.reduce(
      (sum, m) => sum + m.protein,
      0
    );
    const totalCarbs = parsedPlan.meals.reduce((sum, m) => sum + m.carbs, 0);
    const totalFat = parsedPlan.meals.reduce((sum, m) => sum + m.fat, 0);

    const { data: savedPlan, error: saveError } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
        date: targetDate,
        meals: parsedPlan.meals,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save meal plan:', saveError);
      return NextResponse.json(
        { error: 'Failed to save meal plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mealPlan: savedPlan });
  } catch (error) {
    console.error('Meals POST error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
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
