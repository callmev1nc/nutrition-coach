import { describe, it, expect } from 'vitest'
import {
  calculateBMR_Mifflin,
  calculateBMR_Katch,
  getActivityMultiplier,
  calculateTDEE,
  calculateMacros,
  calculateAll,
} from '../calculations'

describe('calculateBMR_Mifflin', () => {
  it('computes male BMR correctly', () => {
    // 10*80 + 6.25*180 - 5*25 + 5 = 1805
    expect(calculateBMR_Mifflin(80, 180, 25, 'male')).toBeCloseTo(1805, 1)
  })
  it('computes female BMR correctly (subtracts 161)', () => {
    // 800 + 1125 - 125 - 161 = 1639
    expect(calculateBMR_Mifflin(80, 180, 25, 'female')).toBeCloseTo(1639, 1)
  })
})

describe('calculateBMR_Katch', () => {
  it('returns null when body fat is missing', () => {
    expect(calculateBMR_Katch(80, null)).toBeNull()
    expect(calculateBMR_Katch(80, undefined)).toBeNull()
  })
  it('uses lean mass formula', () => {
    // lean = 80*(1-0.2)=64; 370 + 21.6*64 = 1752.4
    expect(calculateBMR_Katch(80, 20)).toBeCloseTo(1752.4, 1)
  })
})

describe('getActivityMultiplier', () => {
  it('returns the documented multipliers', () => {
    expect(getActivityMultiplier('sedentary')).toBe(1.2)
    expect(getActivityMultiplier('light')).toBe(1.375)
    expect(getActivityMultiplier('moderate')).toBe(1.55)
    expect(getActivityMultiplier('active')).toBe(1.725)
    expect(getActivityMultiplier('very_active')).toBe(1.9)
  })
  it('falls back to moderate for unknown level', () => {
    expect(getActivityMultiplier('whatever' as never)).toBe(1.55)
  })
})

describe('calculateTDEE', () => {
  it('multiplies BMR by activity level and rounds', () => {
    expect(calculateTDEE(1805, 'sedentary', false, 3)).toBe(Math.round(1805 * 1.2))
  })
  it('applies -100 kcal adjustment for office jobs', () => {
    const base = Math.round(1805 * 1.2)
    expect(calculateTDEE(1805, 'sedentary', true, 3)).toBe(base - 100)
  })
})

describe('calculateMacros', () => {
  it('splits calories into protein/fat/carbs with a moderate deficit', () => {
    const m = calculateMacros(2000, 80, 'moderate')
    // deficit 20% -> adjusted 1600
    expect(m.protein_g).toBeCloseTo(176, 1) // 2.2 * 80
    expect(m.protein_cal).toBe(Math.round(176 * 4))
    expect(m.fat_cal).toBe(Math.round(1600 * 0.25))
    expect(m.carbs_cal).toBe(1600 - m.protein_cal - m.fat_cal)
  })
})

describe('calculateAll', () => {
  it('prefers Katch BMR when body fat is available', () => {
    const r = calculateAll(80, 180, 25, 'male', 20, 'moderate', false, 3)
    const katch = Math.round(1752.4)
    const tdee = Math.round(katch * 1.55)
    expect(r.tdee).toBe(tdee)
    expect(r.target_calories).toBe(Math.round(tdee * 0.8))
    expect(r.moderate_deficit).toBe(Math.round(tdee * 0.8))
    expect(r.mild_deficit).toBe(Math.round(tdee * 0.9))
  })
  it('falls back to Mifflin without body fat', () => {
    const r = calculateAll(80, 180, 25, 'male', null, 'moderate', false, 3)
    const mifflin = Math.round(1805)
    expect(r.tdee).toBe(Math.round(mifflin * 1.55))
  })
})
