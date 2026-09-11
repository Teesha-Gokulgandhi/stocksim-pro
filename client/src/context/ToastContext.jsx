import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from "react-icons/fi";
import "./Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, title, duration = 3500) => {
    if (!message) return;

    setToasts((prev) => {
      // 1. Deduplication: Don't show duplicate toasts if identical message is already active
      const isDuplicate = prev.some(
        (t) => t.message === message && t.title === title && t.type === type
      );
      if (isDuplicate) return prev;

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast = { id, type, message, title };

      // Set auto-dismiss timer
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      // 2. Queue Limit: Keep at most 3 toasts on screen to prevent vertical overflow
      const capped = prev.length >= 3 ? [...prev.slice(prev.length - 2), newToast] : [...prev, newToast];
      return capped;
    });
  }, [removeToast]);

  const toast = useMemo(
    () => ({
      success: (msg, title = "Success") => addToast("success", msg, title),
      error: (msg, title = "Error") => addToast("error", msg, title, 4500),
      info: (msg, title = "Info") => addToast("info", msg, title),
      warning: (msg, title = "Warning") => addToast("warning", msg, title),
    }),
    [addToast]
  );

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <FiCheckCircle className="toast-icon success" />;
      case "error":
        return <FiAlertCircle className="toast-icon error" />;
      case "warning":
        return <FiAlertTriangle className="toast-icon warning" />;
      default:
        return <FiInfo className="toast-icon info" />;
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <div className="toast-icon-wrap">{getIcon(t.type)}</div>
            <div className="toast-content">
              {t.title && <h4 className="toast-title">{t.title}</h4>}
              <p className="toast-message">{t.message}</p>
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Close notification"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
