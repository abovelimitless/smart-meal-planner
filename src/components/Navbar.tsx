import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase/config";
import { signOut, onAuthStateChanged } from "firebase/auth";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<null | { email: string }>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ? { email: u.email ?? "" } : null));
    return () => unsub();
  }, []);

  const handleSignOut = async () => { await signOut(auth); navigate("/login"); };
  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/planner", label: "Planner" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/favourites", label: "Favourites" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-900 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <span className="text-white font-bold text-lg">SmartMeals</span>
            <span className="hidden sm:inline text-amber-400 text-xs font-semibold bg-amber-400/20 px-2 py-0.5 rounded-full">Beta</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive(l.to) ? "bg-amber-400 text-blue-900" : "text-blue-100 hover:bg-blue-800"}`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <span className="text-blue-300 text-xs truncate max-w-[140px]">{user.email}</span>
                <button onClick={handleSignOut} className="text-sm text-white bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-blue-100 hover:text-white px-3 py-1.5 transition-colors">Sign In</Link>
                <Link to="/signup" className="text-sm bg-amber-400 hover:bg-amber-500 text-blue-900 font-semibold px-4 py-1.5 rounded-lg transition-colors">Sign Up</Link>
              </>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2 rounded-lg hover:bg-blue-800 transition-colors">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-blue-900 border-t border-blue-800 px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(l.to) ? "bg-amber-400 text-blue-900" : "text-blue-100 hover:bg-blue-800"}`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-blue-800">
            {user ? (
              <button onClick={handleSignOut} className="w-full text-left text-sm text-blue-100 hover:text-white px-3 py-2">Sign Out</button>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm text-blue-100 border border-blue-700 px-3 py-2 rounded-lg">Sign In</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center text-sm bg-amber-400 text-blue-900 font-semibold px-3 py-2 rounded-lg">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
