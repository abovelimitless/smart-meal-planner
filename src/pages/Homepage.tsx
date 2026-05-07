import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const features = [
  {
    title: "Diet-Aware",
    desc: "Supports Normal, Vegetarian, Vegan, and Keto diets with allergen filtering. Every meal recommended respects your dietary needs.",
  },
  {
    title: "Budget-Friendly",
    desc: "Set your daily budget and the system optimises your 7-day plan to fit within it — no surprises.",
  },
  {
    title: "Smart Algorithm",
    desc: "Uses cosine similarity to score meals against your profile. Powered by Groq AI for plan analysis, smart swaps and a meal assistant.",
  },
  {
    title: "Saved to Dashboard",
    desc: "Every 7-day plan is saved to your personal dashboard via Firebase for easy access later.",
  },
];

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full min-h-[520px] flex items-center overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt="Delicious Nigerian food spread"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700" />
        <div className="absolute inset-0 bg-blue-900/70" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-12 py-24 text-center">
          <span className="inline-block bg-amber-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            Smart Meal Planning
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
            Eat Well.<br/>
            <span className="text-amber-400">Stay Within Budget.</span>
          </h1>
          <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            A personalised meal planner that recommends Nigerian meals based on your diet type, daily budget, and calorie goals — powered by a cosine similarity algorithm.
          </p>
          <button
            onClick={() => navigate("/planner")}
            className="bg-amber-400 hover:bg-amber-500 text-blue-900 font-bold px-8 py-3 rounded-xl shadow-lg transition-all active:scale-95">
            Generate My Meal Plan
          </button>
        </div>
      </section>

      {/* Food photo strip */}
      <section className="w-full overflow-hidden bg-white py-6 border-y border-slate-100">
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
          {[
            "https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&q=80",
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80",
            "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80",
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&q=80",
            "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=300&q=80",
          ].map((src, i) => (
            <img
              key={i}
              src={src}
              alt="Food"
              className="w-40 h-28 object-cover rounded-xl flex-shrink-0 hover:scale-105 transition-transform duration-300"
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-blue-900 text-center mb-10">Why Smart Meal Planner?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
              <h3 className="text-base font-bold text-blue-900 mb-1">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-blue-900 py-16 text-center px-6">
        <img
          src="/images/cta-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to eat smarter?</h2>
          <p className="text-blue-200 mb-6 text-sm sm:text-base">Generate your first personalised meal plan in seconds.</p>
          <button
            onClick={() => navigate("/planner")}
            className="bg-amber-400 hover:bg-amber-500 text-blue-900 font-bold px-8 py-3 rounded-xl shadow-lg transition-all active:scale-95">
            Get Started
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Homepage;