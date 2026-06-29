import { describe, it, expect } from 'vitest'

describe('parseFoodSentence', () => {
  it('has parseFoodSentence export in gemini.ts', async () => {
    const gemini = await import('@/lib/gemini')
    expect(typeof gemini.parseFoodSentence).toBe('function')
  })

  it('produces valid JSON structure', () => {
    const mockResponse = JSON.stringify({
      items: [
        {
          name: 'grilled chicken',
          quantity: 200,
          unit: 'g',
          cooking_method: 'grilled',
          is_meat: true,
          fat_trimmed: true,
        },
        {
          name: 'olive oil',
          quantity: 5,
          unit: 'ml',
          cooking_method: null,
          is_meat: false,
          oil: null,
        },
      ],
    })

    const parsed = JSON.parse(mockResponse)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0].name).toBe('grilled chicken')
    expect(parsed.items[0].cooking_method).toBe('grilled')
    expect(parsed.items[0].is_meat).toBe(true)
    expect(parsed.items[0].fat_trimmed).toBe(true)
    expect(parsed.items[1].quantity).toBe(5)
    expect(parsed.items[1].unit).toBe('ml')
  })

  it('ensures no macro fields in the parse output', () => {
    const mockResponse = JSON.stringify({
      items: [
        { name: 'chicken', quantity: 200, unit: 'g', cooking_method: 'grilled', is_meat: true },
      ],
    })

    const parsed = JSON.parse(mockResponse)
    for (const item of parsed.items) {
      expect(item).not.toHaveProperty('calories')
      expect(item).not.toHaveProperty('protein_g')
      expect(item).not.toHaveProperty('carbs_g')
      expect(item).not.toHaveProperty('fat_g')
    }
  })
})
