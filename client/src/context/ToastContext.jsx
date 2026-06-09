import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Per la modale di conferma
  const [confirm, setConfirm] = useState(null); // { message, resolveRef }

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Mostra una modale di conferma al posto di window.confirm().
   * Ritorna una Promise<boolean>.
   */
  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  }, []);

  const handleConfirmChoice = (result) => {
    if (confirm?.resolve) confirm.resolve(result);
    setConfirm(null);
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: showConfirm }}>
      {children}

      {/* ── Toast stack ── */}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item toast-${t.type}`}
            role="alert"
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon">
              {t.type === "success" && "✓"}
              {t.type === "error" && "✕"}
              {t.type === "info" && "ℹ"}
              {t.type === "warning" && "⚠"}
            </span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── Confirm modal ── */}
      {confirm && (
        <div className="toast-confirm-overlay" role="dialog" aria-modal="true">
          <div className="toast-confirm-box">
            <p className="toast-confirm-msg">{confirm.message}</p>
            <div className="toast-confirm-actions">
              <button
                className="toast-confirm-btn toast-confirm-cancel"
                onClick={() => handleConfirmChoice(false)}
              >
                Annulla
              </button>
              <button
                className="toast-confirm-btn toast-confirm-ok"
                onClick={() => handleConfirmChoice(true)}
                autoFocus
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/**
 * Hook per usare toast e confirm da qualsiasi componente.
 * @returns {{ toast: (msg, type?, duration?) => void, confirm: (msg) => Promise<boolean> }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
