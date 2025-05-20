import "./HeroSection.css";

export default function HeroSection() {
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
            Our platform empowers you to effortlessly track your workouts and
            nutrition, ensuring you stay on the path to your fitness goals. Join
            our community and take the first step towards a healthier you!
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">Sign Up</button>
            <button className="btn-outline">Learn More</button>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Why Choose Our Platform?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Track Progress</h3>
            <p>Monitor your workouts, nutrition, and achievements with detailed analytics and progress tracking.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Set Goals</h3>
            <p>Create personalized fitness goals and get step-by-step guidance to achieve them.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Community Support</h3>
            <p>Connect with like-minded individuals, share experiences, and stay motivated together.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Mobile Friendly</h3>
            <p>Access your fitness journey anywhere, anytime with our responsive mobile platform.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Start Your Fitness Journey?</h2>
          <p>Join thousands of users who have already transformed their lives with our platform.</p>
          <button className="btn-primary">Get Started Now</button>
        </div>
      </section>
    </>
  );
}
