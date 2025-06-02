import { FaChartLine, FaBullseye, FaUsers, FaMobileAlt } from "react-icons/fa";
import "./HeroSection.css";

interface HeroSectionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export default function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
  return (
    <>
      <section className="hero">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/Assest/background.mp4" type="video/mp4" />
        </video>
        <div className="hero-content">
          <h1>Transform Your Fitness Journey Today</h1>
          <p>
            Track your workouts, monitor your nutrition, and achieve your fitness goals
            with our comprehensive fitness tracking platform. Join our growing community
            and start your transformation today!
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={onGetStarted}>
              Get Started
            </button>
            <button className="btn-outline" onClick={onLearnMore}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Why Choose Our Platform?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FaChartLine />
            </div>
            <h3>Track Progress</h3>
            <p>
              Monitor your workouts, nutrition, and achievements with detailed analytics
              and comprehensive progress tracking.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaBullseye />
            </div>
            <h3>Set Goals</h3>
            <p>
              Create personalized fitness goals and receive step-by-step guidance
              to achieve them effectively.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaUsers />
            </div>
            <h3>Community Support</h3>
            <p>
              Connect with like-minded individuals, share experiences, and stay
              motivated with our supportive community.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaMobileAlt />
            </div>
            <h3>Mobile Friendly</h3>
            <p>
              Access your fitness journey anywhere, anytime with our responsive
              mobile platform. Never miss a workout.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Start Your Fitness Journey?</h2>
          <p>
            Join thousands of users who have already transformed their lives using
            our comprehensive fitness tracking platform.
          </p>
          <div className="cta-stats">
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Workouts Logged</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">95%</span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>
          <button className="btn-primary" onClick={onGetStarted}>
            Start Your Journey
          </button>
        </div>
      </section>
    </>
  );
}
