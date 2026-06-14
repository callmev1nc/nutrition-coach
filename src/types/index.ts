export interface UserProfile {
  id: string;
  email: string;
  age: number;
  gender: 'male' | 'female';
  height_cm: number;
  weight_kg: number;
  body_fat_percent?: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  training_days_per_week: number;
  office_job: boolean;
  goal_weight_kg: number;
  weekly_budget?: number;
  food_preferences?: string;
  medical_limitations?: string;
  joint_pain_areas?: string;
  sleep_quality: 'poor' | 'fair' | 'good' | 'excellent';
  calorie_target?: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  // Teen Mode fields (added in migration 00002)
  xp_total?: number;
  level?: number;
  streak_days?: number;
  streak_freezes?: number;
  last_active_date?: string;
  theme?: string;
  coach_persona?: string;
  avatar_emoji?: string;
  badges?: string[];
  mood_today?: number | null;
  energy_today?: number | null;
}

export interface XpEvent {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  awarded_for_date: string;
  created_at: string;
}

export interface ProgressSummary {
  xp_total: number;
  level: number;
  streak_days: number;
  streak_freezes: number;
  theme: string;
  coach_persona: string;
  avatar_emoji: string;
  mood_today: number | null;
  energy_today: number | null;
  leveled_up?: boolean;
  previous_level?: number;
}

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  body_fat_percent?: number;
  notes?: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  date: string;
  water_ml: number;
  sleep_hours: number;
  steps: number;
  workout_completed: boolean;
  calories_consumed?: number;
  mood?: number | null;
  energy?: number | null;
  created_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  meals: Meal[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
}

export interface Meal {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CoachMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface WorkoutDay {
  id: string;
  user_id: string;
  week: number;
  day: number;
  exercises: Exercise[];
  completed: boolean;
  created_at: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  duration_seconds?: number;
  rest_seconds: number;
  pace: 'slow' | 'medium' | 'fast';
  notes?: string;
}

export interface CalculationResult {
  bmr_mifflin: number;
  bmr_katch: number | null;
  tdee: number;
  maintenance: number;
  mild_deficit: number;
  moderate_deficit: number;
  aggressive_deficit: number;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_cal: number;
  carbs_cal: number;
  fat_cal: number;
}

export interface ProgressPrediction {
  current_weight: number;
  goal_weight: number;
  weekly_rate: number;
  estimated_weeks: number;
  estimated_date: string;
  probability: number;
  forecast_30: PredictionPoint[];
  forecast_90: PredictionPoint[];
}

export interface PredictionPoint {
  week: number;
  predicted_weight: number;
  date: string;
}

export interface GroceryItem {
  name: string;
  category: 'produce' | 'protein' | 'dairy' | 'pantry' | 'frozen';
  quantity: string;
  estimated_cost: number;
  meal_usage: string;
}

export interface SleepScheduleItem {
  time: string;
  activity: string;
  duration_minutes: number;
  category: 'wind_down' | 'hygiene' | 'environment' | 'relaxation' | 'sleep_prep';
}
