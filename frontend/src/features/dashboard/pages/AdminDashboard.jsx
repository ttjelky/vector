import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { API } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "@features/tournaments";
import styles from "../styles/admindashboard.module.css";

// ── Notification tile ─────────────────────────────────────────────────────────
const NotificationTile = ({ notification }) => (
  <div className={`${styles.notifTile} ${notification.is_read ? styles.notif_read : styles.notif_unread}`}>
    <div className={styles.notifContent}>
      {notification.subject && (
        <span className={styles.notifTitle}>{notification.subject}</span>
      )}
      <span className={styles.notifMsg}>{notification.text}</span>
      {notification.tournament && (
        <span className={styles.notifTournamentTag}>🏆 {notification.tournament}</span>
      )}
      {notification.links?.length > 0 && (
        <div className={styles.notifLinkList}>
          {notification.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" className={styles.notifLink}>
              {l.label || l.url}
            </a>
          ))}
        </div>
      )}
    </div>
    <div className={styles.notifMeta}>
      {notification.sender_full || notification.sender ? (
        <span className={styles.notifSender}>{notification.sender_full || notification.sender}</span>
      ) : null}
      <span className={styles.notifTime}>{notification.created_at}</span>
    </div>
    {!notification.is_read && <span className={styles.notifDot} />}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { addTab } = useTabs();

  const [tournaments,   setTournaments]   = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingT,      setLoadingT]      = useState(true);
  const [loadingN,      setLoadingN]      = useState(true);

  const [currentIndex, setCurrentIndex]   = useState(0);
  const [isAnimating,  setIsAnimating]    = useState(false);
  const [animDir,      setAnimDir]        = useState("next");
  const timerRef = useRef(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    API.get("/tournaments/")
      .then(r => setTournaments(r.data))
      .catch(() => {})
      .finally(() => setLoadingT(false));

    API.get("/notifications/")
      .then(r => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoadingN(false));
  }, []);

  // ── mark read ──────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    await API.post("/notifications/mark-read/");
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markOneRead = async (id) => {
    await API.post(`/notifications/mark-read/${id}/`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

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

  const current = tournaments[currentIndex];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NavBar>
      <div className={styles.contentArea}>

        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Головна панель адміністратора</h2>
          <p className={styles.pageSubtitle}>Огляд турнірів та останніх сповіщень</p>
        </div>

        {/* ── Two-column grid ── */}
        <div className={styles.mainGrid}>

          {/* LEFT — Carousel */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Турніри</h3>
              {tournaments.length > 1 && (
                <div className={styles.carouselControls}>
                  <button className={styles.arrowBtn} onClick={() => resetTimer("prev")} aria-label="Попередній">‹</button>
                  <span className={styles.carouselDots}>
                    {tournaments.map((_, i) => (
                      <span key={i} className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ""}`} />
                    ))}
                  </span>
                  <button className={styles.arrowBtn} onClick={() => resetTimer("next")} aria-label="Наступний">›</button>
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
                  <TournamentCard
                    name={current.name}
                    info={current.description}
                    date={current.start_date}
                    accentColor={current.accent_color}
                    imageMode={current.image_mode}
                    stockImage={current.stock_image}
                    customImage={
                      current.custom_image
                        ? (current.custom_image.startsWith("http") ? current.custom_image : `http://localhost:8000${current.custom_image}`)
                        : null
                    }
                  />
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🏆</span>
                  <span>Турнірів ще немає</span>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT — Notifications */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                Сповіщення
                {unreadCount > 0 && <span className={styles.notifCount}>{unreadCount}</span>}
              </h3>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={markAllRead}>
                  Прочитати всі
                </button>
              )}
            </div>

            <div className={styles.notifGrid}>
              {loadingN ? (
                [0,1,2].map(i => (
                  <div key={i} className={styles.skeletonTile}>
                    <div className={styles.skeletonLine} style={{ width: "50%" }} />
                    <div className={styles.skeletonLine} style={{ width: "80%" }} />
                  </div>
                ))
              ) : notifications.length === 0 ? (
                <p className={styles.emptyState}>Немає нових сповіщень</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => !n.is_read && markOneRead(n.id)}>
                    <NotificationTile notification={n} />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

      </div>
    </NavBar>
  );
};

export { AdminDashboard };