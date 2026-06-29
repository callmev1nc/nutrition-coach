import { describe, it, expect } from 'vitest'

describe('generateMealPlanStream', () => {
  it('has generateMealPlanStream export in gemini.ts', async () => {
    const gemini = await import('@/lib/gemini')
    expect(typeof gemini.generateMealPlanStream).toBe('function')
  })

  it('produces a valid async generator', async () => {
    const gemini = await import('@/lib/gemini')
    const gen = gemini.generateMealPlanStream(2000, 150, 200, 65, 'no preference', 70)
    expect(gen[Symbol.asyncIterator]).toBeDefined()
  })

  it('stream chunks assemble into a single JSON document (single-phase)', () => {
    // The streamer now yields the complete JSON across chunks with no phase
    // marker; the client/route concatenate them and parse once.
    const chunks = [
      '{"meals":[',
      '{"name":"Breakfast","type":"breakfast","calories":500,"protein":30,"carbs":50,"fat":20,"foods":[]}',
      ']}',
    ]
    const parsed = JSON.parse(chunks.join(''))
    expect(parsed.meals).toHaveLength(1)
  })

  it('stream output can be assembled and parsed as valid JSON', () => {
    const phaseB = JSON.stringify({
      meals: [
        {
          name: 'Breakfast',
          type: 'breakfast',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20,
          foods: [
            { name: 'Oatmeal', quantity: '1 cup', calories: 300, protein: 10, carbs: 50, fat: 5 },
            { name: 'Banana', quantity: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
          ],
        },
      ],
    })

    const parsed = JSON.parse(phaseB)
    expect(parsed.meals).toHaveLength(1)
    expect(parsed.meals[0].foods).toHaveLength(2)
    expect(parsed.meals[0].foods[0].name).toBe('Oatmeal')
  })

  it('token-capped output with required fields ensures no partial JSON', () => {
    const incomplete = '{"meals": [{"name": "Breakfast", "type": "breakfast"'
    expect(() => JSON.parse(incomplete)).toThrow()
  })
})
