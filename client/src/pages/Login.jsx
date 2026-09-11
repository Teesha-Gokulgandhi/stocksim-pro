import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  FiEye,
  FiEyeOff,
  FiShield,
  FiMail,
  FiCopy,
  FiCheck,
  FiX,
  FiHelpCircle,
  FiTrendingUp,
  FiZap,
  FiLayers,
  FiActivity,
} from "react-icons/fi";
import API from "../services/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useUser } from "../context/UserContext";
import Logo from "../components/common/Logo";
import "./Login.css";

function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Support Appeal Modal State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [appealEmail, setAppealEmail] = useState("");
  const [appealReason, setAppealReason] = useState("Mistaken account suspension");
  const [appealDetails, setAppealDetails] = useState("");
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const navigate = useNavigate();
  const { refreshUser } = useUser();
  const justRegistered = location.state?.justRegistered;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      if (refreshUser) await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      const details = err.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setError(details.map((d) => d.message).join(", "));
      } else {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopySupportEmail = () => {
    navigator.clipboard.writeText("support@stocksim.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleAppealSubmit = (e) => {
    e.preventDefault();
    setAppealSubmitted(true);
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

      {/* ── Right Column: Sign In Form ── */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-mobile-brand">
            <Logo size="lg" />
          </div>
          <h2 className="login-card-title">Welcome Back 👋</h2>
          <p className="subtitle">Sign in to access your simulation workstation</p>

          {error && (
            <div className="login-error">
              <span>{error}</span>
              {error.toLowerCase().includes("suspended") && (
                <button
                  type="button"
                  className="support-appeal-trigger-btn"
                  onClick={() => {
                    setAppealEmail(email || "user@stocksim.com");
                    setShowSupportModal(true);
                    setAppealSubmitted(false);
                  }}
                >
                  <FiHelpCircle /> Click here to contact support & submit an appeal →
                </button>
              )}
            </div>
          )}
          {justRegistered && !error && (
            <div className="login-success">Account created! Sign in to continue.</div>
          )}

          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <GoogleSignInButton onError={setError} />

          <p className="register-text">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>

      {/* Account Support & Reinstatement Modal */}
      {showSupportModal && (
        <div className="support-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="support-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="support-modal-close"
              onClick={() => setShowSupportModal(false)}
            >
              <FiX />
            </button>

            <div className="support-modal-header">
              <div className="support-modal-shield">
                <FiShield />
              </div>
              <div>
                <h3>Account Support & Reinstatement</h3>
                <p>Submit an appeal to the StockSim Pro administrative desk.</p>
              </div>
            </div>

            {/* Direct Email Card */}
            <div className="support-contact-strip">
              <div className="support-contact-info">
                <FiMail />
                <div>
                  <strong>Official Desk Email</strong>
                  <span>support@stocksim.com</span>
                </div>
              </div>
              <button
                type="button"
                className="copy-email-btn"
                onClick={handleCopySupportEmail}
              >
                {copiedEmail ? <FiCheck /> : <FiCopy />}
                {copiedEmail ? "Copied!" : "Copy Email"}
              </button>
            </div>

            {appealSubmitted ? (
              <div className="appeal-success-box">
                <FiCheck className="success-icon" />
                <h4>Appeal Ticket Logged</h4>
                <p>
                  Your review request <strong>#SSP-{Math.floor(10000 + Math.random() * 90000)}</strong> has been received. Our compliance team will review your account status within 2-4 hours. You will receive an email update at <strong>{appealEmail}</strong>.
                </p>
                <button
                  type="button"
                  className="appeal-done-btn"
                  onClick={() => setShowSupportModal(false)}
                >
                  Close
                </button>
              </div>
            ) : (
              <form className="appeal-form" onSubmit={handleAppealSubmit}>
                <label>Account Email:</label>
                <input
                  type="email"
                  value={appealEmail}
                  onChange={(e) => setAppealEmail(e.target.value)}
                  required
                  placeholder="name@stocksim.com"
                />

                <label>Reason for Reinstatement:</label>
                <select
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                >
                  <option value="Mistaken account suspension">Mistaken account suspension</option>
                  <option value="Margin balance clarification">Margin balance clarification</option>
                  <option value="Security audit confirmation">Security audit confirmation</option>
                  <option value="Other account support inquiry">Other account support inquiry</option>
                </select>

                <label>Additional Explanation / Details:</label>
                <textarea
                  rows={3}
                  value={appealDetails}
                  onChange={(e) => setAppealDetails(e.target.value)}
                  placeholder="Please describe why your account should be reviewed and reinstated..."
                  required
                />

                <div className="appeal-form-actions">
                  <button type="submit" className="submit-appeal-btn">
                    Submit Appeal Ticket
                  </button>
                  <button
                    type="button"
                    className="cancel-appeal-btn"
                    onClick={() => setShowSupportModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
