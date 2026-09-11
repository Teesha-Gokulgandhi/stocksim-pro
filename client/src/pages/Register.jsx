import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiTrendingUp, FiZap, FiLayers, FiActivity } from "react-icons/fi";
import API from "../services/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useUser } from "../context/UserContext";
import Logo from "../components/common/Logo";
import "./Register.css";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { refreshUser } = useUser();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/register", { name, email, password });
      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        if (refreshUser) await refreshUser();
        navigate("/dashboard");
      } else {
        navigate("/login", { state: { justRegistered: true, email } });
      }
    } catch (err) {
      const details = err.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setError(details.map((d) => d.message).join(", "));
      } else {
        setError(err.response?.data?.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-page">
      {/* ── Left Column: Platform Showcase (Hidden on screens <= 960px) ── */}
      <div className="login-showcase-panel">
        <div className="showcase-glow-backdrop" />

        <div className="showcase-content">
          <div className="showcase-brand">
            <Logo size="lg" />
          </div>

          <div className="showcase-hero">
            <h1>
              Master Global Equities With <span>Zero Risk</span>
            </h1>
            <p>
              Experience ultra-realistic paper trading across <strong>NSE, BSE, NASDAQ & NYSE</strong>.
              Simulate live orders, test technical strategies, and practice with ₹1,00,000 + $10,000 virtual margins.
            </p>
          </div>

          {/* 4 Feature Highlights Grid */}
          <div className="showcase-cards-grid">
            <div className="showcase-card">
              <div className="card-icon blue">
                <FiTrendingUp />
              </div>
              <div className="card-text">
                <h4>Live Market Quotes</h4>
                <p>Real-time prices and charts directly from Yahoo Finance for Indian and US equities, with zero dummy data.</p>
              </div>
            </div>

            <div className="showcase-card">
              <div className="card-icon emerald">
                <FiZap />
              </div>
              <div className="card-text">
                <h4>Risk-Free Paper Trading</h4>
                <p>Practice buying and selling stocks with virtual ₹1,00,000 INR and $10,000 USD margin without risking real money.</p>
              </div>
            </div>

            <div className="showcase-card">
              <div className="card-icon purple">
                <FiLayers />
              </div>
              <div className="card-text">
                <h4>Historical Replay Studio</h4>
                <p>Replay past market sessions candle-by-candle to practice your timing and master trading strategies.</p>
              </div>
            </div>

            <div className="showcase-card">
              <div className="card-icon amber">
                <FiActivity />
              </div>
              <div className="card-text">
                <h4>Smart AI Stock Copilot</h4>
                <p>Instant valuation multiples, 52-week technical trends, and fundamentals analysis on any stock you trade.</p>
              </div>
            </div>
          </div>

          {/* Live Market Simulation Strip */}
          <div className="showcase-pulse-strip">
            <div className="pulse-item">
              <span className="pulse-label">PRACTICE CASH MARGIN</span>
              <span className="pulse-value">₹1,00,000 + $10,000</span>
            </div>
            <div className="pulse-divider" />
            <div className="pulse-item">
              <span className="pulse-label">GLOBAL EXCHANGES</span>
              <span className="pulse-value">NSE • BSE • NASDAQ • NYSE</span>
            </div>
            <div className="pulse-divider" />
            <div className="pulse-item">
              <span className="pulse-label">REAL-TIME ENGINE</span>
              <span className="pulse-value open">● Authentic Feeds</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Registration Form ── */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-mobile-brand">
            <Logo size="md" />
          </div>

          <h2 className="login-card-title">Create Account 🚀</h2>
          <p className="login-card-subtitle">Sign up for your zero-risk trading account</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleRegister}>
            <label htmlFor="register-name">Name</label>
            <input
              id="register-name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="register-password">Password</label>
            <div className="password-field">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters, letter & number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <GoogleSignInButton onError={setError} />

          <p className="register-text">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
