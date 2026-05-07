import { Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MealPlanner from "./pages/MealPlanner";
import Dashboard from "./pages/Dashboard";
import Preferences from "./pages/Preferences";
import RecipeDetail from "./pages/RecipeDetail";
import Favourites from "./pages/Favourites";

const App = () => (
  <Routes>
    <Route path="/" element={<Homepage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/planner" element={<MealPlanner />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/preferences" element={<Preferences />} />
    <Route path="/recipe/:mealId" element={<RecipeDetail />} />
    <Route path="/favourites" element={<Favourites />} />
  </Routes>
);

export default App;
