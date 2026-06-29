import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchFoods } from '@/lib/usda/client';

const USER_AGENT = process.env.OPENFOOD_FACTS_USER_AGENT || 'nutrition-coach/1.0';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'code parameter is required' }, { status: 400 });
    }

    const { data: cached } = await supabase
      .from('food_items')
      .select('*')
      .eq('source', 'off')
      .eq('source_id', code)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({
        item: {
          fdc_id: null,
          source_id: code,
          food_name: cached.description,
          brand_owner: cached.brand,
          per100g: cached.nutrients_per_100g,
          confidence: 'medium',
          source: 'off',
        },
      });
    }

    const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_size`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Open Food Facts lookup failed' }, { status: 502 });
    }

    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    const hasNutrients = (
      nutriments['energy-kcal_100g'] != null ||
      nutriments['proteins_100g'] != null ||
      nutriments['fat_100g'] != null ||
      nutriments['carbohydrates_100g'] != null
    );

    if (!hasNutrients && p.product_name) {
      const usdaResult = await searchFoods(p.product_name, ['Survey (FNDDS)', 'Foundation', 'SR Legacy'], 1);
      const usdaFood = usdaResult.foods?.[0];
      if (usdaFood) {
        const nutrients = {
          kcal: usdaFood.foodNutrients?.find((n: any) => n.nutrientId === 1008)?.value ?? 0,
          protein_g: usdaFood.foodNutrients?.find((n: any) => n.nutrientId === 1003)?.value ?? 0,
          fat_g: usdaFood.foodNutrients?.find((n: any) => n.nutrientId === 1004)?.value ?? 0,
          carbs_g: usdaFood.foodNutrients?.find((n: any) => n.nutrientId === 1005)?.value ?? 0,
        };

        return NextResponse.json({
          item: {
            fdc_id: usdaFood.fdcId,
            source_id: code,
            food_name: p.product_name,
            brand_owner: p.brands || undefined,
            per100g: nutrients,
            confidence: 'medium',
            source: 'off_fallback',
          },
        });
      }
    }

    const per100g = {
      kcal: nutriments['energy-kcal_100g'] ?? 0,
      protein_g: nutriments['proteins_100g'] ?? 0,
      fat_g: nutriments['fat_100g'] ?? 0,
      carbs_g: nutriments['carbohydrates_100g'] ?? 0,
      fiber_g: nutriments['fiber_100g'],
      sugar_g: nutriments['sugars_100g'],
    };

    try {
      await supabase.from('food_items').upsert({
        source: 'off',
        source_id: code,
        normalized_query: p.product_name?.toLowerCase() ?? '',
        description: p.product_name ?? 'Unknown product',
        data_type: 'Branded',
        cooked: false,
        is_raw: false,
        nutrients_per_100g: per100g,
        serving_size: p.serving_size,
        brand: p.brands ?? '',
      }, { onConflict: 'source,source_id' });
    } catch {
      // non-critical
    }

    return NextResponse.json({
      item: {
        fdc_id: null,
        source_id: code,
        food_name: p.product_name,
        brand_owner: p.brands || undefined,
        per100g,
        confidence: 'medium',
        source: 'off',
      },
    });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
