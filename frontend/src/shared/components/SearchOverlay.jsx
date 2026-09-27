import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { useSearch } from "@shared/contexts/SearchContext";
import { computeStatus, TournamentCard } from "@features/tournaments";
import styles from "@shared/styles/SearchOverlay.module.css";

// ─── SearchOverlay ────────────────────────────────────────────────────────────
export function SearchOverlay({ results, loading, onClose }) {
  const navigate        = useNavigate();
  const { addTab }      = useTabs();
  const { clearSearch } = useSearch();
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
    if (t?.id == null) return;
    const id = t.id;
    // Спочатку навігація, потім очищення — щоб закриття оверлею
    // гарантовано не випереджало перехід
    navigate(`/tournament/${id}`);
    addTab({ id, name: t.name });
    clearSearch();
    onClose();
  }, [addTab, clearSearch, onClose, navigate]);

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel} ref={overlayRef} data-search-overlay>
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
                <div
                  key={t.id}
                  className={styles.resultCard}
                  onClick={() => openTournament(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTournament(t); } }}
                >
                  <TournamentCard
                    name={t.name}
                    info={t.description}
                    date={t.start_date}
                    accentColor={t.accent_color}
                    imageMode={t.image_mode}
                    stockImage={t.stock_image}
                    customImage={t.custom_image ?? null}
                    status={computeStatus(t)}
                    compact
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}