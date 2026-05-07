import { useParams, useNavigate } from "react-router-dom";
import { meals } from "../ml/mealData";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useState } from "react";

const RecipeDetail = () => {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const meal = meals.find((m) => m.id === mealId);
  const [saved, setSaved] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  if (!meal) return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex-1 flex items-center justify-center flex-col gap-4 pt-24">
        <p className="text-xl font-bold text-blue-900">Meal not found.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm">← Go back</button>
      </div>
      <Footer />
    </div>
  );

  const totalIngredientCost = meal.ingredients.reduce((s, i) => s + i.priceEstimate, 0);

  const handleSaveFavourite = async () => {
    if (!auth.currentUser) { alert("Please sign in to save favourites."); return; }
    try {
      await setDoc(
        doc(db, "users", auth.currentUser.uid, "favourites", meal.id),
        { ...meal, savedAt: new Date(), rating }
      );
      setSaved(true);
    } catch { alert("Could not save. Try again."); }
  };

  const handleRate = async (stars: number) => {
    setRating(stars);
    if (!auth.currentUser) return;
    try {
      const favRef = doc(db, "users", auth.currentUser.uid, "favourites", meal.id);
      const snap = await getDoc(favRef);
      if (snap.exists()) {
        await setDoc(favRef, { ...snap.data(), rating: stars }, { merge: true });
      }
    } catch {}
  };

  const mealTypeIcon: Record<string, string> = { breakfast: "🥞", lunch: "🍲", dinner: "🥗" };
  const dietColors: Record<string, string> = {
    normal: "bg-blue-100 text-blue-800",
    vegetarian: "bg-amber-100 text-amber-800",
    vegan: "bg-green-100 text-green-800",
    keto: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">

        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm mb-6 block">← Back to Planner</button>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <div className="bg-blue-900 px-6 py-8 flex items-center gap-4">
            <div className="w-20 h-20 bg-blue-800 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0">
              {mealTypeIcon[meal.mealType]}
            </div>
            <div>
              <div className="flex gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${dietColors[meal.diet]}`}>{meal.diet}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white capitalize">{meal.mealType}</span>
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">{meal.name}</h1>
              <p className="text-blue-300 text-sm mt-1">₦{meal.price.toLocaleString()} estimated · {meal.calories} kcal</p>
            </div>
          </div>

          {/* Nutrition grid */}
          <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { label: "Calories", value: `${meal.calories}`, unit: "kcal", color: "text-blue-800" },
              { label: "Protein", value: `${meal.protein_g}`, unit: "g", color: "text-green-700" },
              { label: "Carbs", value: `${meal.carbs_g}`, unit: "g", color: "text-amber-700" },
              { label: "Fat", value: `${meal.fat_g}`, unit: "g", color: "text-red-600" },
            ].map((n, i) => (
              <div key={i} className="py-4 text-center">
                <p className={`text-lg font-bold ${n.color}`}>{n.value}<span className="text-xs font-normal text-slate-400 ml-0.5">{n.unit}</span></p>
                <p className="text-xs text-slate-400">{n.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Allergens */}
        {meal.allergens.some((a) => a !== "none") && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-sm font-semibold text-red-700 mb-1">⚠ Contains allergens:</p>
            <div className="flex flex-wrap gap-2">
              {meal.allergens.filter((a) => a !== "none").map((a) => (
                <span key={a} className="text-xs bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full capitalize font-medium">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-bold text-blue-900 mb-3">Ingredients</h2>
          <div className="space-y-2">
            {meal.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{ing.name}</p>
                  <p className="text-xs text-slate-400">{ing.quantity}</p>
                </div>
                <span className="text-sm font-semibold text-blue-900">≈ ₦{ing.priceEstimate.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
            <span className="text-sm font-bold text-slate-600">Estimated Total</span>
            <span className="text-base font-bold text-blue-900">₦{totalIngredientCost.toLocaleString()}</span>
          </div>
        </div>

        {/* Preparation */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-bold text-blue-900 mb-3">Preparation</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{meal.preparation}</p>
        </div>

        {/* Rating */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <h2 className="font-bold text-blue-900 mb-3">Rate this meal</h2>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => handleRate(star)}
                className="text-3xl transition-transform hover:scale-110">
                {star <= (hovered || rating) ? "⭐" : "☆"}
              </button>
            ))}
          </div>
          {rating > 0 && <p className="text-sm text-slate-500">You rated this {rating} star{rating > 1 ? "s" : ""}.</p>}
        </div>

        {/* Save to favourites */}
        <button onClick={handleSaveFavourite} disabled={saved}
          className={`w-full py-3 rounded-lg font-semibold text-white shadow transition-all ${saved ? "bg-green-500 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 active:scale-95"}`}>
          {saved ? "✓ Saved to Favourites" : "♥ Save to Favourites"}
        </button>

      </main>
      <Footer />
    </div>
  );
};

export default RecipeDetail;
