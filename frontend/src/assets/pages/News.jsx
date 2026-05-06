import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import API from "../../api";
import styles from "../components/styles/News.module.css";

const PAGE_SIZE = 5;

// ─── Module-level read cache ───────────────────────────────────────────────────
const _readCache = new Set(
  JSON.parse(sessionStorage.getItem("grades_read") || "[]")
);
function markRead(id) {
  if (!id || _readCache.has(id)) return;
  _readCache.add(id);
  sessionStorage.setItem("grades_read", JSON.stringify([..._readCache]));
}
function isRead(item) {
  return item.read || _readCache.has(item.id);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function scoreTier(value, max) {
  if (!max) return "";
  const pct = value / max;
  if (pct >= 0.7) return "high";
  if (pct >= 0.4) return "mid";
  return "low";
}

const AVATARS = ["🏆", "🎯", "📐", "💡", "🚀", "🎨", "📊", "🧩", "⚡", "🌟"];
function taskAvatar(taskTitle = "") {
  const code = [...taskTitle].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATARS[code % AVATARS.length];
}

// ─── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonAvatar} />
      <div className={styles.skeletonLines}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
    </div>
  );
}

// ─── GradeCard ─────────────────────────────────────────────────────────────────

function GradeCard({ item, defaultOpen = false, onRead }) {
  const [open,   setOpen]   = useState(defaultOpen);
  const [unread, setUnread] = useState(!isRead(item));

  const criteria = item.criteria ?? [];
  const scores   = item.scores   ?? {};
  const maxTotal = item.max_total ?? criteria.reduce((a, c) => a + c.max, 0);
  const total    = item.total    ?? 0;
  const tier     = scoreTier(total, maxTotal);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    // Mark as read when opened
    if (next && unread) {
      setUnread(false);
      onRead?.(item.id);
    }
  }

  return (
    <div
      className={`${styles.card} ${unread ? styles.unread : ""}`}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && handleToggle()}
      aria-expanded={open}
    >
      <div className={styles.cardHead}>
        <div className={styles.avatarWrap}>
          {taskAvatar(item.task_title)}
        </div>

        <div className={styles.cardMeta}>
          <p className={styles.cardTask}>{item.task_title || "Завдання"}</p>
          {item.round_title && (
            <p className={styles.cardRound}>
              {item.tournament ? `${item.tournament} · ` : ""}{item.round_title}
            </p>
          )}
          <p className={styles.cardJury}>
            Оцінено: {item.jury_name || "Журі"}
          </p>
        </div>

        {/* Plain score — big numbers, no ring */}
        <div className={styles.cardScore}>
          <span className={`${styles.scoreMain} ${styles[`score_${tier}`]}`}>{total}</span>
          <span className={styles.scoreOf}>/ {maxTotal || "—"}</span>
        </div>
      </div>

      <div className={styles.divider} />
      <button
        className={styles.expandToggle}
        onClick={e => { e.stopPropagation(); handleToggle(); }}
        aria-label={open ? "Згорнути деталі" : "Показати деталі"}
      >
        <svg
          className={`${styles.chevron} ${open ? styles.open : ""}`}
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {open ? "Сховати деталі" : "Показати деталі"}
      </button>

      {open && (
        <div className={styles.cardBody} onClick={e => e.stopPropagation()}>
          {criteria.length > 0 && (
            <div className={styles.criteriaSection}>
              <p className={styles.sectionLabel}>Критерії оцінювання</p>
              {criteria.map(c => {
                const val   = Number(scores[c.key]) || 0;
                const cpct  = Math.min(100, c.max ? (val / c.max) * 100 : 0);
                const cTier = scoreTier(val, c.max);
                return (
                  <div key={c.key} className={styles.criterionRow}>
                    <div className={styles.criterionTop}>
                      <span className={styles.criterionName}>{c.label}</span>
                      <span className={`${styles.criterionScore} ${styles[`cs_${cTier}`]}`}>
                        {val} / {c.max}
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={`${styles.barFill} ${styles[cTier]}`}
                        style={{ width: `${cpct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {item.comment && (
            <div className={styles.commentBox}>
              <p className={styles.sectionLabel} style={{ marginBottom: 6 }}>Коментар журі</p>
              <p className={styles.commentText}>{item.comment}</p>
            </div>
          )}

          <p className={styles.cardTimestamp}>Оцінено: {formatDate(item.graded_at)}</p>
        </div>
      )}
    </div>
  );
}

// ─── News ──────────────────────────────────────────────────────────────────────

const News = () => {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visible,     setVisible]     = useState(PAGE_SIZE);
  const [hasMore,     setHasMore]     = useState(false);
  useEffect(() => {
    API.get("/tournaments/my-grades/")
      .then(r => {
        const data = r.data ?? [];
        setItems(data);
        setHasMore(data.length > PAGE_SIZE);
      })
      .catch(err => {
        console.error("Помилка завантаження новин:", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRead = (id) => {
    if (!id) return;
    // Mutate the items array directly so re-mounts don't restore unread state
    markRead(id);
    API.post(`/tournaments/my-grades/${id}/read/`).catch(() => {});
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      const next = visible + PAGE_SIZE;
      setVisible(next);
      setHasMore(next < items.length);
      setLoadingMore(false);
    }, 400);
  };

  const unreadCount = items.filter(i => !isRead(i)).length;
  const visibleItems = items.slice(0, visible);

  return (
    <NavBar>
      <div className={styles.page}>
        <div className={styles.container}>

          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Новини</h1>
              <p className={styles.subtitle}>Оцінки та відгуки від журі</p>
            </div>
            {!loading && unreadCount > 0 && (
              <span className={styles.unreadBadge}>
                {unreadCount} нових
              </span>
            )}
          </div>

          <div className={styles.feed}>
            {loading && [1, 2, 3].map(n => <SkeletonCard key={n} />)}

            {!loading && items.length === 0 && (
              <div className={styles.empty}>
                <svg className={styles.emptyIllustration} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
                  <path d="M26 32h28M26 40h20M26 48h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="56" cy="52" r="10" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M53 52h6M56 49v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p className={styles.emptyTitle}>Новин поки немає</p>
                <p className={styles.emptyText}>
                  Коли журі оцінить ваші роботи — оцінки та відгуки з'являться тут
                </p>
              </div>
            )}

            {!loading && visibleItems.map((item, idx) => (
              <GradeCard
                key={item.id ?? idx}
                item={item}
                defaultOpen={idx === 0 && !isRead(item)}
                onRead={handleRead}
              />
            ))}
          </div>

          {!loading && hasMore && (
            <div className={styles.loadMoreWrap}>
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className={styles.loadMoreSpinner} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
                {loadingMore ? "Завантаження…" : `Показати ще (${items.length - visible})`}
              </button>
            </div>
          )}

        </div>
      </div>
    </NavBar>
  );
};

export default News;
