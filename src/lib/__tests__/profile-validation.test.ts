import { describe, it, expect } from 'vitest'
import { sanitizeProfileInput } from '../profile-validation'

describe('sanitizeProfileInput — valid input', () => {
  it('accepts a well-formed payload and coerces types', () => {
    const r = sanitizeProfileInput({
      age: '25',
      gender: 'male',
      height_cm: '180',
      weight_kg: 80,
      activity_level: 'moderate',
      training_days_per_week: 4,
      office_job: true,
      goal_weight_kg: 70,
      theme: 'sunset',
      coach_persona: 'bestie',
      avatar_emoji: '🦊',
      mood_today: 3,
    })
    expect(r.ok).toBe(true)
    expect(r.data?.age).toBe(25)
    expect(r.data?.height_cm).toBe(180)
    expect(r.data?.theme).toBe('sunset')
    expect(r.data?.mood_today).toBe(3)
  })

  it('drops unknown keys (whitelist enforcement)', () => {
    const r = sanitizeProfileInput({ age: 20, evil: 'payload', randomColumn: 123 })
    expect(r.ok).toBe(true)
    expect(r.data).not.toHaveProperty('evil')
    expect(r.data).not.toHaveProperty('randomColumn')
  })

  it('cannot write gameable progress fields', () => {
    // These must be stripped — they only change via the secured award_xp() RPC.
    const r = sanitizeProfileInput({ xp_total: 999999, level: 99, streak_days: 500, badges: ['x'] })
    expect(r.ok).toBe(true)
    expect(r.data).not.toHaveProperty('xp_total')
    expect(r.data).not.toHaveProperty('level')
    expect(r.data).not.toHaveProperty('streak_days')
    expect(r.data).not.toHaveProperty('badges')
  })

  it('treats empty/null optional fields as cleared', () => {
    const r = sanitizeProfileInput({ food_preferences: '   ', mood_today: null })
    expect(r.ok).toBe(true)
    expect(r.data?.food_preferences).toBeNull()
    expect(r.data).not.toHaveProperty('mood_today')
  })
})

describe('sanitizeProfileInput — invalid input', () => {
  it('rejects out-of-range age', () => {
    expect(sanitizeProfileInput({ age: 5 }).ok).toBe(false)
    expect(sanitizeProfileInput({ age: 200 }).ok).toBe(false)
  })
  it('rejects out-of-range weight/height/bodyfat', () => {
    expect(sanitizeProfileInput({ weight_kg: 5 }).ok).toBe(false)
    expect(sanitizeProfileInput({ height_cm: 9999 }).ok).toBe(false)
    expect(sanitizeProfileInput({ body_fat_percent: 95 }).ok).toBe(false)
  })
  it('rejects invalid enums', () => {
    expect(sanitizeProfileInput({ activity_level: 'super_active' }).ok).toBe(false)
    expect(sanitizeProfileInput({ sleep_quality: 'amazing' }).ok).toBe(false)
    expect(sanitizeProfileInput({ theme: 'hot-pink' }).ok).toBe(false)
    expect(sanitizeProfileInput({ coach_persona: 'shouty' }).ok).toBe(false)
  })
  it('rejects mood/energy outside 1-5', () => {
    expect(sanitizeProfileInput({ mood_today: 0 }).ok).toBe(false)
    expect(sanitizeProfileInput({ mood_today: 6 }).ok).toBe(false)
    expect(sanitizeProfileInput({ energy_today: 3 }).ok).toBe(true)
  })
  it('rejects non-object payloads', () => {
    expect(sanitizeProfileInput(null).ok).toBe(false)
    expect(sanitizeProfileInput('string').ok).toBe(false)
  })
})
