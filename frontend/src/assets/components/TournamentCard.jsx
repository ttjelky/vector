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
// Таблиці → "Таблиця", списки → перший елемент, решту тегів прибирає.
export function getDescriptionPreview(html, maxLen = 80) {
  if (!html) return "";
  // Таблиці → "Таблиця"
  let result = html.replace(/<table[\s\S]*?<\/table>/gi, " Таблиця ");
  // Списки: витягуємо лише перший <li>
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
  // Прибираємо решту тегів
  const plain = result.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

const formatDate = (value) => {
  const d = value ? new Date(value) : new Date();
  return isNaN(d.getTime())
    ? new Date().toLocaleDateString("uk-UA", { day: "numeric", month: "long" })
    : d.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
};

export default function TournamentCard({
  name, info, date, accentColor,
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
          <div className={styles.previewBadge}>Реєстрація відкрита</div>
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
