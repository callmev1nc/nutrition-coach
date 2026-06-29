import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recomputeHabitCalories } from '@/lib/diary-totals';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing } = await supabase
      .from('food_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = [
      'portion_amount', 'portion_unit', 'cooking_method',
      'fat_trimmed', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('food_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await recomputeHabitCalories(supabase, user.id, existing.date);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Diary PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing } = await supabase
      .from('food_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await recomputeHabitCalories(supabase, user.id, existing.date);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Diary DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
