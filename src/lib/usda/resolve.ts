import { searchFoods, nutrientsFromFood, isCooked, type USDAFood } from './client';
import { getYieldFactor, applyYieldFactor, estimateOilGrams } from './cooking-yields';
import type { ParsedFoodItem, ResolvedFood } from '@/types';

interface CacheEntry {
  source: string;
  source_id: string;
  normalized_query: string;
  description: string;
  data_type: string;
  cooked: boolean;
  is_raw: boolean;
  nutrients_per_100g: ResolvedFood['per100g'];
  brand: string;
}

async function checkCache(supabase: unknown, query: string): Promise<CacheEntry | null> {
  if (!supabase) return null;
  const normalized = normalizeQuery(query);
  const { data } = await (supabase as any)
    .from('food_items')
    .select('*')
    .eq('normalized_query', normalized)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function writeCache(supabase: unknown, entry: CacheEntry): Promise<void> {
  if (!supabase) return;
  try {
    await (supabase as any)
      .from('food_items')
      .upsert(entry, { onConflict: 'source,source_id' });
  } catch {
    // cache write failures are non-critical
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Single source of truth for the food_items.normalized_query cache key. */
function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenOverlap(queryTokens: string[], foodName: string): number {
  const nameTokens = normalizeName(foodName).split(' ');
  let overlap = 0;
  for (const q of queryTokens) {
    if (nameTokens.some((t) => t.includes(q) || q.includes(t))) overlap++;
  }
  return overlap;
}

function rankFoods(query: string, foods: USDAFood[], wantedCooked: boolean): USDAFood[] {
  const tokens = normalizeName(query).split(' ');
  return foods
    .map((f) => ({
      food: f,
      overlap: tokenOverlap(tokens, f.description),
      cooked: isCooked(f.description),
      delta: wantedCooked === isCooked(f.description) ? 0 : 1,
    }))
    .sort((a, b) => {
      if (a.delta !== b.delta) return a.delta - b.delta;
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return 0;
    })
    .map((r) => r.food);
}

export async function resolveItemToUSDA(
  parsed: ParsedFoodItem,
  supabase?: unknown
): Promise<ResolvedFood> {
  const searchPhrase = parsed.cooking_method
    ? `${parsed.name} ${parsed.cooking_method}`
    : parsed.name;

  const cached = await checkCache(supabase as any, searchPhrase);
  if (cached) {
    return {
      fdc_id: parseInt(cached.source_id, 10),
      food_name: cached.description,
      brand_owner: cached.brand || undefined,
      per100g: cached.nutrients_per_100g,
      cooked: cached.cooked,
      is_raw: cached.is_raw,
      confidence: 'high',
      data_type: cached.data_type,
    };
  }

  const result = await searchFoods(searchPhrase, ['Survey (FNDDS)', 'Foundation', 'SR Legacy'], 10);
  const foods = result.foods ?? [];

  if (foods.length === 0) {
    const fallback = await searchFoods(parsed.name, ['Survey (FNDDS)', 'Foundation', 'SR Legacy'], 5);
    const fallbackFoods = fallback.foods ?? [];
    if (fallbackFoods.length === 0) {
      throw new Error(`No USDA match for "${parsed.name}"`);
    }
    const best = fallbackFoods[0];
    const nutrients = nutrientsFromFood(best);
    const resolved: ResolvedFood = {
      fdc_id: best.fdcId,
      food_name: best.description,
      per100g: nutrients ?? { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 },
      cooked: false,
      is_raw: true,
      confidence: 'low',
      data_type: best.dataType,
    };
    return resolved;
  }

  const wantedCooked = !!parsed.cooking_method && parsed.cooking_method !== 'raw';
  const ranked = rankFoods(searchPhrase, foods, wantedCooked);
  const best = ranked[0];
  const nutrients = nutrientsFromFood(best);

  if (!nutrients) {
    throw new Error(`No nutrient data for USDA item ${best.fdcId} ("${best.description}")`);
  }

  const foodCooked = isCooked(best.description);
  let confidence: ResolvedFood['confidence'] = 'medium';
  if (foodCooked === wantedCooked) {
    confidence = 'high';
  } else if (foodCooked === false && wantedCooked && parsed.is_meat) {
    const yieldFactor = parsed.cooking_method
      ? getYieldFactor(parsed.name, parsed.cooking_method)
      : null;
    if (yieldFactor) {
      const cookedGrams = applyYieldFactor(100, yieldFactor, false);
      nutrients.kcal = Math.round(nutrients.kcal * cookedGrams / 100);
      nutrients.protein_g = Math.round(nutrients.protein_g * cookedGrams / 100 * 10) / 10;
      nutrients.fat_g = Math.round(nutrients.fat_g * cookedGrams / 100 * 10) / 10;
      nutrients.carbs_g = Math.round(nutrients.carbs_g * cookedGrams / 100 * 10) / 10;
    }
    confidence = 'medium';
  }

  const resolved: ResolvedFood = {
    fdc_id: best.fdcId,
    food_name: best.description,
    brand_owner: best.brandOwner,
    per100g: nutrients,
    cooked: foodCooked,
    is_raw: !foodCooked,
    confidence,
    data_type: best.dataType,
  };

  const cacheEntry: CacheEntry = {
    source: 'usda',
    source_id: String(best.fdcId),
    normalized_query: normalizeQuery(searchPhrase),
    description: best.description,
    data_type: best.dataType ?? '',
    cooked: foodCooked,
    is_raw: !foodCooked,
    nutrients_per_100g: nutrients,
    brand: best.brandOwner ?? '',
  };
  await writeCache(supabase as any, cacheEntry);

  return resolved;
}

export function scaleToPortion(resolved: ResolvedFood, grams: number, oilFactor?: { oilGrams: number; oilNutrients: ResolvedFood['per100g'] }) {
  const ratio = grams / 100;
  const macros = {
    calories: Math.round(resolved.per100g.kcal * ratio),
    protein_g: Math.round(resolved.per100g.protein_g * ratio * 10) / 10,
    fat_g: Math.round(resolved.per100g.fat_g * ratio * 10) / 10,
    carbs_g: Math.round(resolved.per100g.carbs_g * ratio * 10) / 10,
    fiber_g: resolved.per100g.fiber_g ? Math.round(resolved.per100g.fiber_g * ratio * 10) / 10 : undefined,
  };

  if (oilFactor) {
    const oilRatio = oilFactor.oilGrams / 100;
    macros.calories += Math.round(oilFactor.oilNutrients.kcal * oilRatio);
    macros.fat_g = Math.round((macros.fat_g + oilFactor.oilNutrients.fat_g * oilRatio) * 10) / 10;
  }

  return macros;
}
