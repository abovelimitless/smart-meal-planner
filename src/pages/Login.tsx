import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/planner");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          {/* Top banner */}
          <div className="bg-blue-900 px-8 py-8 text-center">
            <span className="text-4xl">🍽️</span>
            <h1 className="text-white font-bold text-xl mt-2">Welcome Back</h1>
            <p className="text-blue-300 text-sm mt-1">Sign in to your SmartMeals account</p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
                ⚠ {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700 transition hover:border-blue-400" />
              </div>
              <button type="submit" disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white shadow transition-all ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-800 hover:bg-blue-900 active:scale-95"}`}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{" "}
              <Link to="/signup" className="text-amber-600 hover:text-amber-700 font-semibold">Sign Up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
