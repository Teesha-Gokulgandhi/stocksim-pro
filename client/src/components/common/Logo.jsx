import "./Logo.css";

export default function Logo({
  size = "md",
  collapsed = false,
  showText = true,
  subtitle = "",
  className = "",
  onClick,
}) {
  const pixelSizes = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 60,
  };

  const dim = pixelSizes[size] || 36;

  return (
    <div
      className={`stocksim-logo-container size-${size} ${collapsed ? "is-collapsed" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="logo-emblem-wrap" style={{ width: dim, height: dim }}>
        <img
          src="/brand-logo.png?v=6"
          alt="StockSim Pro"
          className="logo-brand-img"
          width={dim}
          height={dim}
        />
      </div>

      {!collapsed && showText && (
        <div className="logo-text-group">
          <div className="logo-brand-row">
            <span className="brand-stock">Stock</span>
            <span className="brand-sim">Sim</span>
            <span className="brand-pro">Pro</span>
          </div>
          {subtitle ? <span className="logo-subtitle">{subtitle}</span> : null}
        </div>
      )}
    </div>
  );
}
