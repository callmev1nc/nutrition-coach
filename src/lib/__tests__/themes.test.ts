import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME, isThemeKey, getThemeMeta } from '../themes'

describe('themes registry', () => {
  it('exposes the five documented themes', () => {
    expect(THEMES.map((t) => t.key).sort()).toEqual(['bloom', 'mint', 'mono', 'sunset', 'volt'])
  })
  it('has unique keys', () => {
    const keys = THEMES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('every theme has display data and valid hex swatches', () => {
    for (const t of THEMES) {
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.emoji.length).toBeGreaterThan(0)
      expect(t.blurb.length).toBeGreaterThan(0)
      expect(t.swatch.primary).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(t.swatch.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(t.swatch.bg).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
  it('defaults to Volt', () => {
    expect(DEFAULT_THEME).toBe('volt')
    expect(getThemeMeta('volt').name).toBe('Volt')
  })
  it('volt is NOT the generic wellness emerald (the differentiator)', () => {
    const volt = getThemeMeta('volt')
    expect(volt.swatch.primary.toLowerCase()).not.toBe('#10b981')
    expect(volt.swatch.primary.toLowerCase()).toBe('#7c3aed')
  })
})

describe('isThemeKey / getThemeMeta', () => {
  it('validates known keys and rejects unknown ones', () => {
    expect(isThemeKey('volt')).toBe(true)
    expect(isThemeKey('sunset')).toBe(true)
    expect(isThemeKey('neon')).toBe(false)
    expect(isThemeKey(null)).toBe(false)
    expect(isThemeKey(undefined)).toBe(false)
  })
  it('falls back to Volt for unknown / missing input', () => {
    expect(getThemeMeta('nope').key).toBe('volt')
    expect(getThemeMeta(null).key).toBe('volt')
    expect(getThemeMeta(undefined).key).toBe('volt')
  })
})
