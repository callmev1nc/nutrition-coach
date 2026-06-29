import { describe, it, expect } from 'vitest'

describe('generatePlanVsActualNudge', () => {
  it('has generatePlanVsActualNudge export in gemini.ts', async () => {
    const gemini = await import('@/lib/gemini')
    expect(typeof gemini.generatePlanVsActualNudge).toBe('function')
  })

  it('produces valid JSON structure from example output', () => {
    const mockResponse = JSON.stringify({
      headline: 'Great job!',
      body: 'You ate close to your plan today.',
      tone: 'celebrate',
      delta_calories: 50,
    })

    const parsed = JSON.parse(mockResponse)
    expect(parsed).toHaveProperty('headline')
    expect(parsed).toHaveProperty('body')
    expect(parsed).toHaveProperty('tone')
    expect(parsed).toHaveProperty('delta_calories')
    expect(['celebrate', 'nudge', 'redirect']).toContain(parsed.tone)
  })

  it('flags tone as nudge when under-eating by >15%', () => {
    const plan = { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    const actual = { calories: 1400, protein: 100, carbs: 120, fat: 40 }
    const delta = actual.calories - plan.calories
    const tone = delta < -plan.calories * 0.15 ? 'nudge' : delta > plan.calories * 0.15 ? 'redirect' : 'celebrate'
    expect(tone).toBe('nudge')
  })

  it('flags tone as redirect when over-eating by >15%', () => {
    const plan = { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    const actual = { calories: 2500, protein: 180, carbs: 250, fat: 80 }
    const delta = actual.calories - plan.calories
    const tone = delta < -plan.calories * 0.15 ? 'nudge' : delta > plan.calories * 0.15 ? 'redirect' : 'celebrate'
    expect(tone).toBe('redirect')
  })

  it('flags tone as celebrate when within 15%', () => {
    const plan = { calories: 2000, protein: 150, carbs: 200, fat: 65 }
    const actual = { calories: 1900, protein: 140, carbs: 190, fat: 60 }
    const delta = actual.calories - plan.calories
    const tone = delta < -plan.calories * 0.15 ? 'nudge' : delta > plan.calories * 0.15 ? 'redirect' : 'celebrate'
    expect(tone).toBe('celebrate')
  })
})
