import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./NavBar.css";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => navigate("/")}>TrainDiary</div>
      
      <button className="mobile-menu-btn" onClick={toggleMenu}>
        <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
      </button>

      <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
        <Link to="/workouts" onClick={() => setIsMenuOpen(false)}>Workout Tracker</Link>
        <Link to="/foods" onClick={() => setIsMenuOpen(false)}>Nutrition Guide</Link>
        <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>Progress Stats</Link>
        <Link to="/plans" onClick={() => setIsMenuOpen(false)}>Plans</Link>
      </div>

      <div className={`auth-buttons ${isMenuOpen ? 'active' : ''}`}>
        {!user ? (
          <>
            <button className="btn-outline" onClick={() => navigate("/register")}>Sign Up</button>
            <button className="btn-primary" onClick={() => navigate("/login")}>Login</button>
          </>
        ) : (
          <>
            <span className="user-greeting">Hi, {user.username}</span>
            <button className="btn-outline" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
