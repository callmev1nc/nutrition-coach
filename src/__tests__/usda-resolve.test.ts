import { describe, it, expect } from 'vitest'
import { NUTRIENT_IDS, COOKED_TOKEN_RE } from '@/lib/usda/client'
import { COOKING_YIELDS, getYieldFactor, applyYieldFactor, estimateOilGrams, portionToGrams } from '@/lib/usda/cooking-yields'

describe('USDA nutrient ID map', () => {
  it('maps expected nutrients', () => {
    expect(NUTRIENT_IDS.kcal).toBe(1008)
    expect(NUTRIENT_IDS.protein_g).toBe(1003)
    expect(NUTRIENT_IDS.fat_g).toBe(1004)
    expect(NUTRIENT_IDS.carbs_g).toBe(1005)
    expect(NUTRIENT_IDS.fiber_g).toBe(1009)
  })
})

describe('COOKED_TOKEN_RE', () => {
  it('matches cooked descriptions', () => {
    expect(COOKED_TOKEN_RE.test('grilled chicken breast')).toBe(true)
    expect(COOKED_TOKEN_RE.test('baked salmon')).toBe(true)
    expect(COOKED_TOKEN_RE.test('fried rice')).toBe(true)
    expect(COOKED_TOKEN_RE.test('roasted vegetables')).toBe(true)
    expect(COOKED_TOKEN_RE.test('broiled fish')).toBe(true)
    expect(COOKED_TOKEN_RE.test('raw chicken')).toBe(false)
    expect(COOKED_TOKEN_RE.test('fresh apple')).toBe(false)
  })
})

describe('cooking yield factors', () => {
  it('has factors for common proteins', () => {
    expect(COOKING_YIELDS['chicken breast, grilled'].cooked).toBeCloseTo(0.79)
    expect(COOKING_YIELDS['chicken thigh, grilled'].cooked).toBeCloseTo(0.74)
    expect(COOKING_YIELDS['beef steak, grilled'].cooked).toBeCloseTo(0.81)
  })

  it('gets yield factor for known combination', () => {
    const factor = getYieldFactor('chicken breast', 'grilled')
    expect(factor).not.toBeNull()
    expect(factor!.cooked).toBeCloseTo(0.79)
  })

  it('returns null for unknown combination', () => {
    const factor = getYieldFactor('tofu', 'blasted')
    expect(factor).toBeNull()
  })

  it('applyYieldFactor with raw input applies shrinkage', () => {
    const result = applyYieldFactor(100, { cooked: 0.74 }, false)
    expect(result).toBe(74)
  })

  it('applyYieldFactor with cooked input returns unchanged', () => {
    const result = applyYieldFactor(150, { cooked: 0.74 }, true)
    expect(result).toBe(150)
  })

  it('estimateOilGrams returns 0 when no oil_absorption', () => {
    const oil = estimateOilGrams(100, { cooked: 0.79 })
    expect(oil).toBe(0)
  })

  it('estimateOilGrams returns correct oil for fried food', () => {
    const oil = estimateOilGrams(100, { cooked: 0.74, oil_absorption: 0.10 })
    expect(oil).toBe(10)
  })
})

describe('portionToGrams', () => {
  it('passes grams through unchanged', () => {
    expect(portionToGrams(200, 'g')).toBe(200)
  })

  it('converts kilograms to grams', () => {
    expect(portionToGrams(1.5, 'kg')).toBe(1500)
  })

  it('treats millilitres as ~1g/ml', () => {
    expect(portionToGrams(250, 'ml')).toBe(250)
  })

  it('converts teaspoons to grams (5g)', () => {
    expect(portionToGrams(2, 'tsp')).toBe(10)
  })

  it('converts tablespoons to grams (15g)', () => {
    expect(portionToGrams(1, 'tbsp')).toBe(15)
  })

  it('converts cups to grams (240g)', () => {
    expect(portionToGrams(1, 'cup')).toBe(240)
  })

  it('converts ounces to grams', () => {
    expect(portionToGrams(4, 'oz')).toBeCloseTo(113.4, 0)
  })

  it('is case-insensitive on unit', () => {
    expect(portionToGrams(1, 'TBSP')).toBe(15)
  })

  it('does NOT multiply unknown units by 100 (regression: 1 tsp -> 100g)', () => {
    expect(portionToGrams(1, 'tsp')).toBe(5)
    expect(portionToGrams(200, 'ml')).toBe(200)
  })

  it('falls back to treating unknown/count units as grams (best-effort, no blowup)', () => {
    expect(portionToGrams(150, 'piece')).toBe(150)
    expect(portionToGrams(2, 'slices')).toBe(2)
  })

  it('handles undefined unit by treating quantity as grams', () => {
    expect(portionToGrams(100, undefined)).toBe(100)
  })
})

describe('scaleToPortion', () => {
  it('scales macros correctly for 150g portion', async () => {
    const { scaleToPortion } = await import('@/lib/usda/resolve')

    const result = scaleToPortion(
      {
        fdc_id: 1,
        food_name: 'chicken breast',
        per100g: { kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0 },
        cooked: true,
        is_raw: false,
        confidence: 'high',
      },
      150
    )

    expect(result.calories).toBe(248)
    expect(result.protein_g).toBeCloseTo(46.5)
    expect(result.fat_g).toBeCloseTo(5.4)
    expect(result.carbs_g).toBeCloseTo(0)
  })

  it('includes oil contribution when provided', async () => {
    const { scaleToPortion } = await import('@/lib/usda/resolve')

    const result = scaleToPortion(
      {
        fdc_id: 1,
        food_name: 'chicken breast',
        per100g: { kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0 },
        cooked: true,
        is_raw: false,
        confidence: 'high',
      },
      100,
      { oilGrams: 8, oilNutrients: { kcal: 884, protein_g: 0, fat_g: 100, carbs_g: 0 } }
    )

    expect(result.calories).toBeGreaterThan(165)
    expect(result.fat_g).toBeGreaterThan(3.6)
  })
})
