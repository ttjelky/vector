import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import API from "@api";
import NavBar from "@shared/components/NavBar";
import TournamentCard from "@shared/components/TournamentCard";
import styles from "@shared/styles/jurydashboard.module.css";

// ── Pending card ──────────────────────────────────────────────────────────────
function PendingCard({ item, onClick }) {
  const urgency = item.pending_count >= 10 ? "high"
                : item.pending_count >= 3  ? "mid"
                : "low";

  return (
    <div className={`${styles.pendingCard} ${styles[`urgency_${urgency}`]}`} onClick={onClick}>
      <div className={styles.pendingTop}>
        <span className={styles.pendingCount}>{item.pending_count}</span>
        <span className={styles.pendingLabel}>робіт</span>
      </div>
      <p className={styles.pendingName}>{item.tournament_name}</p>
      <span className={styles.pendingCta}>Оцінити →</span>
    </div>
  );
}

// ── Notification tile ─────────────────────────────────────────────────────────
function NotifTile({ n, onRead }) {
  const handleClick = () => {
    // БАГ 3 ФІК: завжди викликаємо onRead, навіть якщо вже прочитане
    // щоб уникнути проблем з подіями
    if (!n.is_read) onRead(n.id);
  };

  return (
    <div
      className={`${styles.notifTile} ${n.is_read ? styles.notif_read : styles.notif_unread}`}
      onClick={handleClick}
      style={{ cursor: n.is_read ? "default" : "pointer" }}
    >
      {!n.is_read && <span className={styles.notifDot} />}
      <div className={styles.notifContent}>
        {n.subject && <span className={styles.notifTitle}>{n.subject}</span>}
        <span className={styles.notifMsg}>{n.text}</span>
        {n.tournament && <span className={styles.notifTag}>🏆 {n.tournament}</span>}
      </div>
      <span className={styles.notifTime}>{n.created_at}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const JuryDashboard = () => {
  const navigate   = useNavigate();
  const { addTab } = useTabs();

  const [tournaments,   setTournaments]   = useState([]);
  const [pending,       setPending]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingT,      setLoadingT]      = useState(true);
  const [loadingP,      setLoadingP]      = useState(true);
  const [loadingN,      setLoadingN]      = useState(true);

  // carousel
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [animDir,      setAnimDir]      = useState("next");
  const timerRef = useRef(null);

  useEffect(() => {
    API.get("/tournaments/")
      .then(r => setTournaments(r.data))
      .catch(() => {})
      .finally(() => setLoadingT(false));

    API.get("/tournaments/jury/pending-submissions/")
      .then(r => setPending(r.data))
      .catch(() => {})
      .finally(() => setLoadingP(false));

    API.get("/notifications/")
      .then(r => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoadingN(false));
  }, []);

  // ── mark read ──────────────────────────────────────────────────────────────
  const markOneRead = useCallback(async (id) => {
    // БАГ 3 ФІК: оновлюємо стан ПЕРЕД запитом для миттєвого UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await API.post(`/notifications/mark-read/${id}/`);
    } catch {
      // якщо помилка — відкатуємо
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await API.post("/notifications/mark-read/");
    } catch {
      // тихо
    }
  }, []);

  // ── carousel ───────────────────────────────────────────────────────────────
  const goTo = useCallback((dir) => {
    if (isAnimating || tournaments.length === 0) return;
    setAnimDir(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(prev =>
        dir === "next"
          ? (prev + 1) % tournaments.length
          : (prev - 1 + tournaments.length) % tournaments.length
      );
      setIsAnimating(false);
    }, 320);
  }, [isAnimating, tournaments.length]);

  useEffect(() => {
    if (tournaments.length < 2) return;
    timerRef.current = setInterval(() => goTo("next"), 30000);
    return () => clearInterval(timerRef.current);
  }, [goTo, tournaments.length]);

  const resetTimer = (dir) => {
    clearInterval(timerRef.current);
    goTo(dir);
    timerRef.current = setInterval(() => goTo("next"), 30000);
  };

  const current      = tournaments[currentIndex];
  const totalPending = pending.reduce((s, p) => s + p.pending_count, 0);
  const unreadCount  = notifications.filter(n => !n.is_read).length;

  return (
    <NavBar>
      <div className={styles.contentArea}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Панель журі</h2>
          <p className={styles.pageSubtitle}>Ваші турніри та роботи що очікують оцінки</p>
        </div>

        {/* Stat strip */}
        {!loadingP && (totalPending > 0 || tournaments.length > 0) && (
          <div className={styles.statStrip}>
            <div className={styles.statChip}>
              <span className={styles.statNum}>{totalPending}</span>
              <span className={styles.statLbl}>робіт чекають оцінки</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statNum}>{pending.length}</span>
              <span className={styles.statLbl}>турнірів активних</span>
            </div>
            {unreadCount > 0 && (
              <div className={styles.statChip}>
                <span className={styles.statNum}>{unreadCount}</span>
                <span className={styles.statLbl}>нових сповіщень</span>
              </div>
            )}
          </div>
        )}

        {/* Main grid */}
        <div className={styles.mainGrid}>

          {/* LEFT — Tournament carousel */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Мої турніри</h3>
              {tournaments.length > 1 && (
                <div className={styles.carouselControls}>
                  <button className={styles.arrowBtn} onClick={() => resetTimer("prev")}>‹</button>
                  <span className={styles.carouselDots}>
                    {tournaments.map((_, i) => (
                      <span key={i} className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ""}`} />
                    ))}
                  </span>
                  <button className={styles.arrowBtn} onClick={() => resetTimer("next")}>›</button>
                </div>
              )}
            </div>

            <div className={styles.carouselWrapper}>
              {loadingT ? (
                <div className={styles.skeletonCard}>
                  <div className={styles.skeletonImg} />
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonLine} style={{ width: "55%" }} />
                    <div className={styles.skeletonLine} style={{ width: "35%" }} />
                  </div>
                </div>
              ) : current ? (
                <div
                  className={`${styles.carouselSlide} ${
                    isAnimating
                      ? animDir === "next" ? styles.slideExitLeft : styles.slideExitRight
                      : styles.slideEnter
                  }`}
                  onClick={() => {
                    addTab({ id: current.id, name: current.name });
                    navigate(`/tournament/${current.id}`);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* БАГ 2 ФІК: передаємо status */}
                  <TournamentCard
                    name={current.name}
                    info={current.description}
                    date={current.start_date}
                    status={current.status}
                    accentColor={current.accent_color}
                    imageMode={current.image_mode}
                    stockImage={current.stock_image}
                    customImage={
                      current.custom_image
                        ? (current.custom_image.startsWith("http")
                            ? current.custom_image
                            : `http://localhost:8000${current.custom_image}`)
                        : null
                    }
                  />
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🏆</span>
                  <span>Немає турнірів</span>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT — Pending submissions */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                Чекають оцінки
                {totalPending > 0 && (
                  <span className={styles.pendingBadge}>{totalPending}</span>
                )}
              </h3>
            </div>

            {loadingP ? (
              <div className={styles.pendingGrid}>
                {[0,1,2].map(i => (
                  <div key={i} className={styles.skeletonPending}>
                    <div className={styles.skeletonLine} style={{ width: "40%", height: 32 }} />
                    <div className={styles.skeletonLine} style={{ width: "70%" }} />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✅</span>
                <span>Всі роботи оцінено!</span>
              </div>
            ) : (
              <div className={styles.pendingGrid}>
                {pending.map(item => (
                  <PendingCard
                    key={item.tournament_id}
                    item={item}
                    onClick={() => {
                      addTab({ id: item.tournament_id, name: item.tournament_name });
                      navigate(`/tournament/${item.tournament_id}`);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Notifications strip */}
        <section className={styles.notifSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Сповіщення
              {/* БАГ 3 ФІК: key примушує ре-рендер при зміні unreadCount */}
              {unreadCount > 0 && (
                <span key={unreadCount} className={styles.notifCount}>{unreadCount}</span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>
                Прочитати всі
              </button>
            )}
          </div>

          <div className={styles.notifList}>
            {loadingN ? (
              [0,1,2].map(i => (
                <div key={i} className={styles.skeletonTile}>
                  <div className={styles.skeletonLine} style={{ width: "40%" }} />
                  <div className={styles.skeletonLine} style={{ width: "75%" }} />
                </div>
              ))
            ) : notifications.length === 0 ? (
              <p className={styles.emptyInline}>Немає сповіщень</p>
            ) : (
              notifications.map(n => (
                <NotifTile key={n.id} n={n} onRead={markOneRead} />
              ))
            )}
          </div>
        </section>

      </div>
    </NavBar>
  );
};

export default JuryDashboard;