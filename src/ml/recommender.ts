import { meals, Meal, DietType, MealType, AllergenType } from "./mealData";

export interface GeneratedMeal extends Meal {
  similarityScore: number;
  day: number;
  slot: MealType;
}

export interface DayPlan {
  day: number;
  meals: GeneratedMeal[];
  dayCost: number;
  dayCalories: number;
}

export interface WeeklyPlan {
  days: DayPlan[];
  totalCost: number;
  totalCalories: number;
  withinBudget: boolean;
  budgetRemaining: number;
  warning?: string;
}

// Slot assignment table — always healthy, always logical
const SLOT_TABLE: Record<number, MealType[]> = {
  1: ["breakfast"],
  2: ["breakfast", "dinner"],
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "snack", "lunch", "dinner"],
  5: ["breakfast", "snack", "lunch", "snack", "dinner"],
  6: ["breakfast", "snack", "lunch", "snack", "dinner", "snack"],
};

// Food category icons based on meal name keywords
export const getMealIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("jollof") || n.includes("fried rice") || n.includes("ofada") || n.includes("rice")) return "🍚";
  if (n.includes("spaghetti") || n.includes("pasta")) return "🍝";
  if (n.includes("yam") || n.includes("amala") || n.includes("pounded") || n.includes("fufu") || n.includes("eba") || n.includes("semolina")) return "🫕";
  if (n.includes("egg") || n.includes("omelette") || n.includes("bacon")) return "🍳";
  if (n.includes("soup") || n.includes("egusi") || n.includes("okra") || n.includes("efo") || n.includes("pepper soup")) return "🍲";
  if (n.includes("chicken") || n.includes("turkey") || n.includes("suya") || n.includes("beef") || n.includes("grilled") || n.includes("tilapia") || n.includes("fish") || n.includes("prawns")) return "🍖";
  if (n.includes("beans") || n.includes("moi moi") || n.includes("akara")) return "🫘";
  if (n.includes("plantain")) return "🍌";
  if (n.includes("salad") || n.includes("abacha") || n.includes("coleslaw")) return "🥗";
  if (n.includes("oatmeal") || n.includes("pap") || n.includes("ogi")) return "🥣";
  if (n.includes("bread") || n.includes("toast")) return "🍞";
  if (n.includes("fruit") || n.includes("banana") || n.includes("coconut")) return "🍉";
  if (n.includes("groundnut") || n.includes("peanut")) return "🥜";
  if (n.includes("gala") || n.includes("biscuit") || n.includes("chin") || n.includes("doughnut") || n.includes("puff") || n.includes("chips")) return "🍪";
  if (n.includes("zobo") || n.includes("yoghurt") || n.includes("avocado slices")) return "🥤";
  if (n.includes("corn")) return "🌽";
  if (n.includes("boiled eggs") || n.includes("smoked fish strips") || n.includes("cucumber")) return "🥚";
  return "🍽️";
};

const proteinToNum = (p: "low" | "medium" | "high") =>
  p === "low" ? 0 : p === "medium" ? 0.5 : 1;

const mealToVector = (meal: Meal, calWeight: number): number[] => [
  Math.min(meal.price / 4000, 1),
  Math.min((meal.calories - 100) / 700, 1) * calWeight,
  proteinToNum(meal.protein),
];

const userToVector = (budgetPerMeal: number, caloriePerMeal: number, calWeight: number): number[] => [
  Math.min(budgetPerMeal / 4000, 1),
  Math.min((caloriePerMeal - 100) / 700, 1) * calWeight,
  0.5,
];

const cosineSimilarity = (a: number[], b: number[]): number => {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
};

const pickBestMeal = (
  candidates: Meal[],
  userVec: number[],
  pickedIds: Set<string>,
  calWeight: number
): (Meal & { similarityScore: number }) | null => {
  const available = candidates.filter((m) => !pickedIds.has(m.id));
  if (available.length === 0) return null;
  const scored = available
    .map((m) => ({ ...m, similarityScore: cosineSimilarity(mealToVector(m, calWeight), userVec) }))
    .sort((a, b) => b.similarityScore - a.similarityScore);
  const top = scored.slice(0, Math.min(2, scored.length));
  return top[Math.floor(Math.random() * top.length)];
};

export const recommendWeeklyMeals = (
  diet: DietType,
  dailyBudget: number,
  mealsPerDay: number,
  dailyCalorieGoal: number = 2000,
  allergens: AllergenType[] = []
): WeeklyPlan => {
  const clampedMeals = Math.min(Math.max(mealsPerDay, 1), 6);
  const slots: MealType[] = SLOT_TABLE[clampedMeals] || SLOT_TABLE[3];
  const budgetPerMeal = dailyBudget / slots.length;
  const caloriePerMeal = dailyCalorieGoal / slots.length;
  const calWeight = dailyCalorieGoal > 2500 ? 1.5 : 1.0;
  const userVec = userToVector(budgetPerMeal, caloriePerMeal, calWeight);

  // Filter eligible meals — no allergens, respects diet
  const eligible = meals.filter((m) => {
    if (m.diet !== diet) return false;
    if (allergens.length > 0 && allergens[0] !== "none") {
      if (m.allergens.some((a) => a !== "none" && allergens.includes(a))) return false;
    }
    return true;
  });

  const days = 7;
  const dayPlans: DayPlan[] = [];
  const globalPickedIds = new Set<string>();
  let totalIncomplete = 0;

  for (let day = 1; day <= days; day++) {
    const dayPickedIds = new Set<string>(globalPickedIds);
    const dayMeals: GeneratedMeal[] = [];
    let remainingBudget = dailyBudget;

    for (const slot of slots) {
      // Get candidates for this slot within remaining budget (with 15% flex)
      let slotCandidates = eligible.filter(
        (m) => m.mealType === slot && m.price <= remainingBudget * 1.15
      );

      // If no candidates in budget, try snacks as fallback
      if (slotCandidates.length === 0 && slot !== "snack") {
        slotCandidates = eligible.filter(
          (m) => m.mealType === "snack" && m.price <= remainingBudget * 1.15
        );
      }

      // If still nothing, try anything affordable
      if (slotCandidates.length === 0) {
        slotCandidates = eligible.filter((m) => m.price <= remainingBudget * 1.15);
      }

      const best = pickBestMeal(slotCandidates, userVec, dayPickedIds, calWeight);
      if (best) {
        dayMeals.push({ ...best, day, slot });
        dayPickedIds.add(best.id);
        remainingBudget -= best.price;
      } else {
        totalIncomplete++;
      }
    }

    // Budget swap — iteratively replace most expensive if over budget
    let iter = 0;
    const dayCostFn = () => dayMeals.reduce((s, m) => s + m.price, 0);
    while (dayCostFn() > dailyBudget && iter < dayMeals.length) {
      dayMeals.sort((a, b) => b.price - a.price);
      const mostExp = dayMeals[0];
      const cheaper = eligible
        .filter((m) => m.price < mostExp.price && m.mealType === mostExp.mealType && !dayPickedIds.has(m.id))
        .sort((a, b) => a.price - b.price)[0];
      if (cheaper) {
        dayPickedIds.delete(mostExp.id);
        dayMeals[0] = {
          ...cheaper,
          similarityScore: cosineSimilarity(mealToVector(cheaper, calWeight), userVec),
          day,
          slot: mostExp.slot,
        };
        dayPickedIds.add(cheaper.id);
      } else break;
      iter++;
    }

    // Rotate global picks every 3 days for variety
    if (day % 3 === 0) globalPickedIds.clear();
    dayMeals.forEach((m) => globalPickedIds.add(m.id));

    dayPlans.push({
      day,
      meals: dayMeals,
      dayCost: dayCostFn(),
      dayCalories: dayMeals.reduce((s, m) => s + m.calories, 0),
    });
  }

  const totalCost = dayPlans.reduce((s, d) => s + d.dayCost, 0);
  const totalCalories = dayPlans.reduce((s, d) => s + d.dayCalories, 0);
  const weeklyBudget = dailyBudget * 7;

  let warning: string | undefined;
  if (totalIncomplete > 0) {
    warning = `⚠ Your budget is very tight. We found what we could — consider increasing it for a more balanced plan.`;
  }

  return {
    days: dayPlans,
    totalCost,
    totalCalories,
    withinBudget: totalCost <= weeklyBudget,
    budgetRemaining: weeklyBudget - totalCost,
    warning,
  };
};

// Single day export for backward compat
export interface GeneratedPlan {
  meals: GeneratedMeal[];
  totalCost: number;
  totalCalories: number;
  withinBudget: boolean;
  budgetRemaining: number;
}

export const recommendMeals = (
  diet: DietType,
  dailyBudget: number,
  mealsPerDay: number,
  dailyCalorieGoal: number = 2000,
  allergens: AllergenType[] = []
): GeneratedPlan => {
  const weekly = recommendWeeklyMeals(diet, dailyBudget, mealsPerDay, dailyCalorieGoal, allergens);
  const day1 = weekly.days[0];
  return {
    meals: day1.meals,
    totalCost: day1.dayCost,
    totalCalories: day1.dayCalories,
    withinBudget: day1.dayCost <= dailyBudget,
    budgetRemaining: dailyBudget - day1.dayCost,
  };
};
