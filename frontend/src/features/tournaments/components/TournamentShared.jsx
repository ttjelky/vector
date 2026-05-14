import { useEffect } from "react";
import styles from "../styles/TournamentShared.module.css";
import { useEscape } from "./tournamentHelpers";
import { getStatusStyle, getRoundStatusStyle } from "./tournamentHelpers";

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }) {
  const map = {
    upcoming:     { label: "Очікується",          color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
    registration: { label: "Реєстрація команд",   color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
    ongoing:      { label: "Триває",              color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
    finished:     { label: "Завершено",           color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  };
  const s = map[status] ?? map.upcoming;
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 600,
      color: s.color, background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 100, padding: "3px 10px",
    }}>
      {s.label}
    </span>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

export function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`${styles.toast} ${styles[`toast_${type}`]}`}>
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

export function ConfirmDeleteModal({
  icon = "🗑️",
  title,
  description,
  confirmLabel = "Так, видалити",
  onConfirm,
  onCancel,
  loading,
}) {
  useEscape(onCancel);

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>{icon}</div>
        <h2 className={styles.modalTitle}>{title}</h2>
        <p className={styles.modalText}>{description}</p>
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={onCancel} disabled={loading}>
            Ні, скасувати
          </button>
          <button className={styles.modalConfirm} onClick={onConfirm} disabled={loading}>
            {loading ? "Видалення…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
