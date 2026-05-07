import { Meal } from "../ml/mealData";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const callGroq = async (prompt: string): Promise<string> => {
  await delay(300);
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error("Groq error:", JSON.stringify(err));
    throw new Error(err?.error?.message || "Groq request failed");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from AI.";
};

const buildMealContext = (diet: string, budget: number) =>
  `You are a Nigerian meal planning assistant. The user is on a ${diet} diet with a daily budget of ₦${budget}. The app has 86 Nigerian meals including: Jollof Rice, Fried Rice, Pounded Yam, Egusi Soup, Amala, Beans, Akara, Moi Moi, Suya, Grilled Chicken, Pepper Soup, Plantain, Oatmeal, and snacks like Gala, Puff-puff, Chin-chin, Groundnut, Plantain Chips. Meals are categorised as breakfast, lunch, dinner, or snack. Always give short, practical, friendly responses. Keep responses under 100 words.`;

export const askMealAssistant = async (question: string, diet: string, budget: number): Promise<string> => {
  const prompt = `${buildMealContext(diet, budget)}\n\nUser question: "${question}"\n\nAnswer helpfully and specifically. Mention Nigerian options from the app dataset. Keep it under 80 words.`;
  return callGroq(prompt);
};

export const explainMealPlan = async (diet: string, budget: number, totalCost: number, totalCalories: number, mealsPerDay: number, allergens: string[]): Promise<string> => {
  const allergenNote = allergens.length > 0 ? `The user is allergic to: ${allergens.join(", ")}.` : "";
  const prompt = `${buildMealContext(diet, budget)}\n\nA 7-day ${diet} meal plan was just generated:\n- Daily budget: ₦${budget}\n- Meals per day: ${mealsPerDay}\n- Total weekly cost: ₦${totalCost.toLocaleString()}\n- Total weekly calories: ${totalCalories.toLocaleString()} kcal\n${allergenNote}\n\nWrite a short 2-3 sentence explanation of why this plan is good for the user. Mention the diet type, budget efficiency, and health benefits. Be encouraging. Under 80 words.`;
  return callGroq(prompt);
};

export const getSmartSwap = async (currentMeal: Meal, alternatives: Meal[], diet: string, budget: number, dailyCalorieGoal: number): Promise<{ meal: Meal; reason: string }> => {
  if (alternatives.length === 0) throw new Error("No alternatives available");
  const altList = alternatives.slice(0, 5).map((m, i) => `${i + 1}. ${m.name} (₦${m.price}, ${m.calories} kcal, ${m.protein_g}g protein)`).join("\n");
  const prompt = `${buildMealContext(diet, budget)}\n\nThe user wants to swap: "${currentMeal.name}" (₦${currentMeal.price}, ${currentMeal.calories} kcal)\nDaily calorie goal: ${dailyCalorieGoal} kcal\n\nAvailable alternatives:\n${altList}\n\nReply with ONLY a JSON object, nothing else:\n{"index": 1, "reason": "one sentence reason"}\n\nPick the best alternative. Index is 1-based.`;
  const response = await callGroq(prompt);
  try {
    const clean = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const chosenMeal = alternatives[Math.min(parsed.index - 1, alternatives.length - 1)];
    return { meal: chosenMeal, reason: parsed.reason };
  } catch {
    const fallback = alternatives[Math.floor(Math.random() * alternatives.length)];
    return { meal: fallback, reason: "Selected as a nutritious alternative for your diet." };
  }
};