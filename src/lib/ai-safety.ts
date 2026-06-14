/**
 * Age-aware AI safety for a nutrition app that accepts users as young as 10.
 *
 * The previous coach prompt hard-coded adult calorie floors (1200F / 1500M) with
 * no awareness of age. A 13-year-old could be told to eat 1200 cal. This module
 * branches every safety rule on the user's age so minors get growth-first,
 * higher-floor guidance and explicit guardrails.
 *
 * Pure functions only — fully unit-testable.
 */

export type AgeBand = 'child' | 'teen' | 'adult';

export type CoachPersona = 'hype' | 'bestie' | 'coach' | 'chill';

export interface SafetyInput {
  age?: number | null;
  gender?: 'male' | 'female' | string | null;
  persona?: CoachPersona | string | null;
}

export const ADULT = 18;
export const TEEN_START = 13;

export function isMinor(age?: number | null): boolean {
  return typeof age === 'number' && age > 0 && age < ADULT;
}

export function ageBand(age?: number | null): AgeBand {
  if (typeof age !== 'number' || age <= 0) return 'adult';
  if (age < TEEN_START) return 'child';
  if (age < ADULT) return 'teen';
  return 'adult';
}

/**
 * Minimum daily calories the coach may ever recommend, by age + gender.
 * Teens get growth-aware floors well above the adult minimums.
 */
export function calorieFloorFor(
  age?: number | null,
  gender?: 'male' | 'female' | string | null
): number {
  const band = ageBand(age);
  const female = gender === 'female';
  if (band === 'child') return 1600; // young children: never cut calories
  if (band === 'teen') return female ? 1800 : 2100; // teens: growth-first floors
  return female ? 1200 : 1500; // adults: standard minimums
}

/**
 * The maximum deficit (% under maintenance) the coach may recommend.
 * Minors should not run aggressive deficits.
 */
export function maxDeficitPercent(age?: number | null): number {
  const band = ageBand(age);
  if (band === 'child') return 0; // no deficit — focus on maintenance + growth
  if (band === 'teen') return 0.1; // mild only
  return 0.25; // adults: up to aggressive
}

/** Clamp a computed calorie target up to the safe floor for this user. */
export function enforceCalorieFloor(
  targetCalories: number,
  age?: number | null,
  gender?: 'male' | 'female' | string | null
): number {
  const floor = calorieFloorFor(age, gender);
  if (!Number.isFinite(targetCalories)) return floor;
  return Math.max(Math.round(targetCalories), floor);
}

const PERSONA_TONES: Record<CoachPersona, string> = {
  hype: 'You are a high-energy hype coach. Use punchy, encouraging language, occasional emojis, and celebrate wins loudly. Keep it real but motivating.',
  bestie: 'You are a supportive best friend. Warm, casual, non-judgmental, chatty. Use everyday language like you are texting a friend.',
  coach: 'You are a calm, knowledgeable coach. Clear, structured, evidence-led, confidence-inspiring. Not stiff — just trustworthy.',
  chill: 'You are a laid-back, low-pressure guide. Relaxed, reassuring, anti-anxiety. Never pushy. Small steady steps.',
};

function personaTone(persona?: CoachPersona | string | null): string {
  if (persona && persona in PERSONA_TONES) return PERSONA_TONES[persona as CoachPersona];
  return PERSONA_TONES.hype;
}

const COMMON_RULES = `- Give personalized, practical advice using the user's profile data.
- Always use metric units (kg, cm, ml, kJ/kcal).
- Keep responses concise and skimmable — short paragraphs or bullets.
- If the user shows signs of an eating disorder, self-harm, or distress, respond with compassion and gently encourage talking to a trusted adult, parent, doctor, or a local helpline. Do not diagnose.`;

const MINOR_RULES = (floor: number) => `
SAFETY — THIS USER IS UNDER 18. These rules override everything else:
- This user is still growing. NEVER recommend a calorie deficit below ${floor} kcal/day, and prefer maintenance / small surpluses and building healthy habits over weight loss.
- NEVER recommend weight-loss supplements, fat burners, steroids, laxatives, "detoxes", fasting/fad diets, or skipping meals.
- NEVER recommend exercising to exhaustion, training through pain/injury, or punishing workouts for eating.
- Do not make negative comments about the user's body or appearance. Frame changes around health, energy, strength, and feeling good — never on looking "acceptable".
- If the user wants rapid or extreme weight loss, redirect gently toward sustainable habits and suggest talking to a parent/guardian or doctor.`;

const ADULT_RULES = (floor: number) => `
SAFETY:
- Never recommend calorie deficits below ${floor} kcal/day (${`women ≥ 1200 / men ≥ 1500`}).
- Never recommend dangerous practices: steroids, unsafe supplements, extreme fasting, laxatives, or vomiting.
- Prefer sustainable deficits and healthy habits over crash diets.`;

/**
 * Build the full Gemini `systemInstruction` for the coach, branching every safety
 * rule on age and layering the chosen persona's tone.
 */
export function buildCoachSystemPrompt(input: SafetyInput = {}): string {
  const minor = isMinor(input.age);
  const floor = calorieFloorFor(input.age, input.gender);
  const safety = minor ? MINOR_RULES(floor) : ADULT_RULES(floor);
  const tone = personaTone(input.persona);
  return [
    `You are NutriCoach, an AI nutrition & fitness coach inside a mobile app for young people.`,
    tone,
    safety,
    COMMON_RULES,
  ].join('\n\n');
}
