import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: plans, error } = await supabase
      .from('workout_plans')
      .select('week, day, completed')
      .eq('user_id', user.id);

    if (error) {
      console.error('Workout GET error:', error);
      return NextResponse.json({ error: 'Failed to load workouts' }, { status: 500 });
    }

    const completed = new Set(
      (plans ?? []).filter((p) => p.completed).map((p) => `${p.week - 1}-${p.day - 1}`)
    );

    return NextResponse.json({ completed: [...completed] });
  } catch (error) {
    console.error('Workout GET error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    const { week, day, completed } = body;

    if (typeof week !== 'number' || typeof day !== 'number' || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { error: upsertError } = await supabase.from('workout_plans').upsert(
      {
        user_id: user.id,
        week: week + 1,
        day: day + 1,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id, week, day' }
    );

    if (upsertError) {
      console.error('Workout POST error:', upsertError);
      return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workout POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
