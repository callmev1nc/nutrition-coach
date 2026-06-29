export interface YieldFactor {
  cooked: number;
  oil_absorption?: number;
}

export const COOKING_YIELDS: Record<string, YieldFactor> = {
  'chicken breast, grilled': { cooked: 0.79 },
  'chicken breast, baked': { cooked: 0.77 },
  'chicken breast, fried': { cooked: 0.79, oil_absorption: 0.08 },
  'chicken thigh, grilled': { cooked: 0.74 },
  'chicken thigh, baked': { cooked: 0.72 },
  'chicken thigh, fried': { cooked: 0.74, oil_absorption: 0.10 },
  'chicken wing, fried': { cooked: 0.68, oil_absorption: 0.12 },
  'beef steak, grilled': { cooked: 0.81 },
  'beef steak, pan fried': { cooked: 0.78, oil_absorption: 0.04 },
  'beef, ground, pan fried': { cooked: 0.72 },
  'pork chop, grilled': { cooked: 0.78 },
  'pork chop, fried': { cooked: 0.76, oil_absorption: 0.06 },
  'fish fillet, baked': { cooked: 0.85 },
  'fish fillet, fried': { cooked: 0.85, oil_absorption: 0.10 },
  'shrimp, boiled': { cooked: 0.75 },
  'shrimp, grilled': { cooked: 0.73 },
  'rice, boiled': { cooked: 2.5 },
  'pasta, boiled': { cooked: 2.3 },
  'potato, baked': { cooked: 0.95 },
  'potato, boiled': { cooked: 0.96 },
  'potato, fried': { cooked: 0.55, oil_absorption: 0.12 },
  'vegetables, sautéed': { cooked: 0.85, oil_absorption: 0.05 },
};

export function getYieldFactor(protein: string, cookingMethod: string): YieldFactor | null {
  const key = `${protein.toLowerCase()}, ${cookingMethod}`;
  const exact = COOKING_YIELDS[key];
  if (exact) return exact;

  for (const [pattern, factor] of Object.entries(COOKING_YIELDS)) {
    if (pattern.startsWith(protein.toLowerCase()) && pattern.endsWith(cookingMethod)) {
      return factor;
    }
  }

  return null;
}

export function applyYieldFactor(servingGrams: number, factor: YieldFactor, isCookedInput: boolean): number {
  if (isCookedInput) {
    return servingGrams;
  }
  return Math.round(servingGrams * factor.cooked);
}

export function estimateOilGrams(servingGrams: number, factor: YieldFactor): number {
  if (!factor.oil_absorption) return 0;
  return Math.round(servingGrams * factor.oil_absorption);
}

/**
 * Convert a parsed portion (quantity + unit) into grams so per-100g nutrition
 * can be scaled correctly. Known mass/volume units are converted precisely;
 * millilitres are treated as ~1 g/ml (water-like, fine for most drinks/soups).
 *
 * Count/unknown units (piece, slice, serving, ...) cannot be converted without
 * per-food data, so we fall back to treating the quantity as grams. This is
 * intentionally best-effort: it keeps nutrition roughly sensible instead of the
 * old behaviour that multiplied any non-gram unit by 100 (so "1 tsp" -> 100 g
 * and "200 ml" -> 20 000 g). For accuracy, prefer grams.
 */
const UNIT_GRAM_FACTORS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  milliliter: 1,
  millilitre: 1,
  l: 1000,
  liter: 1000,
  litre: 1000,
  tsp: 5,
  teaspoon: 5,
  tbsp: 15,
  tablespoon: 15,
  cup: 240,
  oz: 28.35,
  ounce: 28.35,
  lb: 453.6,
  pound: 453.6,
};

export function portionToGrams(quantity: number, unit?: string): number {
  const grams = Number(quantity);
  if (!Number.isFinite(grams)) return 0;
  if (!unit) return grams;
  const factor = UNIT_GRAM_FACTORS[unit.toLowerCase().trim()];
  // Unknown/count unit: fall back to the quantity as grams (see jsdoc).
  if (!factor) return grams;
  return Math.round((grams * factor) * 1000) / 1000;
}
