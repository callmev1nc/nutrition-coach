import { describe, it, expect } from 'vitest'
import { buildPreferenceBlock, groupPreferences, decayWeight, type PreferenceRow } from '@/lib/preference-block'

describe('decayWeight', () => {
  it('never decays avoid signals', () => {
    const row: PreferenceRow = {
      food_name: 'peanuts',
      signal: 'avoid',
      weight: 10,
      source: 'explicit',
      last_seen: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(decayWeight(row)).toBe(10)
  })

  it('never decays allergies', () => {
    const row: PreferenceRow = {
      food_name: 'milk',
      signal: 'allergy',
      weight: 5,
      source: 'explicit',
      last_seen: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(decayWeight(row)).toBe(5)
  })

  it('decays likes and dislikes over time', () => {
    const row: PreferenceRow = {
      food_name: 'tofu',
      signal: 'dislike',
      weight: 3,
      source: 'meal_feedback',
      last_seen: new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const decayed = decayWeight(row)
    expect(decayed).toBeLessThan(3)
    expect(decayed).toBeGreaterThanOrEqual(1)
  })

  it('never goes below 1', () => {
    const row: PreferenceRow = {
      food_name: 'spinach',
      signal: 'like',
      weight: 1,
      source: 'explicit',
      last_seen: new Date(Date.now() - 100 * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(decayWeight(row)).toBe(1)
  })
})

describe('groupPreferences', () => {
  it('groups rows by signal and caps likes/dislikes at 5', () => {
    const rows: PreferenceRow[] = [
      { food_name: 'Chicken', signal: 'like', weight: 5, source: 'meal_feedback', last_seen: new Date().toISOString() },
      { food_name: 'Rice', signal: 'like', weight: 3, source: 'meal_feedback', last_seen: new Date().toISOString() },
      { food_name: 'Tofu', signal: 'dislike', weight: 2, source: 'meal_feedback', last_seen: new Date().toISOString() },
      { food_name: 'Peanuts', signal: 'avoid', weight: 10, source: 'explicit', last_seen: new Date().toISOString() },
      { food_name: 'Milk', signal: 'allergy', weight: 5, source: 'explicit', last_seen: new Date().toISOString() },
    ]

    const grouped = groupPreferences(rows)
    expect(grouped.likes).toContain('chicken')
    expect(grouped.likes).toContain('rice')
    expect(grouped.dislikes).toContain('tofu')
    expect(grouped.avoids).toContain('peanuts')
    expect(grouped.allergies).toContain('milk')
  })
})

describe('buildPreferenceBlock', () => {
  it('returns empty string for no preferences', () => {
    expect(buildPreferenceBlock([])).toBe('')
  })

  it('builds a compact block under ~80 tokens', () => {
    const rows: PreferenceRow[] = [
      { food_name: 'Chicken', signal: 'like', weight: 5, source: 'meal_feedback', last_seen: new Date().toISOString() },
      { food_name: 'Tofu', signal: 'dislike', weight: 2, source: 'meal_feedback', last_seen: new Date().toISOString() },
    ]

    const block = buildPreferenceBlock(rows)
    expect(block).toContain('Likes')
    expect(block).toContain('Dislikes')
    expect(block).toContain('chicken')
    expect(block).toContain('tofu')
    expect(block.length).toBeLessThan(200) // well under ~80 tokens
  })
})
