import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { buildCoachSystemPrompt, buildMealPersonaInstruction } from './ai-safety';
import { buildPreferenceBlock, type PreferenceRow } from './preference-block';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Build the age-aware, persona-aware system instruction from a user profile.
 * The profile is `Record<string, unknown>` from Supabase; we read the fields we
 * need defensively. See src/lib/ai-safety.ts for the safety rules — they branch
 * on age so minors never get adult calorie floors or unsafe advice.
 */
function coachSystemInstruction(userProfile: Record<string, unknown>): string {
  return buildCoachSystemPrompt({
    age: userProfile.age as number | undefined,
    gender: userProfile.gender as string | undefined,
    persona: userProfile.coach_persona as string | undefined,
  });
}

function handleError(operation: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Gemini AI error (${operation}): ${message}`);
}

export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Get a personalized coaching response using conversation history and user profile.
 */
export async function getCoachResponse(
  messages: ChatMessage[],
  userProfile: Record<string, unknown>
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: coachSystemInstruction(userProfile),
    });

    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : ('user' as 'user' | 'model'),
      parts: [{ text: msg.content }],
    }));

    const lastUserMessage = messages[messages.length - 1];

    const chat = model.startChat({
      history,
    });

    const profileContext = `\n\n[User Profile Context: ${JSON.stringify(userProfile)}]`;
    const result = await chat.sendMessage(lastUserMessage.content + profileContext);

    return result.response.text();
  } catch (error) {
    handleError('getCoachResponse', error);
  }
}

/**
 * Stream a personalized coaching response token-by-token.
 */
export async function* streamCoachResponse(
  messages: ChatMessage[],
  userProfile: Record<string, unknown>
): AsyncGenerator<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: coachSystemInstruction(userProfile),
    });

    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : ('user' as 'user' | 'model'),
      parts: [{ text: msg.content }],
    }));

    const lastUserMessage = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const profileContext = `\n\n[User Profile Context: ${JSON.stringify(userProfile)}]`;
    const result = await chat.sendMessageStream(lastUserMessage.content + profileContext);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  } catch (error) {
    handleError('streamCoachResponse', error);
  }
}

/**
 * Parse a free-text food description into structured food items.
   *
   * Returns JSON: { items: [{ name, quantity, unit, cooking_method?, oil?, fat_trimmed?, is_meat? }] }
   * The AI MUST return ZERO nutrition numbers — they come from USDA.
   */
  export async function parseFoodSentence(text: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `Parse the following food description into structured food items.

  Rules:
  - Split each distinct food into its own item.
  - Detect cooking method: grilled, baked, fried, steamed, boiled, roasted, sautéed, or raw.
  - Detect oil/fat added (type and amount, e.g. "1 tsp olive oil").
  - For meats, detect if fat was trimmed.
  - Return ONLY descriptors. NEVER return calorie or macro numbers.

  Description: "${text}"

  Return ONLY valid JSON with this structure:
  {
    "items": [
      {
        "name": "food name",
        "quantity": number (grams or count),
        "unit": "g" | "ml" | "tsp" | "tbsp" | "cup" | "piece" | "slice" | "serving",
        "cooking_method": "raw" | "grilled" | "baked" | "fried" | "steamed" | "boiled" | "roasted" | "sauteed" | null,
        "oil": { "name": "olive oil", "amount": 5, "unit": "ml" } | null,
        "fat_trimmed": boolean | null,
        "is_meat": boolean
      }
    ]
  }`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      handleError('parseFoodSentence', error);
    }
  }

  /**
   * Generate a full-day meal plan matching macro targets within budget.
 *
 * Returns JSON: { meals: [{ name, type, foods: [{name, quantity, calories, protein, carbs, fat}], calories, protein, carbs, fat }] }
 */
export async function generateMealPlan(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  preferences: string,
  budget: number,
  ctx?: MealPlanContext
): Promise<string> {
  try {
    const systemInstruction = ctx
      ? buildMealPersonaInstruction({ age: ctx.age, gender: ctx.gender, persona: ctx.persona })
      : undefined;

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.4,
        // Cap output so generation finishes fast (target <30s) and never
        // truncates/502s the way an unbounded response can.
        maxOutputTokens: 1400,
        responseMimeType: 'application/json',
      },
      systemInstruction,
    });

    const prompt = buildMealPrompt(calories, protein, carbs, fat, preferences, budget, ctx);

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    handleError('generateMealPlan', error);
  }
}

/**
 * Generate a 21-day low-impact workout program.
 *
 * Returns JSON with exercises array.
 */
export async function generateWorkoutPlan(
  profile: Record<string, unknown>
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.5,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Create a 21-day low-impact workout program with the following constraints:
- No jumping exercises
- Exercises can be done with a chair and a mat only
- Maximum 25 minutes per session
- Suitable for beginners to intermediate

User profile: ${JSON.stringify(profile)}

Return ONLY valid JSON with this structure:
{
  "programName": "string",
  "duration": "21 days",
  "exercises": [
    {
      "day": 1,
      "title": "Workout title",
      "duration": "20 min",
      "difficulty": "beginner" | "intermediate",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": "12" | "30 sec",
          "restBetweenSets": "30 sec",
          "instructions": "Step-by-step instructions",
          "targetMuscles": ["muscle group"]
        }
      ],
      "warmup": "Description of warm-up",
      "cooldown": "Description of cool-down"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    handleError('generateWorkoutPlan', error);
  }
}

/**
 * Two-phase streaming meal plan generation.
 *
 * Phase A: sends a prompt for meal names + types + per-meal macro budgets (~120 tokens).
 *           Emits a `__PHASE_A__` marker + JSON before continuing to Phase B.
 * Phase B: streams the full foods[] array (~700 tokens).
 *
 * The hard token cap (maxOutputTokens: 1400) and `responseSchema` required fields
 * ensure truncation fails-closed rather than yielding partial JSON.
 */
export async function* generateMealPlanStream(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  preferences: string,
  budget: number,
  ctx?: MealPlanContext
): AsyncGenerator<string> {
  try {
    const systemInstruction = ctx
      ? buildMealPersonaInstruction({ age: ctx.age, gender: ctx.gender, persona: ctx.persona })
      : undefined;

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1400,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            meals: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  type: { type: SchemaType.STRING },
                  calories: { type: SchemaType.NUMBER },
                  protein: { type: SchemaType.NUMBER },
                  carbs: { type: SchemaType.NUMBER },
                  fat: { type: SchemaType.NUMBER },
                  foods: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        name: { type: SchemaType.STRING },
                        quantity: { type: SchemaType.STRING },
                        calories: { type: SchemaType.NUMBER },
                        protein: { type: SchemaType.NUMBER },
                        carbs: { type: SchemaType.NUMBER },
                        fat: { type: SchemaType.NUMBER },
                      },
                      required: ['name', 'quantity', 'calories', 'protein', 'carbs', 'fat'],
                    },
                  },
                },
                required: ['name', 'type', 'foods', 'calories', 'protein', 'carbs', 'fat'],
              },
            },
          },
          required: ['meals'],
        },
      },
      systemInstruction,
    });

    // Single-phase stream: emit the complete JSON meal plan as it is generated.
    // The hard token cap + required-field responseSchema make truncation
    // fail-closed (a parse error lets the route retry / fall back), and
    // streaming gets first bytes to the client in ~1-2s instead of a blocking
    // 18-35s wait.
    const result = await model.generateContentStream(
      buildMealPrompt(calories, protein, carbs, fat, preferences, budget, ctx)
    );

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  } catch (error) {
    handleError('generateMealPlanStream', error);
  }
}

export interface MealPlanContext {
  persona?: string;
  age?: number;
  gender?: string;
  learnedPreferences?: PreferenceRow[];
}

export function buildMealPrompt(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  preferences: string,
  budget: number,
  ctx?: MealPlanContext
): string {
  const prefBlock = ctx?.learnedPreferences
    ? buildPreferenceBlock(ctx.learnedPreferences)
    : '';

  return `Generate a full day meal plan with the following requirements:

Target macros:
- Calories: ${calories} kcal
- Protein: ${protein}g
- Carbs: ${carbs}g
- Fat: ${fat}g

Dietary preferences: ${preferences}
Daily budget: $${budget.toFixed(2)}

${prefBlock}

Include 4 meals: breakfast, lunch, dinner, and a snack.
Distribute macros reasonably across meals.
Use affordable, accessible ingredients.

Return ONLY valid JSON with this exact structure:
{
  "meals": [
    {
      "name": "Meal name",
      "type": "breakfast" | "lunch" | "dinner" | "snack",
      "foods": [
        {
          "name": "Food item",
          "quantity": "e.g. 150g, 1 cup",
          "calories": 0,
          "protein": 0,
          "carbs": 0,
          "fat": 0
        }
      ],
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ]
}`;
}

/**
 * Generate a short persona-voiced nudge comparing the planned meals with what was
 * actually logged in the food diary.
 */
export async function generatePlanVsActualNudge(
  plan: { calories: number; protein: number; carbs: number; fat: number },
  actual: { calories: number; protein: number; carbs: number; fat: number },
  ctx?: MealPlanContext
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 120,
        responseMimeType: 'application/json',
      },
      systemInstruction: buildMealPersonaInstruction({
        age: ctx?.age,
        gender: ctx?.gender,
        persona: ctx?.persona,
      }),
    });

    const delta = actual.calories - plan.calories;
    const prompt = `Compare the planned vs actual intake and generate a short nudge.

Planned: ${JSON.stringify(plan)}
Actual: ${JSON.stringify(actual)}
Delta: ${delta > 0 ? '+' : ''}${delta} kcal

Return JSON:
{
  "headline": "short title (under 50 chars)",
  "body": "brief nudge (under 120 chars)",
  "tone": "${delta < -plan.calories * 0.15 ? 'nudge' : delta > plan.calories * 0.15 ? 'redirect' : 'celebrate'}",
  "delta_calories": ${delta}
}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    handleError('generatePlanVsActualNudge', error);
  }
}

/**
 * Generate a categorized grocery list from a meal plan within budget.
 *
 * Returns JSON organized by category with estimated costs.
 */
export async function generateGroceryList(
  mealPlan: Record<string, unknown>,
  budget: number,
  ctx?: MealPlanContext
): Promise<string> {
  try {
    const prefBlock = ctx?.learnedPreferences
      ? buildPreferenceBlock(ctx.learnedPreferences)
      : '';

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
      systemInstruction: ctx
        ? buildMealPersonaInstruction({ age: ctx.age, gender: ctx.gender, persona: ctx.persona })
        : undefined,
    });

    const prompt = `Generate a weekly grocery list based on the following meal plan.
Budget: $${budget.toFixed(2)}

Meal Plan: ${JSON.stringify(mealPlan)}

${prefBlock}

Organize items by category and include estimated costs.
Consolidate duplicate ingredients across meals into single entries with total quantities.

Return ONLY valid JSON with this structure:
{
  "categories": [
    {
      "name": "produce" | "protein" | "dairy" | "pantry" | "frozen",
      "items": [
        {
          "name": "Item name",
          "quantity": "Total quantity needed",
          "estimatedCost": 0.00,
          "unit": "unit of measure"
        }
      ],
      "totalEstimatedCost": 0.00
    }
  ],
  "totalEstimatedCost": 0.00,
  "withinBudget": true
}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    handleError('generateGroceryList', error);
  }
}
