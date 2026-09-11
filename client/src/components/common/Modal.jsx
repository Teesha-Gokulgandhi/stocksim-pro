import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import "./Modal.css";

/**
 * Accessible, animated modal dialog.
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {string} [title]
 * @param {"sm"|"md"|"lg"|"xl"} [size="md"]
 * @param {boolean} [closeOnOverlay=true]
 * @param {React.ReactNode} children
 */
function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  closeOnOverlay = true,
  children,
}) {
  const dialogRef = useRef(null);

  // Trap focus and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    // Prevent body scroll while modal is open
    document.body.style.overflow = "hidden";

    // Focus the dialog for accessibility
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={closeOnOverlay ? onClose : undefined}
      role="presentation"
    >
      <div
        className={`modal-dialog modal-dialog--${size}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="modal-header">
            {title && (
              <h3 id="modal-title" className="modal-title">
                {title}
              </h3>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <FiX />
            </button>
          </div>
        )}

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
