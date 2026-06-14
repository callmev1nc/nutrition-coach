import { describe, it, expect } from 'vitest'
import {
  isMinor,
  ageBand,
  calorieFloorFor,
  maxDeficitPercent,
  enforceCalorieFloor,
  buildCoachSystemPrompt,
} from '../ai-safety'

describe('isMinor', () => {
  it('treats under-18s as minors', () => {
    expect(isMinor(10)).toBe(true)
    expect(isMinor(13)).toBe(true)
    expect(isMinor(17)).toBe(true)
    expect(isMinor(18)).toBe(false)
    expect(isMinor(25)).toBe(false)
  })
  it('handles missing age safely (treats as adult, not minor)', () => {
    expect(isMinor(null)).toBe(false)
    expect(isMinor(undefined)).toBe(false)
    expect(isMinor(0)).toBe(false)
  })
})

describe('ageBand', () => {
  it('classifies child / teen / adult', () => {
    expect(ageBand(10)).toBe('child')
    expect(ageBand(12)).toBe('child')
    expect(ageBand(13)).toBe('teen')
    expect(ageBand(17)).toBe('teen')
    expect(ageBand(18)).toBe('adult')
    expect(ageBand(40)).toBe('adult')
  })
})

describe('calorieFloorFor', () => {
  it('gives minors growth-aware floors above the adult minimums', () => {
    expect(calorieFloorFor(13, 'female')).toBe(1800)
    expect(calorieFloorFor(13, 'male')).toBe(2100)
    expect(calorieFloorFor(10, 'female')).toBe(1600)
  })
  it('keeps the standard adult floors', () => {
    expect(calorieFloorFor(25, 'female')).toBe(1200)
    expect(calorieFloorFor(25, 'male')).toBe(1500)
  })
})

describe('maxDeficitPercent', () => {
  it('forbids deficits for children, allows mild for teens, full for adults', () => {
    expect(maxDeficitPercent(10)).toBe(0)
    expect(maxDeficitPercent(15)).toBe(0.1)
    expect(maxDeficitPercent(25)).toBe(0.25)
  })
})

describe('enforceCalorieFloor', () => {
  it('clamps sub-floor targets up to the safe floor', () => {
    expect(enforceCalorieFloor(1000, 13, 'female')).toBe(1800)
  })
  it('leaves above-floor targets unchanged (and rounds)', () => {
    expect(enforceCalorieFloor(2200.4, 13, 'female')).toBe(2200)
    expect(enforceCalorieFloor(2500, 30, 'male')).toBe(2500)
  })
  it('falls back to the floor for non-finite input', () => {
    expect(enforceCalorieFloor(NaN, 25, 'male')).toBe(1500)
  })
})

describe('buildCoachSystemPrompt', () => {
  it('adds minor-only guardrails and the higher floor for under-18s', () => {
    const prompt = buildCoachSystemPrompt({ age: 14, gender: 'female', persona: 'hype' })
    expect(prompt).toContain('UNDER 18')
    expect(prompt).toContain('1800') // teen female floor baked in
    expect(prompt).not.toContain('below 1200') // adult phrasing must not appear for minors
    expect(prompt).toContain('growing')
  })
  it('uses adult floors and omits the minor block for adults', () => {
    const prompt = buildCoachSystemPrompt({ age: 30, gender: 'male' })
    expect(prompt).not.toContain('UNDER 18')
    expect(prompt).toContain('1500')
  })
  it('layers the chosen persona tone into the prompt', () => {
    const hype = buildCoachSystemPrompt({ age: 25, persona: 'hype' })
    const bestie = buildCoachSystemPrompt({ age: 25, persona: 'bestie' })
    expect(hype.toLowerCase()).toContain('hype')
    expect(bestie.toLowerCase()).toContain('best friend')
  })
  it('falls back to the hype tone for an unknown persona', () => {
    const prompt = buildCoachSystemPrompt({ age: 25, persona: 'robot-overlord' })
    expect(prompt.toLowerCase()).toContain('hype')
  })
})
