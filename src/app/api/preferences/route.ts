import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('learned_preferences')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: data ?? [] });
  } catch (error) {
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
    const { food_name, signal, source, evidence } = body;

    if (!food_name || !signal || !source) {
      return NextResponse.json({ error: 'food_name, signal, and source are required' }, { status: 400 });
    }

    if (!['like', 'dislike', 'avoid', 'allergy'].includes(signal)) {
      return NextResponse.json({ error: 'Invalid signal' }, { status: 400 });
    }

    const normalized = food_name.toLowerCase().trim();

    const { data: existing } = await supabase
      .from('learned_preferences')
      .select('*, weight')
      .eq('user_id', user.id)
      .eq('food_name', normalized)
      .eq('signal', signal)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('learned_preferences')
        .update({
          weight: (existing.weight ?? 1) + 1,
          last_seen: new Date().toISOString(),
          evidence: evidence || existing.evidence,
        })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('learned_preferences')
        .insert({
          user_id: user.id,
          food_name: normalized,
          signal,
          weight: 1,
          source,
          evidence,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('learned_preferences')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
