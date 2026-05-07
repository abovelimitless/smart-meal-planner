import { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { DietType, AllergenType } from "../ml/mealData";

const ALLERGENS: { value: AllergenType; label: string; icon: string }[] = [
  { value: "gluten", label: "Gluten", icon: "🌾" },
  { value: "dairy", label: "Dairy", icon: "🥛" },
  { value: "egg", label: "Eggs", icon: "🥚" },
  { value: "seafood", label: "Seafood", icon: "🐟" },
  { value: "peanut", label: "Peanuts", icon: "🥜" },
  { value: "soy", label: "Soy", icon: "🫘" },
];

const Preferences = () => {
  const [diet, setDiet] = useState<DietType>("normal");
  const [budget, setBudget] = useState<number | "">(3000);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [allergens, setAllergens] = useState<AllergenType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/login"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const p = snap.data().preferences;
        if (p) {
          setDiet(p.diet || "normal");
          setBudget(p.budget || 3000);
          setMealsPerDay(p.mealsPerDay || 3);
          setCalorieGoal(p.calorieGoal || 2000);
          setAllergens(p.allergens || []);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const toggleAllergen = (a: AllergenType) => {
    setAllergens((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    if (!budget || Number(budget) <= 0) { setMessage("⚠ Budget must be greater than zero."); setMsgType("error"); return; }
    if (calorieGoal < 100) { setMessage("⚠ Calorie goal must be at least 100."); setMsgType("error"); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid),
        { preferences: { diet, budget: Number(budget), mealsPerDay, calorieGoal, allergens } },
        { merge: true }
      );
      setMessage("✓ Preferences saved successfully!");
      setMsgType("success");
    } catch {
      setMessage("⚠ Could not save preferences. Try again.");
      setMsgType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-800 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 pt-24 pb-16">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">Your Preferences</h1>
        <p className="text-slate-500 text-sm mb-8">These defaults load every time you open the planner.</p>

        <div className="bg-white shadow-md rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-100">

          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-1">Diet Type</label>
            <select value={diet} onChange={(e) => setDiet(e.target.value as DietType)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400">
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
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-1">Meals Per Day <span className="font-normal text-slate-400">(1–6)</span></label>
            <input type="number" value={mealsPerDay} min={1} max={6}
              onChange={(e) => setMealsPerDay(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-1">Daily Calorie Goal (kcal) <span className="font-normal text-slate-400">(min 100)</span></label>
            <input type="number" value={calorieGoal} min={100}
              onChange={(e) => setCalorieGoal(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400" />
          </div>

          {/* Allergen selector */}
          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-3">Food Allergies <span className="font-normal text-slate-400">(select all that apply)</span></label>
            <div className="grid grid-cols-3 gap-2">
              {ALLERGENS.map((a) => (
                <button key={a.value} onClick={() => toggleAllergen(a.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    allergens.includes(a.value)
                      ? "bg-red-50 border-red-400 text-red-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300"
                  }`}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
            {allergens.length > 0 && (
              <p className="text-xs text-red-500 mt-2">
                ⚠ Meals containing {allergens.join(", ")} will be excluded from your plan.
              </p>
            )}
          </div>

          <button onClick={handleSave} disabled={saving}
            className={`w-full py-3 rounded-lg font-semibold text-white shadow transition-all ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-800 hover:bg-blue-900 active:scale-95"}`}>
            {saving ? "Saving..." : "Save Preferences"}
          </button>

          {message && (
            <p className={`text-sm text-center rounded-lg px-4 py-2 border ${msgType === "error" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-800 bg-amber-50 border-amber-200"}`}>
              {message}
            </p>
          )}

          <button onClick={() => navigate("/planner")}
            className="w-full py-2.5 rounded-lg font-semibold text-blue-800 border border-blue-200 hover:bg-blue-50 transition-colors">
            Go to Meal Planner →
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Preferences;
