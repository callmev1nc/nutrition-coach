import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { subDays, format } from 'date-fns';

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
    const { date, weight_kg, body_fat_percent, notes } = body;

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Date is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (
      weight_kg == null ||
      typeof weight_kg !== 'number' ||
      weight_kg <= 0
    ) {
      return NextResponse.json(
        { error: 'weight_kg must be a positive number' },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      date,
      weight_kg,
    };

    if (body_fat_percent != null && typeof body_fat_percent === 'number') {
      insertData.body_fat_percent = body_fat_percent;
    }

    if (notes != null && typeof notes === 'string') {
      insertData.notes = notes.trim();
    }

    const { data: log, error: insertError } = await supabase
      .from('weight_logs')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert weight log:', insertError);
      return NextResponse.json(
        { error: 'Failed to save weight log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Progress POST error:', error);
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

    const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

    const { data: logs, error: fetchError } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', ninetyDaysAgo)
      .order('date', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch weight logs:', fetchError);
      return NextResponse.json(
        { error: 'Failed to load weight history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ logs: logs ?? [] });
  } catch (error) {
    console.error('Progress GET error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
