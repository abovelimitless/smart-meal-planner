import { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { recommendWeeklyMeals, WeeklyPlan, GeneratedMeal, getMealIcon } from "../ml/recommender";
import { DietType, AllergenType, meals as allMeals } from "../ml/mealData";
import { askMealAssistant, explainMealPlan, getSmartSwap } from "../services/gemini";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MealPlanner = () => {
  const [diet, setDiet] = useState<DietType>("normal");
  const [budget, setBudget] = useState<number | "">("");
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [allergens, setAllergens] = useState<AllergenType[]>([]);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");
  const [selectedDay, setSelectedDay] = useState(1);
  const [planExplanation, setPlanExplanation] = useState("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [swapReason, setSwapReason] = useState<{ mealId: string; reason: string } | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const p = snap.data().preferences;
          if (p) {
            setDiet(p.diet || "normal");
            setBudget(p.budget || "");
            setMealsPerDay(p.mealsPerDay || 3);
            setCalorieGoal(p.calorieGoal || 2000);
            setAllergens(p.allergens || []);
          }
        }
      } else navigate("/login");
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => { setSaveMessage(""); }, [diet, budget, mealsPerDay, calorieGoal]);

  const generate = async () => {
    if (!budget || Number(budget) <= 0) { setStatusMessage("⚠ Please enter a daily budget greater than zero."); setStatusType("error"); return; }
    if (calorieGoal < 100) { setStatusMessage("⚠ Calorie goal must be at least 100 kcal."); setStatusType("error"); return; }
    setIsGenerating(true);
    setPlanExplanation("");
    setSwapReason(null);
    setStatusMessage("Generating your 7-day meal plan...");
    setStatusType("info");
    const result = recommendWeeklyMeals(diet, Number(budget), mealsPerDay, calorieGoal, allergens);
    setPlan(result);
    setSelectedDay(1);
    if (result.warning) {
      setStatusMessage(result.warning);
      setStatusType("error");
    } else {
      setStatusMessage(result.withinBudget ? "✓ 7-day plan generated! All meals are within your daily budget." : "⚠ Plan generated. Some days slightly exceed your budget.");
      setStatusType(result.withinBudget ? "success" : "error");
    }
    setIsGenerating(false);
    setExplanationLoading(true);
    try {
      const explanation = await explainMealPlan(diet, Number(budget), result.totalCost, result.totalCalories, mealsPerDay, allergens);
      setPlanExplanation(explanation);
    } catch {
      setPlanExplanation("Could not load AI explanation. Check your internet connection.");
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleSwap = async (meal: GeneratedMeal) => {
    if (!plan) return;
    setSwappingId(meal.id);
    setSwapReason(null);
    const currentIds = new Set(plan.days.flatMap((d) => d.meals.map((m) => m.id)));
    currentIds.delete(meal.id);
    const alternatives = allMeals.filter(
      (m) => m.diet === diet && m.mealType === meal.mealType && m.id !== meal.id && !currentIds.has(m.id)
    );
    if (alternatives.length === 0) { alert("No alternative meals available for this slot."); setSwappingId(null); return; }
    let replacement = alternatives[0];
    let reason = "Selected as a nutritious alternative for your diet.";
    try {
      const result = await getSmartSwap(meal, alternatives, diet, Number(budget), calorieGoal);
      replacement = result.meal;
      reason = result.reason;
    } catch {
      replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    const newPlan = {
      ...plan,
      days: plan.days.map((d) => {
        if (d.day !== meal.day) return d;
        const newMeals = d.meals.map((m) =>
          m.id === meal.id ? { ...replacement, similarityScore: 0, day: meal.day, slot: meal.slot } : m
        );
        return { ...d, meals: newMeals, dayCost: newMeals.reduce((s, m) => s + m.price, 0), dayCalories: newMeals.reduce((s, m) => s + m.calories, 0) };
      }),
    };
    const newTotal = newPlan.days.reduce((s, d) => s + d.dayCost, 0);
    const weeklyBudget = Number(budget) * 7;
    setPlan({ ...newPlan, totalCost: newTotal, withinBudget: newTotal <= weeklyBudget, budgetRemaining: weeklyBudget - newTotal });
    setSwapReason({ mealId: replacement.id, reason });
    setSwappingId(null);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const reply = await askMealAssistant(userMsg, diet, Number(budget) || 3000);
      setChatMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "ai", text: "Sorry, I couldn't connect. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const savePlan = async () => {
    if (!auth.currentUser) { setSaveMessage("⚠ Please sign in to save meal plans."); setSaveTone("error"); return; }
    if (!plan) { setSaveMessage("⚠ Generate a plan first."); setSaveTone("error"); return; }
    setSaving(true);
    try {
      await addDoc(collection(doc(db, "users", auth.currentUser.uid), "mealPlans"), {
        diet, budget: Number(budget), mealsPerDay, calorieGoal, allergens,
        days: plan.days, totalCost: plan.totalCost, totalCalories: plan.totalCalories,
        withinBudget: plan.withinBudget, budgetRemaining: plan.budgetRemaining,
        generatedByML: true, createdAt: new Date(),
      });
      setSaveMessage("✓ Weekly plan saved to your dashboard.");
      setSaveTone("success");
    } catch {
      setSaveMessage("⚠ Unable to save. Check your connection and try again.");
      setSaveTone("error");
    } finally {
      setSaving(false);
    }
  };

  const statusColors = {
    info: "text-blue-700 bg-blue-50 border border-blue-200",
    success: "text-amber-800 bg-amber-50 border border-amber-200",
    error: "text-red-700 bg-red-50 border border-red-200",
  };

  const currentDay = plan?.days.find((d) => d.day === selectedDay);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-800 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading Meal Planner...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <div className="relative w-full h-48 sm:h-64 overflow-hidden">
        <img src="/images/hero.jpg" alt="Meals" className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-blue-800/60 flex items-center px-6 sm:px-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">7-Day Meal Planner</h1>
            <p className="text-blue-100 text-sm sm:text-base">Smart daily recommendations tailored to your diet, budget & goals.</p>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">

        <div className="bg-white shadow-md rounded-2xl p-6 sm:p-8 space-y-5 mb-8 border border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-blue-900">Your Preferences</h2>
            <Link to="/preferences" className="text-xs text-amber-600 hover:text-amber-700 font-semibold">Edit defaults →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Diet Type</label>
              <select value={diet} onChange={(e) => setDiet(e.target.value as DietType)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400 text-sm">
                <option value="normal">Normal</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Daily Budget (₦)</label>
              <input type="number" value={budget} min={0}
                onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 3000"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Meals Per Day <span className="text-slate-400 font-normal">(1–6)</span></label>
              <input type="number" value={mealsPerDay} min={1} max={6}
                onChange={(e) => setMealsPerDay(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-1">Daily Calorie Goal (kcal)</label>
              <input type="number" value={calorieGoal} min={100}
                onChange={(e) => setCalorieGoal(Number(e.target.value))}
                placeholder="e.g. 2000"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400 text-sm" />
            </div>
          </div>
          {allergens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500 self-center">Excluding allergens:</span>
              {allergens.map((a) => (
                <span key={a} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium capitalize">{a}</span>
              ))}
            </div>
          )}
          <button onClick={generate} disabled={isGenerating}
            className={`w-full py-3 rounded-lg font-semibold text-white shadow transition-all ${isGenerating ? "bg-slate-400 cursor-not-allowed" : "bg-blue-800 hover:bg-blue-900 active:scale-95"}`}>
            {isGenerating ? "Generating..." : "Generate 7-Day Plan"}
          </button>
          {statusMessage && (
            <p className={`text-sm text-center rounded-lg px-4 py-2 ${statusColors[statusType]}`}>{statusMessage}</p>
          )}
        </div>

        {plan && (
          <div className="space-y-6">

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white shadow-sm rounded-xl px-3 py-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Weekly Cost</p>
                <p className="text-base font-bold text-blue-900">₦{plan.totalCost.toLocaleString()}</p>
                <p className="text-xs text-slate-400">₦{Number(budget).toLocaleString()}/day</p>
              </div>
              <div className="bg-white shadow-sm rounded-xl px-3 py-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Total Calories</p>
                <p className="text-base font-bold text-blue-900">{plan.totalCalories.toLocaleString()}</p>
                <p className="text-xs text-slate-400">7-day total</p>
              </div>
              <div className={`shadow-sm rounded-xl px-3 py-3 text-center border ${plan.withinBudget ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                <p className="text-xs text-slate-400 mb-1">Remaining</p>
                <p className={`text-base font-bold ${plan.withinBudget ? "text-amber-600" : "text-red-600"}`}>
                  {plan.withinBudget ? "+" : "-"}₦{Math.abs(plan.budgetRemaining).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">{plan.withinBudget ? "within budget" : "over budget"}</p>
              </div>
            </div>

            {/* AI Plan Explanation */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🤖</span>
                <h3 className="text-sm font-bold text-white">AI Plan Analysis</h3>
              </div>
              {explanationLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-amber-400 rounded-full animate-spin" />
                  <p className="text-blue-200 text-xs">Analysing your plan...</p>
                </div>
              ) : (
                <p className="text-blue-100 text-sm leading-relaxed">{planExplanation}</p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-blue-900 mb-3">Your Weekly Meal Plan</h2>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {plan.days.map((d) => (
                  <button key={d.day} onClick={() => setSelectedDay(d.day)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedDay === d.day ? "bg-blue-800 text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
                    }`}>
                    <div>{DAY_NAMES[d.day - 1]}</div>
                    <div className="text-xs font-normal opacity-75">₦{d.dayCost.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            {currentDay && (
              <div className="space-y-3">
                <h3 className="font-bold text-blue-900">Day {selectedDay} — {currentDay.dayCalories} kcal · ₦{currentDay.dayCost.toLocaleString()}</h3>
                {currentDay.meals.map((meal, idx) => (
                  <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex items-center">
                      <div className="w-20 h-20 flex-shrink-0 bg-blue-50 flex items-center justify-center text-4xl rounded-l-2xl">
                        {getMealIcon(meal.name)}
                      </div>
                      <div className="flex-1 p-4">
                        <p className="text-xs font-semibold text-amber-500 uppercase mb-0.5 capitalize">{meal.slot}</p>
                        <h4 className="text-sm font-bold text-blue-900 leading-tight">{meal.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{meal.calories} kcal · ₦{meal.price.toLocaleString()} · {meal.protein_g}g protein · {meal.carbs_g}g carbs · {meal.fat_g}g fat</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                            {Math.round(meal.similarityScore * 100)}% match
                          </span>
                          <Link to={`/recipe/${meal.id}`} className="text-xs text-blue-600 hover:underline">View recipe →</Link>
                        </div>
                        {swapReason?.mealId === meal.id && (
                          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 mt-2">
                            🤖 {swapReason.reason}
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleSwap(meal)} disabled={swappingId === meal.id}
                        className={`mr-4 text-xs border px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${
                          swappingId === meal.id ? "text-slate-300 border-slate-100 cursor-not-allowed" : "text-slate-400 hover:text-red-500 border-slate-200 hover:border-red-300"
                        }`}>
                        {swappingId === meal.id ? "..." : "🔄 Swap"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentDay && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-blue-900 mb-3 text-sm">Day {selectedDay} Nutritional Summary</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Calories", value: `${currentDay.dayCalories} kcal`, color: "text-blue-800" },
                    { label: "Protein", value: `${currentDay.meals.reduce((s, m) => s + m.protein_g, 0)}g`, color: "text-green-700" },
                    { label: "Carbs", value: `${currentDay.meals.reduce((s, m) => s + m.carbs_g, 0)}g`, color: "text-amber-700" },
                    { label: "Fat", value: `${currentDay.meals.reduce((s, m) => s + m.fat_g, 0)}g`, color: "text-red-600" },
                  ].map((n, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <p className={`text-base font-bold ${n.color}`}>{n.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{n.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={savePlan} disabled={saving}
              className={`w-full py-3 rounded-lg font-semibold text-white shadow transition-all ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 active:scale-95"}`}>
              {saving ? "Saving..." : "Save Weekly Plan to Dashboard"}
            </button>

            {saveMessage && (
              <p className={`text-sm text-center rounded-lg px-4 py-2 border ${saveTone === "error" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-800 bg-amber-50 border-amber-200"}`}>
                {saveMessage}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Floating AI Chat */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-900 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <p className="text-white text-sm font-bold">AI Meal Assistant</p>
                  <p className="text-blue-300 text-xs">Ask anything about your meals</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="h-64 overflow-y-auto p-3 space-y-2 bg-slate-50">
              {chatMessages.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-xs mb-3">Ask me anything about Nigerian meals, your diet, or budget tips!</p>
                  {["What's a cheap keto breakfast?", "Which meal has most protein?", "Suggest something light for dinner"].map((q) => (
                    <button key={q} onClick={() => setChatInput(q)}
                      className="block w-full text-left text-xs text-blue-600 bg-white border border-blue-100 rounded-lg px-3 py-1.5 hover:border-blue-300 transition-colors mb-1">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === "user" ? "bg-blue-800 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                  }`}>
                    {msg.role === "ai" && <span className="text-amber-500 font-semibold mr-1">🤖</span>}
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl rounded-bl-sm">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <div key={delay} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-100 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Ask about meals..."
                className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700" />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                Send
              </button>
            </div>
          </div>
        )}
        <button onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 bg-blue-900 hover:bg-blue-800 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all active:scale-95">
          {chatOpen ? "✕" : "🤖"}
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default MealPlanner;
