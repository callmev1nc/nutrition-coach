import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGroceryList } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const budget = body.budget ?? profile.weekly_budget ?? 70;

    const { data: latestMealPlan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestMealPlan) {
      return NextResponse.json({ error: 'No meal plan found. Generate a meal plan first.' }, { status: 400 });
    }

    // Cache check: return cached grocery if same budget
    if (latestMealPlan.grocery_list && latestMealPlan.grocery_budget === budget) {
      return NextResponse.json({
        groceryList: latestMealPlan.grocery_list,
        cached: true,
      });
    }

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

    const rawGroceryList = await generateGroceryList(
      latestMealPlan as unknown as Record<string, unknown>,
      budget,
      ctx
    );

    let parsedList: {
      categories: {
        name: string;
        items: { name: string; quantity: string; estimatedCost: number; unit: string }[];
        totalEstimatedCost: number;
      }[];
      totalEstimatedCost: number;
      withinBudget: boolean;
    };

    try {
      parsedList = JSON.parse(rawGroceryList);
    } catch {
      return NextResponse.json({ error: 'Failed to generate a valid grocery list' }, { status: 502 });
    }

    // Write back to meal_plans for caching
    await supabase
      .from('meal_plans')
      .update({
        grocery_list: parsedList as any,
        grocery_budget: budget,
      })
      .eq('id', latestMealPlan.id);

    return NextResponse.json({ groceryList: parsedList, cached: false });
  } catch (error) {
    console.error('Grocery POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
