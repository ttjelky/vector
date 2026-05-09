import styles from "./styles/CreateTournamentModal.module.css";
import "./styles/richContent.css";

export const STOCK_IMAGES = [
  { id: "blue",  gradient: "linear-gradient(135deg, #c0caf7 0%, #95b7d7 100%)" },
  { id: "green",  gradient: "linear-gradient(135deg, #c8f6b3 0%, #97bc69 100%)" },
  { id: "purple", gradient: "linear-gradient(135deg, #f9a7d7 0%, #b857f5 100%)" },
  { id: "golden", gradient: "linear-gradient(135deg, #fddaae 0%, #e0c756 100%)" },
  { id: "red",    gradient: "linear-gradient(135deg, #fdb5ae 0%, #d04d3e 100%)" },
  { id: "of us",  gradient: "linear-gradient(135deg, #6386e5 0%, #c95344 100%)" },
];

// ─── Rich-text preview helper ─────────────────────────────────────────────────
export function getDescriptionPreview(html, maxLen = 80) {
  if (!html) return "";
  let result = html.replace(/<table[\s\S]*?<\/table>/gi, " Таблиця ");
  result = result.replace(/<ul[\s\S]*?<\/ul>/gi, (match) => {
    const firstLi = match.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
    if (!firstLi) return "";
    const text = firstLi[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return " " + text + "… ";
  });
  result = result.replace(/<ol[\s\S]*?<\/ol>/gi, (match) => {
    const firstLi = match.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
    if (!firstLi) return "";
    const text = firstLi[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return " " + text + "… ";
  });
  const plain = result.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

// ─── Статусний бейдж ──────────────────────────────────────────────────────────
// Статуси: "upcoming" | "registration" | "ongoing" | "finished"
const STATUS_CONFIG = {
  upcoming:     { label: "Очікується",        color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  registration: { label: "Реєстрація команд", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  ongoing:      { label: "Триває",            color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  finished:     { label: "Завершено",         color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
};

export function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.upcoming;
  return (
    <span style={{
      fontSize: 11.5,
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 100,
      padding: "3px 10px",
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

const formatDate = (value) => {
  const d = value ? new Date(value) : new Date();
  return isNaN(d.getTime())
    ? new Date().toLocaleDateString("uk-UA", { day: "numeric", month: "long" })
    : d.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
};

export default function TournamentCard({
  name, info, date, accentColor, status,
  imageMode = "none", stockImage, customImage,
}) {
  const renderImage = () => {
    if (imageMode === "custom" && customImage) {
      return (
        <div className={styles.previewImage}>
          <img src={customImage} alt={name} className={styles.cardImg} />
        </div>
      );
    }
    if (imageMode === "stock") {
      const gradient = STOCK_IMAGES.find(i => i.id === stockImage)?.gradient
        ?? "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)";
      return <div className={styles.previewImage} style={{ background: gradient }} />;
    }
    return null;
  };

  return (
    <div className={styles.previewCard} style={{ "--accent": accentColor }}>
      {renderImage()}
      <div className={styles.previewContent}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewName}>{name || "Назва вашого турніру"}</h3>
          <StatusBadge status={status ?? "upcoming"} />
        </div>
        <p className={styles.previewInfo} style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "block",
          maxWidth: "100%",
        }}>
          {info ? getDescriptionPreview(info, 80) : "Детальний опис вашого турніру, який буде видно учасникам."}
        </p>
        <div className={styles.previewFooter}>
          <span className={styles.previewDate}>{formatDate(date)}</span>
        </div>
      </div>
    </div>
  );
}
