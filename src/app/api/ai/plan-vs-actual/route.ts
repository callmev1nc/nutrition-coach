import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePlanVsActualNudge, type MealPlanContext } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const [{ data: plan }, { data: profile }] = await Promise.all([
      supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ]);

    if (!plan) {
      return NextResponse.json({ error: 'No meal plan for this date' }, { status: 404 });
    }

    const { data: entries } = await supabase
      .from('food_entries')
      .select('calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .eq('date', date);

    const actual = (entries ?? []).reduce(
      (acc, e) => ({
        calories: acc.calories + Number(e.calories),
        protein: acc.protein + Number(e.protein_g),
        carbs: acc.carbs + Number(e.carbs_g),
        fat: acc.fat + Number(e.fat_g),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const ctx: MealPlanContext = {
      persona: profile?.coach_persona || undefined,
      age: profile?.age || undefined,
      gender: profile?.gender || undefined,
    };

    const rawNudge = await generatePlanVsActualNudge(
      {
        calories: plan.total_calories,
        protein: plan.total_protein,
        carbs: plan.total_carbs,
        fat: plan.total_fat,
      },
      actual,
      ctx
    );

    let nudge;
    try {
      nudge = JSON.parse(rawNudge);
    } catch {
      nudge = {
        headline: 'Check your intake',
        body: `Planned ${plan.total_calories} kcal, logged ${Math.round(actual.calories)} kcal.`,
        tone: 'nudge',
        delta_calories: Math.round(actual.calories - plan.total_calories),
      };
    }

    try {
      await supabase.from('coach_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: `[plan-vs-actual] ${nudge.headline}: ${nudge.body}`,
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({ nudge, plan: { calories: plan.total_calories }, actual });
  } catch (error) {
    console.error('Plan-vs-actual error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
