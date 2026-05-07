import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import styles from "../components/styles/admindashboard.module.css";

// ── API helpers (замінити на свої реальні імпорти) ──────────────────────────
// import { getTournaments, getNotifications } from "../../api";

const MOCK_TOURNAMENTS = [
  {
    id: 1,
    name: "example424242",
    description: "example опис",
    date: "7 травня",
    status: "open",
    gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 40%, #ef4444 100%)",
  },
  {
    id: 2,
    name: "eaxample 2",
    description: "67",
    date: "7 травня",
    status: "open",
    gradient: "linear-gradient(135deg, #f472b6 0%, #e879f9 50%, #a855f7 100%)",
  },
  {
    id: 3,
    name: "Tournament 3",
    description: "Третій турнір для прикладу",
    date: "10 травня",
    status: "closed",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)",
  },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: "info", title: "Новий учасник", message: "Сергій Дейнега зареєструвався на турнір", time: "2 хв тому" },
  { id: 2, type: "warning", title: "Турнір завтра", message: "example424242 розпочнеться завтра о 10:00", time: "1 год тому" },
  { id: 3, type: "success", title: "Результати збережено", message: "Результати раунду 3 успішно збережено", time: "3 год тому" },
  { id: 4, type: "info", title: "Нова реєстрація", message: "5 нових учасників зареєструвалося", time: "вчора" },
  { id: 5, type: "error", title: "Помилка синхронізації", message: "Не вдалося синхронізувати дані з сервером", time: "вчора" },
  { id: 6, type: "success", title: "Турнір завершено", message: "eaxample 2 успішно завершено", time: "2 дні тому" },
];

const STATUS_LABELS = {
  open: "Реєстрація відкрита",
  closed: "Закрито",
  ongoing: "Триває",
};

const NOTIFICATION_ICONS = {
  info: "ℹ️",
  warning: "⚠️",
  success: "✅",
  error: "❌",
};

const placeholders = [
  { icon: "📊", title: "Аналітика", description: "Огляд статистики турнірів, учасників та активності — у розробці." },
  { icon: "👥", title: "Управління користувачами", description: "Перегляд, редагування та модерація акаунтів — у розробці." },
  { icon: "📋", title: "Звіти", description: "Автоматичне генерування звітів по турнірах та роботах — у розробці." },
];

// ────────────────────────────────────────────────────────────────────────────

const TournamentCard = ({ tournament }) => (
  <div className={styles.tournamentCard}>
    <div className={styles.cardBanner} style={{ background: tournament.gradient }} />
    <div className={styles.cardBody}>
      <div className={styles.cardTopRow}>
        <span className={styles.cardTitle}>{tournament.name}</span>
        <span className={`${styles.statusBadge} ${styles[`status_${tournament.status}`]}`}>
          {STATUS_LABELS[tournament.status] ?? tournament.status}
        </span>
      </div>
      {tournament.description && (
        <p className={styles.cardDesc}>{tournament.description}</p>
      )}
      <span className={styles.dateBadge}>{tournament.date}</span>
    </div>
  </div>
);

const NotificationTile = ({ notification }) => (
  <div className={`${styles.notifTile} ${styles[`notif_${notification.type}`]}`}>
    <span className={styles.notifIcon}>{NOTIFICATION_ICONS[notification.type]}</span>
    <div className={styles.notifContent}>
      <span className={styles.notifTitle}>{notification.title}</span>
      <span className={styles.notifMsg}>{notification.message}</span>
    </div>
    <span className={styles.notifTime}>{notification.time}</span>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDir, setAnimDir] = useState("next");
  const timerRef = useRef(null);

  // ── fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Замінити на реальні API виклики:
    // getTournaments().then(setTournaments).catch(() => setTournaments(MOCK_TOURNAMENTS));
    // getNotifications().then(setNotifications).catch(() => setNotifications(MOCK_NOTIFICATIONS));
    setTournaments(MOCK_TOURNAMENTS);
    setNotifications(MOCK_NOTIFICATIONS);
  }, []);

  // ── carousel logic ─────────────────────────────────────────────────────────
  const goTo = useCallback(
    (dir) => {
      if (isAnimating || tournaments.length === 0) return;
      setAnimDir(dir);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) =>
          dir === "next"
            ? (prev + 1) % tournaments.length
            : (prev - 1 + tournaments.length) % tournaments.length
        );
        setIsAnimating(false);
      }, 320);
    },
    [isAnimating, tournaments.length]
  );

  useEffect(() => {
    if (tournaments.length < 2) return;
    timerRef.current = setInterval(() => goTo("next"), 15000);
    return () => clearInterval(timerRef.current);
  }, [goTo, tournaments.length]);

  const resetTimer = (dir) => {
    clearInterval(timerRef.current);
    goTo(dir);
    timerRef.current = setInterval(() => goTo("next"), 15000);
  };

  const current = tournaments[currentIndex];

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <NavBar>
      <div className={styles.contentArea}>

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Головна панель адміністратора</h2>
          <p className={styles.pageSubtitle}>Огляд турнірів та останніх сповіщень</p>
        </div>

        {/* ── Two-column layout ── */}
        <div className={styles.mainGrid}>

          {/* LEFT — Tournament Carousel */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Турніри</h3>
              {tournaments.length > 1 && (
                <div className={styles.carouselControls}>
                  <button
                    className={styles.arrowBtn}
                    onClick={() => resetTimer("prev")}
                    aria-label="Попередній"
                  >
                    ‹
                  </button>
                  <span className={styles.carouselDots}>
                    {tournaments.map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ""}`}
                      />
                    ))}
                  </span>
                  <button
                    className={styles.arrowBtn}
                    onClick={() => resetTimer("next")}
                    aria-label="Наступний"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            <div className={styles.carouselWrapper}>
              {current && (
                <div
                  className={`${styles.carouselSlide} ${
                    isAnimating
                      ? animDir === "next"
                        ? styles.slideExitLeft
                        : styles.slideExitRight
                      : styles.slideEnter
                  }`}
                >
                  <TournamentCard tournament={current} />
                </div>
              )}
            </div>

            <button className={styles.createBtn} onClick={() => navigate("/tournaments/create")}>
              + Створити турнір
            </button>
          </section>

          {/* RIGHT — Notifications */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Сповіщення</h3>
              {notifications.length > 0 && (
                <span className={styles.notifCount}>{notifications.length}</span>
              )}
            </div>

            <div className={styles.notifGrid}>
              {notifications.length === 0 ? (
                <p className={styles.emptyState}>Немає нових сповіщень</p>
              ) : (
                notifications.map((n) => <NotificationTile key={n.id} notification={n} />)
              )}
            </div>
          </section>
        </div>

        {/* ── Placeholders ── */}
        <div className={styles.placeholderGrid}>
          {placeholders.map((item) => (
            <div key={item.title} className={styles.placeholderCard}>
              <span className={styles.placeholderIcon}>{item.icon}</span>
              <strong className={styles.placeholderTitle}>{item.title}</strong>
              <p className={styles.placeholderDesc}>{item.description}</p>
              <span className={styles.soonBadge}>Незабаром</span>
            </div>
          ))}
        </div>

      </div>
    </NavBar>
  );
};

export default AdminDashboard;