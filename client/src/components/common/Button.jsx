import "./Button.css";

/**
 * Reusable Button component.
 * @param {"primary"|"secondary"|"danger"|"ghost"|"success"} [variant="primary"]
 * @param {"sm"|"md"|"lg"} [size="md"]
 * @param {boolean} [loading=false]
 * @param {boolean} [fullWidth=false]
 * @param {string} [className]
 * @param {React.ReactNode} [icon] - Optional icon element (rendered before label)
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  className = "",
  disabled,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      className={[
        "btn",
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth ? "btn--full" : "",
        loading ? "btn--loading" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        icon && <span className="btn-icon">{icon}</span>
      )}
      {children}
    </button>
  );
}

export default Button;
