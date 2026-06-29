import { describe, it, expect } from 'vitest'
import {
  xpForLevel,
  levelFromXp,
  xpProgress,
  xpForAction,
  XP_REWARDS,
  currentStreak,
  isStreakDay,
  earnedBadges,
  newlyEarned,
} from '../gamification'

describe('xpForLevel / level curve', () => {
  it('matches the documented curve: L2=100, L3=300, L4=600, L5=1000', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(300)
    expect(xpForLevel(4)).toBe(600)
    expect(xpForLevel(5)).toBe(1000)
    expect(xpForLevel(6)).toBe(1500)
  })
})

describe('levelFromXp', () => {
  it('places boundaries correctly', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(99)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(299)).toBe(2)
    expect(levelFromXp(300)).toBe(3)
    expect(levelFromXp(600)).toBe(4)
    expect(levelFromXp(1500)).toBe(6)
  })
  it('never goes below level 1', () => {
    expect(levelFromXp(-50)).toBe(1)
  })
})

describe('xpProgress', () => {
  it('reports 0% at the exact level threshold', () => {
    const p = xpProgress(100) // exactly level 2 start
    expect(p.level).toBe(2)
    expect(p.intoLevel).toBe(0)
    expect(p.toNext).toBe(200)
    expect(p.pct).toBe(0)
  })
  it('reports 50% halfway through level 2', () => {
    const p = xpProgress(200) // 100 into a 200-wide band
    expect(p.level).toBe(2)
    expect(p.pct).toBe(50)
    expect(p.toNext).toBe(100)
  })
})

describe('xpForAction', () => {
  it('returns the configured reward', () => {
    expect(xpForAction('complete_workout')).toBe(50)
    expect(xpForAction('log_habits')).toBe(15)
  })
  it('matches the server-side reward map in the SQL migration', () => {
    // These MUST stay in sync with award_xp() in 00011_add_log_food_xp.sql.
    expect(XP_REWARDS).toEqual({
      log_weight: 10,
      log_habits: 15,
      complete_workout: 50,
      log_mood: 5,
      chat_coach: 10,
      generate_meal_plan: 20,
      finish_workout_day: 30,
      body_fat_measure: 10,
      log_food: 10,
      log_water: 10,
    })
  })
})

describe('streaks', () => {
  it('counts consecutive qualifying days from most-recent-first', () => {
    const logs = [
      { water_ml: 2500, sleep_hours: 8, steps: 6000 },
      { water_ml: 2100, sleep_hours: 7, steps: 5000 },
      { water_ml: 1000, sleep_hours: 6, steps: 3000 }, // breaks
      { water_ml: 3000, sleep_hours: 9, steps: 10000 },
    ]
    expect(currentStreak(logs)).toBe(2)
  })
  it('isStreakDay enforces all three minimums', () => {
    expect(isStreakDay({ water_ml: 2000, sleep_hours: 7, steps: 5000 })).toBe(true)
    expect(isStreakDay({ water_ml: 2000, sleep_hours: 6.9, steps: 5000 })).toBe(false)
    expect(isStreakDay({ water_ml: 1999, sleep_hours: 7, steps: 5000 })).toBe(false)
    expect(isStreakDay({ water_ml: 2000, sleep_hours: 7, steps: 4999 })).toBe(false)
  })
})

describe('badges', () => {
  const baseStats = {
    streak: 0,
    workouts: 0,
    weightLostKg: 0,
    level: 1,
    coachMessages: 0,
    mealPlans: 0,
    bodyFatMeasures: 0,
  }
  it('earns nothing with empty stats', () => {
    expect(earnedBadges(baseStats)).toHaveLength(0)
  })
  it('earns progression badges as stats grow', () => {
    const stats = { ...baseStats, streak: 7, workouts: 5, level: 5, weightLostKg: 1 }
    const earned = earnedBadges(stats).map((b) => b.id)
    expect(earned).toContain('streak_3')
    expect(earned).toContain('streak_7')
    expect(earned).toContain('first_workout')
    expect(earned).toContain('workout_5')
    expect(earned).toContain('weight_first')
    expect(earned).toContain('level_5')
    expect(earned).not.toContain('streak_21')
  })
  it('newlyEarned returns only previously-unknown badge ids', () => {
    const stats = { ...baseStats, workouts: 1 }
    expect(newlyEarned(stats, [])).toEqual(['first_workout'])
    // Once known, it is no longer "new".
    expect(newlyEarned(stats, ['first_workout'])).toEqual([])
  })
})
