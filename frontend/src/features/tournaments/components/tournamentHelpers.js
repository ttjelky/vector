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

// Чотири статуси турніру. Пріоритет перевірок (має збігатися з бекендом
// Tournament.registration_status, де finished > exception > open > window):
//   "finished"     — після end_date (навіть з винятком/вільною реєстрацією) → Завершено
//   "registration" — реєстрація відкрита: виняток активний, або
//                    open_registration=true, або зараз усередині вікна
//                    [registration_start, registration_end], або дат
//                    реєстрації немає взагалі (бета: відкрито до фінішу) → Реєстрація
//   "upcoming"     — реєстрація ще не починалась (now < registration_start),
//                    або турнір ще не стартував і реєстрація закрита → Очікується
//   "ongoing"      — реєстрація вже закрилась (now > registration_end),
//                    турнір стартував і ще триває → Триває
//
// Увага: з "Вільною реєстрацією" статус тримається "registration" аж до
// finished (реєстрація ніколи не закривається). Тому видимість раундів /
// завдань НЕ можна прив'язувати тільки до "ongoing" — RoundsTab окремо
// враховує openRegistration (див. canSeeRounds).
export const computeStatus = (t) => {
  const now    = new Date();
  const start  = t.start_date         ? new Date(t.start_date)         : null;
  const end    = t.end_date           ? new Date(t.end_date)           : null;
  const regStart = t.registration_start ? new Date(t.registration_start) : null;
  const regEnd   = t.registration_end   ? new Date(t.registration_end)   : null;
  const exceptionUntil = t.registration_exception_until
    ? new Date(t.registration_exception_until)
    : null;

  // 1. Фініш — найвищий пріоритет (як на бекенді).
  if (end && now > end)        return "finished";

  // 2. Активний виняток відкриває реєстрацію (але не після фінішу — див. вище).
  if (exceptionUntil && now < exceptionUntil) return "registration";

  // 3. Вільна реєстрація — відкрита до завершення турніру.
  if (t.open_registration)     return "registration";

  // 4. Явне вікно реєстрації.
  if (regStart || regEnd) {
    // Ще не почалась — чекаємо (навіть якщо турнір уже стартував).
    if (regStart && now < regStart) return "upcoming";
    // Вже закінчилась — турнір триває (або ще не стартував → upcoming).
    if (regEnd && now > regEnd) {
      if (!start || now < start) return "upcoming";
      return "ongoing";
    }
    return "registration";
  }

  // 5. Дат реєстрації немає — бекенд вважає відкритою до фінішу.
  // Для бейджа показуємо фазу турніру, а відкритість береться з
  // registration_open з API (див. ParticipantsTab baseOpen):
  //   не стартував → upcoming, стартував → ongoing.
  // (Раніше тут завжди було "upcoming" при відсутності start_date,
  // що ховало раунди навіть у активному турнірі без дат.)
  if (!start || now < start)   return "upcoming";
  return "ongoing";
};

// Повертає inline-стилі для бейджу статусу турніру
export const getStatusStyle = (status) => {
  switch (status) {
    case "ongoing":
      return { background: "#e6f4ed", color: "#2a7a4b", border: "none" };
    case "registration":
      return { background: "#eff6ff", color: "#1d4ed8", border: "none" };
    case "finished":
      return { background: "#f2f2f4", color: "#888", border: "none" };
    default: // "upcoming"
      return { background: "#fffbeb", color: "#b45309", border: "none" };
  }
};

// Повертає inline-стилі для бейджу статусу раунду
export const getRoundStatusStyle = (status) => {
  switch (status) {
    case "Триває":
      return { background: "#e6f4ed", color: "#2a7a4b", border: "none" };
    case "Завершено":
      return { background: "#f2f2f4", color: "#888", border: "none" };
    default: // "Очікується"
      return { background: "#eef3ff", color: "#3a5cbf", border: "none" };
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
  if (["pdf"].includes(ext))                               return "📄";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))    return "🗜️";
  if (["doc", "docx"].includes(ext))                      return "📝";
  if (["xls", "xlsx"].includes(ext))                      return "📊";
  if (["mp4", "mov", "avi"].includes(ext))                return "🎬";
  return "📎";
};

// ─── Plural helper ────────────────────────────────────────────────────────────

// Українська плюралізація: pluralize(1, "турнір", "турніри", "турнірів") → "1 турнір"
export const pluralize = (n, one, few, many) => {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  const form = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${n} ${form}`;
};

// ─── Спільні хелпери вкладки «Турніри» ────────────────────────────────────────

export const STATUS_ORDER = { ongoing: 0, registration: 1, upcoming: 2, finished: 3 };

export function startMs(t) {
  if (!t.start_date) return null;
  const ms = new Date(t.start_date).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function sortTournaments(list, sortBy, sortAsc) {
  const dir = sortAsc ? 1 : -1;
  return [...list].sort((a, b) => {
    if (sortBy === "date") {
      const da = startMs(a);
      const db = startMs(b);
      // Без дати — завжди в кінець, в обох напрямках.
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return (da - db) * dir;
    }
    if (sortBy === "status") {
      const sa = STATUS_ORDER[computeStatus(a)] ?? 99;
      const sb = STATUS_ORDER[computeStatus(b)] ?? 99;
      if (sa !== sb) return (sa - sb) * dir;
      return (a.name ?? "").localeCompare(b.name ?? "", "uk");
    }
    return (a.name ?? "").localeCompare(b.name ?? "", "uk") * dir;
  });
}

// Чистий текст з HTML-опису для пошуку (без обрізання).
export function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Пошук по назві + очищеному опису: теги не повинні збігатися.
export function matchesQuery(t, q) {
  if (!q) return true;
  const hay = `${t.name ?? ""} ${stripHtml(t.description ?? "")}`.toLowerCase();
  return hay.includes(q);
}

// ─── Escape key hook ──────────────────────────────────────────────────────────

export function useEscape(handler) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handler(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler]);
}
