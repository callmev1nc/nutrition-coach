import { describe, it, expect } from 'vitest'
// easeOutCubic is exported from the (client) hook module, but it is a pure
// function with no DOM access, so it is safe to import in a node test env.
import { easeOutCubic } from '@/components/motion/use-count-up'

describe('easeOutCubic', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
  })
  it('is monotonic non-decreasing on [0,1]', () => {
    let prev = -Infinity
    for (let i = 0; i <= 20; i++) {
      const v = easeOutCubic(i / 20)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
  it('decelerates (ease-out): the midpoint exceeds linear 0.5', () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 3) // 1 - 0.5^3
  })
})
