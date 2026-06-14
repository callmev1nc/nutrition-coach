/**
 * Strict input sanitizer for profile writes.
 *
 * The old /api/profile route ran `serviceClient.from('profiles').upsert(body)`
 * with the raw request JSON — letting any client write any column (and bypass
 * RLS via the service key). This whitelist rejects unknown keys, clamps numeric
 * ranges, and deliberately OMITS gameable fields (xp_total, level, streak_*,
 * badges, last_active_date) so progress can only change through the secured
 * award_xp() function.
 *
 * Pure functions — fully unit-testable.
 */

export interface SanitizedProfile {
  age?: number | null;
  gender?: 'male' | 'female' | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  body_fat_percent?: number | null;
  activity_level?: string | null;
  training_days_per_week?: number;
  office_job?: boolean;
  goal_weight_kg?: number | null;
  weekly_budget?: number | null;
  food_preferences?: string | null;
  medical_limitations?: string | null;
  joint_pain_areas?: string | null;
  sleep_quality?: string | null;
  onboarding_completed?: boolean;
  calorie_target?: number | null;
  theme?: string;
  coach_persona?: string;
  avatar_emoji?: string;
  mood_today?: number | null;
  energy_today?: number | null;
}

const ACTIVITY_LEVELS = new Set(['sedentary', 'light', 'moderate', 'active', 'very_active']);
const SLEEP_QUALITIES = new Set(['poor', 'fair', 'good', 'excellent']);
const THEMES = new Set(['volt', 'sunset', 'mint', 'mono', 'bloom']);
const PERSONAS = new Set(['hype', 'bestie', 'coach', 'chill']);

const MAX_TEXT = 2000;

function boundedNum(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n)) return null;
  // Reject out-of-range instead of silently clamping — a health app must not
  // mutate a clearly-invalid value (e.g. weight 5kg) into a valid-looking one.
  if (n < min || n > max) return null;
  return n;
}

function boundedInt(v: unknown, min: number, max: number): number | null {
  const n = boundedNum(v, min, max);
  return n === null ? null : Math.round(n);
}

function cleanText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.slice(0, MAX_TEXT).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface SanitizeResult {
  ok: boolean;
  data?: SanitizedProfile;
  error?: string;
}

/**
 * Sanitize a raw profile payload. Returns `{ ok, data }` on success or
 * `{ ok: false, error }` if a provided field is present but invalid.
 * Unknown fields are silently dropped (not an error).
 */
export function sanitizeProfileInput(body: unknown): SanitizeResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid payload.' };
  }
  const b = body as Record<string, unknown>;
  const out: SanitizedProfile = {};

  // Each field is optional; only validate when present.
  if ('age' in b && b.age !== undefined && b.age !== null && b.age !== '') {
    const age = boundedInt(b.age, 10, 120);
    if (age === null) return { ok: false, error: 'Age must be between 10 and 120.' };
    out.age = age;
  }

  if ('gender' in b && b.gender) {
    if (!['male', 'female'].includes(b.gender as string)) {
      return { ok: false, error: 'Invalid gender.' };
    }
    out.gender = b.gender as 'male' | 'female';
  }

  if ('height_cm' in b && b.height_cm !== undefined && b.height_cm !== null && b.height_cm !== '') {
    const h = boundedNum(b.height_cm, 50, 300);
    if (h === null) return { ok: false, error: 'Height must be between 50 and 300 cm.' };
    out.height_cm = h;
  }

  if ('weight_kg' in b && b.weight_kg !== undefined && b.weight_kg !== null && b.weight_kg !== '') {
    const w = boundedNum(b.weight_kg, 20, 400);
    if (w === null) return { ok: false, error: 'Weight must be between 20 and 400 kg.' };
    out.weight_kg = w;
  }

  if ('body_fat_percent' in b && b.body_fat_percent !== undefined && b.body_fat_percent !== null && b.body_fat_percent !== '') {
    const bf = boundedNum(b.body_fat_percent, 2, 70);
    if (bf === null) return { ok: false, error: 'Body fat % must be between 2 and 70.' };
    out.body_fat_percent = bf;
  }

  if ('activity_level' in b && b.activity_level) {
    if (!ACTIVITY_LEVELS.has(b.activity_level as string)) {
      return { ok: false, error: 'Invalid activity level.' };
    }
    out.activity_level = b.activity_level as string;
  }

  if ('training_days_per_week' in b && b.training_days_per_week !== undefined && b.training_days_per_week !== null) {
    const td = boundedInt(b.training_days_per_week, 0, 7);
    if (td === null) return { ok: false, error: 'Training days must be between 0 and 7.' };
    out.training_days_per_week = td;
  }

  if ('office_job' in b && b.office_job !== undefined && b.office_job !== null) {
    out.office_job = Boolean(b.office_job);
  }

  if ('goal_weight_kg' in b && b.goal_weight_kg !== undefined && b.goal_weight_kg !== null && b.goal_weight_kg !== '') {
    const gw = boundedNum(b.goal_weight_kg, 20, 400);
    if (gw === null) return { ok: false, error: 'Goal weight must be between 20 and 400 kg.' };
    out.goal_weight_kg = gw;
  }

  if ('weekly_budget' in b && b.weekly_budget !== undefined && b.weekly_budget !== null && b.weekly_budget !== '') {
    const wb = boundedNum(b.weekly_budget, 0, 100000);
    if (wb === null) return { ok: false, error: 'Weekly budget out of range.' };
    out.weekly_budget = wb;
  }

  if ('food_preferences' in b) out.food_preferences = cleanText(b.food_preferences);
  if ('medical_limitations' in b) out.medical_limitations = cleanText(b.medical_limitations);
  if ('joint_pain_areas' in b) out.joint_pain_areas = cleanText(b.joint_pain_areas);

  if ('sleep_quality' in b && b.sleep_quality) {
    if (!SLEEP_QUALITIES.has(b.sleep_quality as string)) {
      return { ok: false, error: 'Invalid sleep quality.' };
    }
    out.sleep_quality = b.sleep_quality as string;
  }

  if ('onboarding_completed' in b && b.onboarding_completed !== undefined && b.onboarding_completed !== null) {
    out.onboarding_completed = Boolean(b.onboarding_completed);
  }

  if ('calorie_target' in b && b.calorie_target !== undefined && b.calorie_target !== null && b.calorie_target !== '') {
    const ct = boundedInt(b.calorie_target, 800, 10000);
    if (ct === null) return { ok: false, error: 'Calorie target out of range.' };
    out.calorie_target = ct;
  }

  if ('theme' in b && b.theme) {
    if (!THEMES.has(b.theme as string)) return { ok: false, error: 'Invalid theme.' };
    out.theme = b.theme as string;
  }

  if ('coach_persona' in b && b.coach_persona) {
    if (!PERSONAS.has(b.coach_persona as string)) return { ok: false, error: 'Invalid coach persona.' };
    out.coach_persona = b.coach_persona as string;
  }

  if ('avatar_emoji' in b && b.avatar_emoji !== undefined && b.avatar_emoji !== null) {
    // Emoji(s) — cap length to keep it sane.
    const e = String(b.avatar_emoji).slice(0, 8);
    out.avatar_emoji = e;
  }

  if ('mood_today' in b && b.mood_today !== undefined && b.mood_today !== null) {
    const m = boundedInt(b.mood_today, 1, 5);
    if (m === null) return { ok: false, error: 'Mood must be between 1 and 5.' };
    out.mood_today = m;
  }

  if ('energy_today' in b && b.energy_today !== undefined && b.energy_today !== null) {
    const en = boundedInt(b.energy_today, 1, 5);
    if (en === null) return { ok: false, error: 'Energy must be between 1 and 5.' };
    out.energy_today = en;
  }

  return { ok: true, data: out };
}
