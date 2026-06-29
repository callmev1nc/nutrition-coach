/**
 * Gamification engine — pure functions only (no I/O), so it is fully unit-testable.
 *
 * The level curve MUST stay in sync with the SQL function `award_xp` in
 * supabase/migrations/00002_teen_mode.sql:
 *   level L (L >= 2) requires cumulative XP = 50 * (L - 1) * L
 *   i.e. L2 = 100, L3 = 300, L4 = 600, L5 = 1000, L6 = 1500 ...
 */

/** Cumulative XP required to REACH a given level (level 1 requires 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

/** The level a user is at for a given total XP. */
export function levelFromXp(xp: number): number {
  if (xp < 0) return 1;
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export interface XpProgress {
  level: number;
  /** XP earned since the current level started. */
  intoLevel: number;
  /** Total XP span of the current level band. */
  span: number;
  /** XP still needed to reach the next level. */
  toNext: number;
  /** 0–100 progress through the current level (rounded). */
  pct: number;
}

/** Detailed progress through the current level, for progress bars. */
export function xpProgress(xp: number): XpProgress {
  const safe = Math.max(0, Math.floor(xp));
  const level = levelFromXp(safe);
  const curBase = xpForLevel(level);
  const nextBase = xpForLevel(level + 1);
  const span = nextBase - curBase;
  const intoLevel = safe - curBase;
  const toNext = Math.max(0, nextBase - safe);
  const pct = span > 0 ? Math.min(100, Math.round((intoLevel / span) * 100)) : 0;
  return { level, intoLevel, span, toNext, pct };
}

/** XP granted for each trackable action. Keys are the `reason` stored in xp_events. */
export const XP_REWARDS = {
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
} as const;

export type XpAction = keyof typeof XP_REWARDS;

export function xpForAction(action: XpAction): number {
  return XP_REWARDS[action];
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

/** A habit day "counts" toward a streak when these minimums are met. */
export const STREAK_TARGETS = { water_ml: 2000, sleep_hours: 7, steps: 5000 } as const;

export interface StreakInput {
  water_ml: number;
  sleep_hours: number;
  steps: number;
}

/** Does a single habit log qualify as a "complete" streak day? */
export function isStreakDay(log: StreakInput): boolean {
  return (
    log.water_ml >= STREAK_TARGETS.water_ml &&
    log.sleep_hours >= STREAK_TARGETS.sleep_hours &&
    log.steps >= STREAK_TARGETS.steps
  );
}

/**
 * Current streak length from recent habit logs (most-recent-first), stopping at
 * the first day that didn't qualify. `logs` should already be sorted descending
 * by date.
 */
export function currentStreak(logs: StreakInput[]): number {
  let streak = 0;
  for (const log of logs) {
    if (isStreakDay(log)) streak += 1;
    else break;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface BadgeStats {
  streak: number;
  workouts: number;
  weightLostKg: number;
  level: number;
  coachMessages: number;
  mealPlans: number;
  bodyFatMeasures: number;
}

export interface BadgeDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  /** Returns true when the badge is earned for the given stats. */
  check: (s: BadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_steps', title: 'First Steps', emoji: '👟', description: 'Log your first habit day', check: (s) => s.streak >= 1 },
  { id: 'streak_3', title: 'On a Roll', emoji: '🔥', description: 'Reach a 3-day streak', check: (s) => s.streak >= 3 },
  { id: 'streak_7', title: 'Week Warrior', emoji: '⚡', description: 'Reach a 7-day streak', check: (s) => s.streak >= 7 },
  { id: 'streak_21', title: 'Unstoppable', emoji: '🏆', description: 'Reach a 21-day streak', check: (s) => s.streak >= 21 },
  { id: 'first_workout', title: 'Mover', emoji: '💪', description: 'Finish your first workout', check: (s) => s.workouts >= 1 },
  { id: 'workout_5', title: 'Regular', emoji: '🏃', description: 'Finish 5 workouts', check: (s) => s.workouts >= 5 },
  { id: 'workout_21', title: 'Iron Will', emoji: '🦁', description: 'Finish 21 workouts', check: (s) => s.workouts >= 21 },
  { id: 'weight_first', title: 'First Drop', emoji: '📉', description: 'Lose your first kg', check: (s) => s.weightLostKg >= 1 },
  { id: 'weight_5', title: 'Halfway Hero', emoji: '🎯', description: 'Lose 5 kg', check: (s) => s.weightLostKg >= 5 },
  { id: 'level_5', title: 'Rising Star', emoji: '⭐', description: 'Reach level 5', check: (s) => s.level >= 5 },
  { id: 'level_10', title: 'Legend', emoji: '👑', description: 'Reach level 10', check: (s) => s.level >= 10 },
  { id: 'chatter', title: 'Talk It Out', emoji: '💬', description: 'Chat with your coach 5 times', check: (s) => s.coachMessages >= 5 },
  { id: 'meal_prep', title: 'Meal Prep Pro', emoji: '🍱', description: 'Generate 3 meal plans', check: (s) => s.mealPlans >= 3 },
];

/** All badges earned for the given stats (computed live — never stale). */
export function earnedBadges(stats: BadgeStats): BadgeDef[] {
  return BADGES.filter((b) => b.check(stats));
}

/** Newly earned badge ids vs a previously-known set (for "badge unlocked" toasts). */
export function newlyEarned(stats: BadgeStats, knownIds: string[]): string[] {
  const known = new Set(knownIds);
  return earnedBadges(stats)
    .filter((b) => !known.has(b.id))
    .map((b) => b.id);
}
