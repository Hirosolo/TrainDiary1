import { useState } from "react";
import "./NavBar.css";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="logo">TrainDiary</div>
      
      <button className="mobile-menu-btn" onClick={toggleMenu}>
        <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
      </button>

      <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
        <a href="#" onClick={() => setIsMenuOpen(false)}>Workout Tracker</a>
        <a href="#" onClick={() => setIsMenuOpen(false)}>Nutrition Guide</a>
        <a href="#" onClick={() => setIsMenuOpen(false)}>Progress Stats</a>
        <a href="#" onClick={() => setIsMenuOpen(false)}>More ▼</a>
      </div>

      <div className={`auth-buttons ${isMenuOpen ? 'active' : ''}`}>
        <button className="btn-outline">Sign Up</button>
        <button className="btn-primary">Login</button>
      </div>
    </nav>
  );
}
