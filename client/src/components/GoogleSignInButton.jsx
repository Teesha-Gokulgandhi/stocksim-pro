import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";

// Renders Google's own Sign-In button (via the GIS script tag loaded in
// index.html) and exchanges the resulting ID token for our app's JWT.
// Works for both login AND signup — the backend creates the account on
// first sign-in, so one button covers both pages.
function GoogleSignInButton({ onError }) {
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width and update on resize
  useEffect(() => {
    const measure = () => {
      if (buttonRef.current) {
        setContainerWidth(buttonRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn(
        "VITE_GOOGLE_CLIENT_ID is not set — Google Sign-In button will not render."
      );
      return;
    }
    // Need a valid width to render
    if (!containerWidth) return;

    const handleCredentialResponse = async (response) => {
      try {
        const { data } = await API.post("/auth/google", {
          idToken: response.credential,
        });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");
      } catch (error) {
        const message =
          error.response?.data?.message || "Google sign-in failed. Please try again.";
        if (onError) onError(message);
        else alert(message);
      }
    };

    // window.google is injected by the GIS script tag; poll briefly in
    // case this component mounts before that script finishes loading.
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });
        if (buttonRef.current) {
          buttonRef.current.innerHTML = ""; // clear before re-render on theme change
          // Google API accepts width between 200-400; clamp to that range
          // Provide comfortable width so personalized button with full email never clips
          const currentWidth = buttonRef.current?.offsetWidth || containerWidth || 390;
          const btnWidth = Math.min(400, Math.max(250, Math.floor(currentWidth)));
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: theme === "dark" ? "filled_black" : "outline",
            size: "large",
            width: btnWidth,
            text: "continue_with",
          });
        }
      } else {
        setTimeout(tryInit, 100);
      }
    };
    tryInit();

    return () => {
      cancelled = true;
    };
    // Re-render when the app theme toggles or container width changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, containerWidth]);

  return <div ref={buttonRef} className="google-signin-btn" />;
}

export default GoogleSignInButton;
