import type { CalculationResult } from '@/types';

/**
 * Calculate BMR using the Mifflin-St Jeor equation.
 */
export function calculateBMR_Mifflin(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: 'male' | 'female'
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate BMR using the Katch-McArdle equation.
 * Returns null if body_fat_percent is not provided.
 */
export function calculateBMR_Katch(
  weight_kg: number,
  body_fat_percent: number | null | undefined
): number | null {
  if (body_fat_percent == null) {
    return null;
  }
  const leanMass = weight_kg * (1 - body_fat_percent / 100);
  return 370 + 21.6 * leanMass;
}

/**
 * Get the activity multiplier for a given activity level.
 */
export function getActivityMultiplier(
  level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return multipliers[level] ?? 1.55;
}

/**
 * Calculate Total Daily Energy Expenditure.
 * Applies a -100 kcal adjustment for office workers.
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
  officeJob: boolean,
  _trainingDays: number
): number {
  const multiplier = getActivityMultiplier(activityLevel);
  let tdee = bmr * multiplier;
  if (officeJob) {
    tdee -= 100;
  }
  return Math.round(tdee);
}

/**
 * Deficit percentages by goal intensity.
 */
const DEFICIT_PERCENT: Record<'mild' | 'moderate' | 'aggressive', number> = {
  mild: 0.10,
  moderate: 0.20,
  aggressive: 0.25,
};

/**
 * Calculate macronutrient split for a target calorie level.
 * - Protein: 2.2g per kg body weight
 * - Fat: 25% of calories
 * - Carbs: remaining calories
 */
export function calculateMacros(
  targetCalories: number,
  weight_kg: number,
  goal: 'mild' | 'moderate' | 'aggressive'
): {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_cal: number;
  carbs_cal: number;
  fat_cal: number;
} {
  const deficit = DEFICIT_PERCENT[goal];
  const adjustedCalories = targetCalories * (1 - deficit);

  const protein_g = +(2.2 * weight_kg).toFixed(1);
  const protein_cal = Math.round(protein_g * 4);

  const fat_cal = Math.round(adjustedCalories * 0.25);
  const fat_g = +(fat_cal / 9).toFixed(1);

  const carbs_cal = Math.round(adjustedCalories - protein_cal - fat_cal);
  const carbs_g = +(carbs_cal / 4).toFixed(1);

  return { protein_g, carbs_g, fat_g, protein_cal, carbs_cal, fat_cal };
}

/**
 * Run the full suite of calorie and macro calculations.
 * Defaults to a moderate deficit.
 */
export function calculateAll(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: 'male' | 'female',
  body_fat_percent: number | null | undefined,
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
  office_job: boolean,
  training_days: number
): CalculationResult {
  const bmr_mifflin = Math.round(
    calculateBMR_Mifflin(weight_kg, height_cm, age, gender)
  );

  const bmrKatchRaw = calculateBMR_Katch(weight_kg, body_fat_percent);
  const bmr_katch = bmrKatchRaw !== null ? Math.round(bmrKatchRaw) : null;

  // Prefer Katch-McArdle BMR when body fat is available; fall back to Mifflin
  const bmr = bmr_katch ?? bmr_mifflin;

  const tdee = calculateTDEE(bmr, activity_level, office_job, training_days);

  const maintenance = tdee;
  const mild_deficit = Math.round(maintenance * 0.9);
  const moderate_deficit = Math.round(maintenance * 0.8);
  const aggressive_deficit = Math.round(maintenance * 0.75);

  const target_calories = moderate_deficit;

  const macros = calculateMacros(target_calories, weight_kg, 'moderate');

  return {
    bmr_mifflin,
    bmr_katch,
    tdee,
    maintenance,
    mild_deficit,
    moderate_deficit,
    aggressive_deficit,
    target_calories,
    ...macros,
  };
}
