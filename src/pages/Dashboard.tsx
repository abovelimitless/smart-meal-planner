import { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { doc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface SavedMeal {
  name: string;
  mealType: string;
  calories: number;
  price: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  similarityScore?: number;
}

interface DayPlan {
  day: number;
  meals: SavedMeal[];
  dayCost: number;
  dayCalories: number;
}

interface SavedPlan {
  id: string;
  diet: string;
  budget: number;
  mealsPerDay: number;
  totalCost: number;
  totalCalories: number;
  withinBudget: boolean;
  days?: DayPlan[];
  meals?: SavedMeal[];
  createdAt: { seconds: number };
}

const mealTypeIcon: Record<string, string> = { breakfast: "🥞", lunch: "🍲", dinner: "🥗" };
const dietColors: Record<string, string> = {
  normal: "bg-blue-100 text-blue-800",
  vegetarian: "bg-amber-100 text-amber-800",
  vegan: "bg-green-100 text-green-800",
  keto: "bg-purple-100 text-purple-800",
};
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const Dashboard = () => {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/login"); return; }
      try {
        const q = query(collection(doc(db, "users", user.uid), "mealPlans"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SavedPlan[]);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  const formatDate = (s: number) => new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-800 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading your plans...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <div className="relative w-full h-40 overflow-hidden">
        <img src="/images/dashboard-banner.jpg" alt="Dashboard" className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-700/70 flex items-center justify-between px-6 sm:px-12">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Dashboard</h1>
            <p className="text-blue-200 text-sm mt-1">{plans.length} saved plan{plans.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to="/favourites" className="bg-amber-400 hover:bg-amber-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-xl transition-all">
            ♥ Favourites
          </Link>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        {plans.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽️</div>
            <h2 className="text-xl font-bold text-blue-900 mb-2">No saved plans yet</h2>
            <p className="text-slate-400 text-sm mb-6">Generate and save a meal plan to see it here.</p>
            <button onClick={() => navigate("/planner")}
              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-6 py-2.5 rounded-xl transition-all active:scale-95">
              Go to Meal Planner
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const isWeekly = !!plan.days;
              const curDay = selectedDay[plan.id] || 1;
              const dayData = plan.days?.find((d) => d.day === curDay);

              return (
                <div key={plan.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-blue-200 hover:shadow-md transition-all">

                  {/* Plan header */}
                  <div className="flex items-center justify-between p-5 cursor-pointer"
                    onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                        {isWeekly ? "📅" : "🍽️"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${dietColors[plan.diet] || "bg-slate-100 text-slate-600"}`}>{plan.diet}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${plan.withinBudget ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                            {plan.withinBudget ? "✓ Within Budget" : "⚠ Over Budget"}
                          </span>
                          {isWeekly && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">7-day</span>}
                        </div>
                        <p className="text-sm font-bold text-blue-900">{plan.mealsPerDay} meals/day · ₦{plan.totalCost?.toLocaleString()} · {plan.totalCalories?.toLocaleString()} kcal</p>
                        <p className="text-xs text-slate-400">{plan.createdAt ? formatDate(plan.createdAt.seconds) : "—"}</p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-lg">{expanded === plan.id ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded */}
                  {expanded === plan.id && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                      {isWeekly && plan.days && (
                        <>
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                            {plan.days.map((d) => (
                              <button key={d.day}
                                onClick={() => setSelectedDay((prev) => ({ ...prev, [plan.id]: d.day }))}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${curDay === d.day ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-blue-50"}`}>
                                {DAY_NAMES[d.day - 1]}<br />
                                <span className="font-normal opacity-75">₦{d.dayCost?.toLocaleString()}</span>
                              </button>
                            ))}
                          </div>
                          {dayData && (
                            <>
                              <p className="text-xs font-semibold text-slate-500 mb-3">Day {curDay} — {dayData.dayCalories} kcal · ₦{dayData.dayCost?.toLocaleString()}</p>
                              <div className="space-y-2">
                                {dayData.meals?.map((meal, i) => (
                                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                                      {mealTypeIcon[meal.mealType]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-amber-500 font-semibold uppercase">{meal.mealType}</p>
                                      <p className="text-sm font-bold text-blue-900 truncate">{meal.name}</p>
                                      <p className="text-xs text-slate-400">{meal.calories} kcal · ₦{meal.price?.toLocaleString()}{meal.protein_g ? ` · ${meal.protein_g}g protein` : ""}</p>
                                    </div>
                                    {meal.similarityScore !== undefined && (
                                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                        {Math.round(meal.similarityScore * 100)}%
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* Legacy single-day plans */}
                      {!isWeekly && plan.meals?.map((meal, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                            {mealTypeIcon[meal.mealType]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-amber-500 font-semibold uppercase">{meal.mealType}</p>
                            <p className="text-sm font-bold text-blue-900 truncate">{meal.name}</p>
                            <p className="text-xs text-slate-400">{meal.calories} kcal · ₦{meal.price?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
