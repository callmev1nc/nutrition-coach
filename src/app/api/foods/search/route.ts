import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { searchFoods, nutrientsFromFood } from '@/lib/usda/client';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    const normalized = q.toLowerCase().replace(/\s+/g, ' ').trim();
    const dataTypeParam = searchParams.get('dataType');
    const dataTypes = dataTypeParam
      ? dataTypeParam.split(',')
      : ['Survey (FNDDS)', 'Foundation', 'SR Legacy'];

    const { data: cached } = await supabase
      .from('food_items')
      .select('*')
      .eq('normalized_query', normalized)
      .limit(3);

    if (cached && cached.length > 0) {
      const items = cached.map((c: any) => ({
        fdc_id: parseInt(c.source_id, 10),
        food_name: c.description,
        brand_owner: c.brand || undefined,
        per100g: c.nutrients_per_100g,
        cooked: c.cooked,
        data_type: c.data_type,
        confidence: 'high' as const,
        source: c.source,
      }));
      return NextResponse.json({ items });
    }

    const result = await searchFoods(q, dataTypes, 5);
    const foods = result.foods ?? [];

    const items = foods.map((f: any) => {
      const nutrients = nutrientsFromFood(f);
      return {
        fdc_id: f.fdcId,
        food_name: f.description,
        brand_owner: f.brandOwner,
        per100g: nutrients ?? { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 },
        data_type: f.dataType,
      };
    });

    for (const f of foods) {
      const nutrients = nutrientsFromFood(f);
      if (!nutrients) continue;
      try {
        await (getAdminClient() as any).from('food_items').upsert({
          source: 'usda',
          source_id: String(f.fdcId),
          normalized_query: normalized,
          description: f.description,
          data_type: f.dataType,
          cooked: false,
          is_raw: false,
          nutrients_per_100g: nutrients,
          brand: f.brandOwner ?? '',
        }, { onConflict: 'source,source_id' });
      } catch {
        // non-critical
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Foods search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
