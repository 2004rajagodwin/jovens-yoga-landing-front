import { useEffect, useState } from "react";
import { subscribeToasts, dismissToast } from "./toast.js";

const ICONS = {
  success: "bi-check-circle-fill",
  error: "bi-x-circle-fill",
  info: "bi-info-circle-fill",
};

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="jy-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`jy-toast ${t.type}`}>
          <i className={`bi ${ICONS[t.type] || ICONS.info}`}></i>
          <span className="jy-toast-msg">{t.message}</span>
          <button className="jy-toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <i className="bi bi-x"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
