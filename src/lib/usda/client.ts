export const NUTRIENT_IDS = {
  kcal: 1008,
  protein_g: 1003,
  fat_g: 1004,
  carbs_g: 1005,
  fiber_g: 1009,
  sugar_g: 2000,
} as const;

export type NutrientId = keyof typeof NUTRIENT_IDS;

export const COOKED_TOKEN_RE = /cooked|grilled|broiled|roasted|baked|stewed|braised|fried/i;

export interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType?: string;
  foodNutrients?: { nutrientId: number; value: number }[];
  servingSize?: string;
  servingSizeUnit?: string;
  foodPortions?: { gramWeight: number; amount: number; modifier: string }[];
}

export interface USDAFoodsResponse {
  foods: USDAFood[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

export interface USDAFoodDetail {
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType?: string;
  foodNutrients: { nutrientId: number; value: number; nutrientName?: string }[];
  servingSize?: number;
  servingSizeUnit?: string;
  foodPortions?: { gramWeight: number; amount: number; modifier: string }[];
}

function extractNutrients(nutrients: { nutrientId: number; value: number }[]) {
  const map: Record<number, number> = {};
  for (const n of nutrients) {
    map[n.nutrientId] = n.value;
  }
  return {
    kcal: map[NUTRIENT_IDS.kcal] ?? 0,
    protein_g: map[NUTRIENT_IDS.protein_g] ?? 0,
    fat_g: map[NUTRIENT_IDS.fat_g] ?? 0,
    carbs_g: map[NUTRIENT_IDS.carbs_g] ?? 0,
    fiber_g: map[NUTRIENT_IDS.fiber_g],
    sugar_g: map[NUTRIENT_IDS.sugar_g],
  };
}

function apiKey(): string {
  const key = process.env.USDA_FDC_API_KEY;
  if (!key || key === 'DEMO_KEY') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('USDA_FDC_API_KEY is required in production');
    }
    return 'DEMO_KEY';
  }
  return key;
}

const BASE = 'https://api.nal.usda.gov/fdc/v1';

async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);

  const remaining = res.headers.get('X-RateLimit-Remaining');
  if (remaining && parseInt(remaining, 10) < 50) {
    const reset = res.headers.get('X-RateLimit-Reset');
    const wait = reset ? Math.max(0, parseInt(reset, 10) * 1000 - Date.now() + 1000) : 1000;
    if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
  }

  if (!res.ok) {
    throw new Error(`USDA API error ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }

  return res;
}

export async function searchFoods(
  query: string,
  dataType?: string[],
  pageSize = 10,
  pageNumber = 1
): Promise<USDAFoodsResponse> {
  const key = apiKey();
  const url = `${BASE}/foods/search`;
  const body: Record<string, unknown> = {
    query,
    pageSize,
    pageNumber,
    dataType: dataType ?? ['Survey (FNDDS)', 'Foundation', 'SR Legacy'],
    // USDA FoodData Central requires the API key. It accepts it in the POST body
    // (api_key) — without this every search returns 403 "API_KEY_MISSING".
    api_key: key,
  };

  const res = await rateLimitedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    next: { revalidate: 86400 },
  });

  return res.json();
}

export async function getFood(fdcId: number): Promise<USDAFoodDetail> {
  const key = apiKey();
  const url = `${BASE}/food/${fdcId}?api_key=${key}`;
  const res = await rateLimitedFetch(url, { next: { revalidate: 86400 } });
  return res.json();
}

export function nutrientsFromFood(food: { foodNutrients?: { nutrientId: number; value: number }[] }) {
  if (!food.foodNutrients) return null;
  return extractNutrients(food.foodNutrients);
}

export function isCooked(description: string): boolean {
  return COOKED_TOKEN_RE.test(description);
}

export function isRawFood(type?: string): boolean {
  if (!type) return false;
  return type === 'raw' || /raw/i.test(type);
}
