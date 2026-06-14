import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildCoachSystemPrompt } from './ai-safety';

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
  budget: number
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Generate a full day meal plan with the following requirements:

Target macros:
- Calories: ${calories} kcal
- Protein: ${protein}g
- Carbs: ${carbs}g
- Fat: ${fat}g

Dietary preferences: ${preferences}
Daily budget: $${budget.toFixed(2)}

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
 * Generate a categorized grocery list from a meal plan within budget.
 *
 * Returns JSON organized by category with estimated costs.
 */
export async function generateGroceryList(
  mealPlan: Record<string, unknown>,
  budget: number
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Generate a weekly grocery list based on the following meal plan.
Budget: $${budget.toFixed(2)}

Meal Plan: ${JSON.stringify(mealPlan)}

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
