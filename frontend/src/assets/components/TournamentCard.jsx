import styles from "./styles/CreateTournamentModal.module.css";

export const STOCK_IMAGES = [
  { id: "arena",  gradient: "linear-gradient(135deg, #c0caf7 0%, #a5c1dc 100%)" },
  { id: "field",  gradient: "linear-gradient(135deg, #c8f6b3 0%, #97bc69 100%)" },
  { id: "league", gradient: "linear-gradient(135deg, #f9a7d7 0%, #b857f5 100%)" },
  { id: "cup",    gradient: "linear-gradient(135deg, #fddaae 0%, #e0c756 100%)" },
];

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
        <p className={styles.previewInfo}>
          {info
            ? (info.length > 100 ? info.slice(0, 100) + "…" : info)
            : "Детальний опис вашого турніру, який буде видно учасникам."}
        </p>
        <div className={styles.previewFooter}>
          <span className={styles.previewDate}>{formatDate(date)}</span>
        </div>
      </div>
    </div>
  );
}
