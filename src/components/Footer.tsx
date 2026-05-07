import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-blue-900 text-blue-200 mt-auto">
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🍽️</span>
            <span className="text-white font-bold">SmartMeals</span>
          </div>
          <p className="text-sm text-blue-300 leading-relaxed">
            Personalised Nigerian meal planning powered by a cosine similarity recommendation algorithm.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Navigation</h4>
          <div className="space-y-2">
            {[["/" , "Home"], ["/planner", "Meal Planner"], ["/dashboard", "Dashboard"], ["/how-it-works", "How It Works"]].map(([to, label]) => (
              <Link key={to} to={to} className="block text-sm text-blue-300 hover:text-amber-400 transition-colors">{label}</Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Project</h4>
          <p className="text-sm text-blue-300">Group 3</p>
          <p className="text-sm text-blue-300">Babcock University</p>
          <p className="text-sm text-blue-300">Department of Computer Science</p>
        </div>
      </div>
      <div className="border-t border-blue-800 pt-6 text-center text-xs text-blue-400">
        © {new Date().getFullYear()} Smart Meal Planner · Group 3 · Babcock University
      </div>
    </div>
  </footer>
);

export default Footer;
