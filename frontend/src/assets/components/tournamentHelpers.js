import { useEffect } from "react";

// ─── Date helpers ─────────────────────────────────────────────────────────────

export const formatDate = (value) => {
  if (!value) return "Не вказано";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export const toInputDatetime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
};

export const formatRoundDateRange = (start, end) => {
  const s = start ? formatDate(start) : null;
  const e = end   ? formatDate(end)   : null;
  if (s && e) return `${s} — ${e}`;
  if (s)      return `З ${s}`;
  if (e)      return `До ${e}`;
  return "Дати не вказані";
};

// ─── Status helpers ───────────────────────────────────────────────────────────

export const computeStatus = (t) => {
  const now      = new Date();
  const regStart = t.registration_start ? new Date(t.registration_start) : null;
  const regEnd   = t.registration_end   ? new Date(t.registration_end)   : null;
  const start    = t.start_date         ? new Date(t.start_date)         : null;
  if (start    && now > start)     return "Триває";
  if (regEnd   && now > regEnd)    return "Реєстрація закрита";
  if (regStart && now >= regStart) return "Реєстрація відкрита";
  return "Очікується";
};

// Повертає inline-стилі для бейджу статусу турніру
export const getStatusStyle = (status) => {
  switch (status) {
    case "Триває":
      return { background: "#e6f4ed", color: "#2a7a4b", border: "1px solid #b7e0ca" };
    case "Реєстрація відкрита":
      return { background: "#e6f4ed", color: "#2a7a4b", border: "1px solid #b7e0ca" };
    case "Реєстрація закрита":
      return { background: "#fef9e6", color: "#92700a", border: "1px solid #f0dc9a" };
    case "Завершено":
      return { background: "#f2f2f4", color: "#888", border: "1px solid #ddd" };
    default: // "Очікується"
      return { background: "#eef3ff", color: "#3a5cbf", border: "1px solid #c4d0f5" };
  }
};

// Повертає inline-стилі для бейджу статусу раунду
export const getRoundStatusStyle = (status) => {
  switch (status) {
    case "Триває":
      return { background: "#e6f4ed", color: "#2a7a4b", border: "1px solid #b7e0ca" };
    case "Завершено":
      return { background: "#f2f2f4", color: "#888", border: "1px solid #ddd" };
    default: // "Очікується"
      return { background: "#eef3ff", color: "#3a5cbf", border: "1px solid #c4d0f5" };
  }
};

export const roundStatus = (round) => {
  const now   = new Date();
  const start = round.start_date ? new Date(round.start_date) : null;
  const end   = round.end_date   ? new Date(round.end_date)   : null;
  if (end   && now > end)    return "Завершено";
  if (start && now >= start) return "Триває";
  return "Очікується";
};

// ─── File icon helper ─────────────────────────────────────────────────────────

export const fileIcon = (filename) => {
  const ext = (filename || "").split(".").pop().toLowerCase();
  if (["pdf"].includes(ext))                              return "📄";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))   return "🗜️";
  if (["doc", "docx"].includes(ext))                     return "📝";
  if (["xls", "xlsx"].includes(ext))                     return "📊";
  if (["mp4", "mov", "avi"].includes(ext))               return "🎬";
  return "📎";
};

// ─── Escape key hook ──────────────────────────────────────────────────────────

export function useEscape(handler) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handler(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler]);
}
