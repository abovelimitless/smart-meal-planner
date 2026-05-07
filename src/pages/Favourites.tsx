import { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Meal } from "../ml/mealData";

interface FavMeal extends Meal {
  savedAt: { seconds: number };
  rating?: number;
}

const mealTypeIcon: Record<string, string> = { breakfast: "🥞", lunch: "🍲", dinner: "🥗" };
const dietColors: Record<string, string> = {
  normal: "bg-blue-100 text-blue-800",
  vegetarian: "bg-amber-100 text-amber-800",
  vegan: "bg-green-100 text-green-800",
  keto: "bg-purple-100 text-purple-800",
};

const Favourites = () => {
  const [favs, setFavs] = useState<FavMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/login"); return; }
      try {
        const snap = await getDocs(collection(doc(db, "users", user.uid), "favourites"));
        setFavs(snap.docs.map((d) => d.data() as FavMeal));
      } catch {} finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  const removeFav = async (mealId: string) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, "users", auth.currentUser.uid, "favourites", mealId));
    setFavs((prev) => prev.filter((f) => f.id !== mealId));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-800 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <div className="relative w-full h-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-700 flex items-center px-6 sm:px-12">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Favourites</h1>
            <p className="text-blue-200 text-sm mt-1">{favs.length} saved meal{favs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        {favs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">♥</div>
            <h2 className="text-xl font-bold text-blue-900 mb-2">No favourites yet</h2>
            <p className="text-slate-400 text-sm mb-6">Open any meal's recipe page and save it as a favourite.</p>
            <button onClick={() => navigate("/planner")}
              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-6 py-2.5 rounded-xl transition-all active:scale-95">
              Go to Planner
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {favs.map((meal) => (
              <div key={meal.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                <div className="flex items-center">
                  <div className="w-20 h-20 flex-shrink-0 bg-blue-50 flex items-center justify-center text-4xl rounded-l-2xl">
                    {mealTypeIcon[meal.mealType]}
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${dietColors[meal.diet]}`}>{meal.diet}</span>
                      <span className="text-xs text-amber-500 font-semibold capitalize">{meal.mealType}</span>
                    </div>
                    <h3 className="text-sm font-bold text-blue-900 leading-tight">{meal.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{meal.calories} kcal · ₦{meal.price.toLocaleString()}</p>
                    {meal.rating && (
                      <p className="text-xs text-amber-500 mt-0.5">{"⭐".repeat(meal.rating)}</p>
                    )}
                    <div className="flex gap-3 mt-2">
                      <Link to={`/recipe/${meal.id}`} className="text-xs text-blue-600 hover:underline">View recipe →</Link>
                      <button onClick={() => removeFav(meal.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline">Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Favourites;
