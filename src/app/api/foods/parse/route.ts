import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFoodSentence } from '@/lib/gemini';
import { resolveItemToUSDA } from '@/lib/usda/resolve';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text field is required' }, { status: 400 });
    }

    const rawParsed = await parseFoodSentence(text);
    let parsed: { items: any[] };
    try {
      parsed = JSON.parse(rawParsed);
    } catch {
      return NextResponse.json({ error: 'Failed to parse food description' }, { status: 502 });
    }

    if (!parsed.items || parsed.items.length === 0) {
      return NextResponse.json({ error: 'No food items could be parsed' }, { status: 400 });
    }

    const resolvedItems = await Promise.allSettled(
      parsed.items.map(async (item: any) => {
        try {
          const resolved = await resolveItemToUSDA(item, supabase);
          return {
            parsed: item,
            resolved,
            error: null,
          };
        } catch (err) {
          return {
            parsed: item,
            resolved: null,
            error: err instanceof Error ? err.message : 'Resolution failed',
          };
        }
      })
    );

    const items = resolvedItems.map((r) =>
      r.status === 'fulfilled' ? r.value : { parsed: null, resolved: null, error: 'Unexpected error' }
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Foods parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
