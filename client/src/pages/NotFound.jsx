import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiHome, FiBarChart2 } from "react-icons/fi";
import "./NotFound.css";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-container">
      {/* Animated background orbs */}
      <div className="notfound-orb notfound-orb--1" aria-hidden="true" />
      <div className="notfound-orb notfound-orb--2" aria-hidden="true" />

      <div className="notfound-content">
        {/* Big 404 */}
        <div className="notfound-code" aria-hidden="true">
          <span>4</span>
          <span className="notfound-zero">
            <FiBarChart2 className="notfound-chart-icon" />
          </span>
          <span>4</span>
        </div>

        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-desc">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          <br />
          Let&apos;s get you back to trading.
        </p>

        <div className="notfound-actions">
          <button
            className="notfound-btn notfound-btn--primary"
            onClick={() => navigate("/dashboard")}
          >
            <FiHome />
            Go to Dashboard
          </button>
          <button
            className="notfound-btn notfound-btn--ghost"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;