import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "../../TabsContext";
import { useSearch } from "../../SearchContext";
import { computeStatus } from "./tournamentHelpers";
import { STOCK_IMAGES, getDescriptionPreview, StatusBadge } from "./TournamentCard";
import styles from "./styles/SearchOverlay.module.css";

// ─── Підсвічування збігу в тексті ────────────────────────────────────────────
function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(99,102,241,0.18)", color: "inherit", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Компактна картка турніру для оверлею ────────────────────────────────────
function SearchCard({ tournament, onClick, query }) {
  const status  = computeStatus(tournament);
  const accent  = tournament.accent_color ?? "#6366f1";
  const preview = getDescriptionPreview(tournament.description, 70);

  const formatDate = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || isNaN(d)) return null;
    return d.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  };

  const renderBg = () => {
    if (tournament.image_mode === "custom" && tournament.custom_image) {
      return (
        <img
          src={tournament.custom_image}
          alt={tournament.name}
          className={styles.cardImg}
          style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
        />
      );
    }
    if (tournament.image_mode === "custom") {
      return <div className={styles.cardGradient} style={{ background: "linear-gradient(135deg,#e0e0e4,#f0f0f3)" }} />;
    }
    if (tournament.image_mode === "stock") {
      const g = STOCK_IMAGES.find(i => i.id === tournament.stock_image)?.gradient
        ?? "linear-gradient(135deg,#e0e0e0,#f5f5f5)";
      return <div className={styles.cardGradient} style={{ background: g }} />;
    }
    return null;
  };

  const hasBg = tournament.image_mode === "custom" || tournament.image_mode === "stock";

  return (
    <button className={styles.card} onClick={onClick} type="button">
      <div className={styles.cardAccent} style={{ background: accent }} />
      {hasBg && <div className={styles.cardImageWrap}>{renderBg()}</div>}
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cardName}>
            <HighlightMatch text={tournament.name || "—"} query={query} />
          </span>
          <StatusBadge status={status} />
        </div>
        {preview && <p className={styles.cardDesc}>{preview}</p>}
        {formatDate(tournament.start_date) && (
          <span className={styles.cardDate}>{formatDate(tournament.start_date)}</span>
        )}
      </div>
    </button>
  );
}

// ─── SearchOverlay ────────────────────────────────────────────────────────────
export default function SearchOverlay({ results, loading, onClose }) {
  const navigate        = useNavigate();
  const { addTab }      = useTabs();
  const { clearSearch, searchQuery } = useSearch();
  const overlayRef      = useRef();

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  const openTournament = useCallback((t) => {
    addTab({ id: t.id, name: t.name });
    clearSearch();
    onClose();
    navigate(`/tournament/${t.id}`);
  }, [addTab, clearSearch, onClose, navigate]);

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel} ref={overlayRef}>
        <div className={styles.header}>
          <span className={styles.title}>Результати пошуку</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.skeletonList}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.skeletonCard} style={{ opacity: 1 - i * 0.22 }}>
                  <div className={styles.skeletonImg} />
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonLine} style={{ width: "55%" }} />
                    <div className={styles.skeletonLine} style={{ width: "35%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🔍</span>
              <p>Турнірів не знайдено</p>
            </div>
          ) : (
            <div className={styles.list}>
              {results.map((t) => (
                <SearchCard key={t.id} tournament={t} onClick={() => openTournament(t)} query={searchQuery} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}