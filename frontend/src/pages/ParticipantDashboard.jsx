import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import API from "@api";
import NavBar from "@shared/components/NavBar";
import TournamentCard from "@shared/components/TournamentCard";
import styles from "@shared/styles/participantdashboard.module.css";

// ── Grade card ────────────────────────────────────────────────────────────────
function GradeCard({ grade }) {
  const pct = grade.max_total > 0
    ? Math.round((grade.total / grade.max_total) * 100)
    : 0;

  const color = pct >= 80 ? "#22c55e"
              : pct >= 50 ? "#f59e0b"
              : "#ef4444";

  return (
    <div className={styles.gradeCard}>
      {/* Score ring */}
      <div className={styles.gradeRing} style={{ "--clr": color, "--pct": pct }}>
        <svg viewBox="0 0 44 44" className={styles.ringSvg}>
          <circle cx="22" cy="22" r="18" className={styles.ringBg} />
          <circle
            cx="22" cy="22" r="18"
            className={styles.ringFill}
            style={{
              stroke: color,
              strokeDasharray: `${pct * 1.131} 113.1`,
            }}
          />
        </svg>
        <span className={styles.ringNum} style={{ color }}>
          {grade.total}
        </span>
      </div>

      <div className={styles.gradeBody}>
        <p className={styles.gradeTask}>{grade.task_title}</p>
        <p className={styles.gradeRound}>
          {grade.round_title} · {grade.tournament}
        </p>

        {/* Score breakdown */}
        <div className={styles.gradeCriteria}>
          {Object.entries(grade.scores).map(([key, val]) => {
            const max   = grade.criteria?.find?.(c => c.key === key)?.max ?? 10;
            const label = grade.criteria?.find?.(c => c.key === key)?.label ?? key;
            return (
              <div key={key} className={styles.criterionRow}>
                <span className={styles.criterionLabel}>{label}</span>
                <div className={styles.criterionBar}>
                  <div
                    className={styles.criterionFill}
                    style={{ width: `${(val / max) * 100}%`, background: color }}
                  />
                </div>
                <span className={styles.criterionVal}>{val}/{max}</span>
              </div>
            );
          })}
        </div>

        {grade.comment && (
          <p className={styles.gradeComment}>💬 {grade.comment}</p>
        )}

        <div className={styles.gradeMeta}>
          <span className={styles.gradeJury}>від {grade.jury_name}</span>
          <span className={styles.gradeMax}>{grade.total} / {grade.max_total}</span>
        </div>
      </div>
    </div>
  );
}

// ── Notification tile ─────────────────────────────────────────────────────────
function NotifTile({ n, onRead }) {
  return (
    <div
      className={`${styles.notifTile} ${n.is_read ? styles.notif_read : styles.notif_unread}`}
      onClick={() => !n.is_read && onRead(n.id)}
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
const ParticipantDashboard = () => {
  const navigate   = useNavigate();
  const { addTab } = useTabs();

  const [tournaments,   setTournaments]   = useState([]);
  const [grades,        setGrades]        = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingT,      setLoadingT]      = useState(true);
  const [loadingG,      setLoadingG]      = useState(true);
  const [loadingN,      setLoadingN]      = useState(true);

  // carousel
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [animDir,      setAnimDir]      = useState("next");
  const timerRef = useRef(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    API.get("/tournaments/")
      .then(r => setTournaments(r.data))
      .catch(() => {})
      .finally(() => setLoadingT(false));

    API.get("/tournaments/my-grades/")
      .then(r => setGrades(r.data))
      .catch(() => {})
      .finally(() => setLoadingG(false));

    API.get("/notifications/")
      .then(r => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoadingN(false));
  }, []);

  // ── mark read ──────────────────────────────────────────────────────────────
  const markOneRead = async (id) => {
    await API.post(`/notifications/mark-read/${id}/`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await API.post("/notifications/mark-read/");
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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

  const current     = tournaments[currentIndex];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Stat: середній бал по всіх оцінках
  const avgScore = grades.length > 0
    ? Math.round(grades.reduce((s, g) => s + (g.max_total > 0 ? (g.total / g.max_total) * 100 : 0), 0) / grades.length)
    : null;

  return (
    <NavBar>
      <div className={styles.contentArea}>

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Особистий кабінет</h2>
          <p className={styles.pageSubtitle}>Ваші турніри, оцінки та сповіщення</p>
        </div>

        {/* ── Stat strip ── */}
        {!loadingG && grades.length > 0 && (
          <div className={styles.statStrip}>
            <div className={styles.statChip}>
              <span className={styles.statNum}>{grades.length}</span>
              <span className={styles.statLbl}>оцінених робіт</span>
            </div>
            {avgScore !== null && (
              <div className={styles.statChip}>
                <span className={styles.statNum} style={{
                  color: avgScore >= 80 ? "#22c55e" : avgScore >= 50 ? "#f59e0b" : "#ef4444"
                }}>
                  {avgScore}%
                </span>
                <span className={styles.statLbl}>середній результат</span>
              </div>
            )}
            {!loadingT && tournaments.length > 0 && (
              <div className={styles.statChip}>
                <span className={styles.statNum}>{tournaments.length}</span>
                <span className={styles.statLbl}>турнірів</span>
              </div>
            )}
          </div>
        )}

        {/* ── Main grid: турніри + оцінки ── */}
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
                  <TournamentCard
                    name={current.name}
                    info={current.description}
                    date={current.start_date}
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
                  <span>Турнірів ще немає</span>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT — Grades horizontal scroll */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                Мої оцінки
                {grades.length > 0 && (
                  <span className={styles.gradesBadge}>{grades.length}</span>
                )}
              </h3>
            </div>

            {loadingG ? (
              <div className={styles.gradesScroll}>
                {[0,1,2].map(i => (
                  <div key={i} className={styles.skeletonGrade}>
                    <div className={styles.skeletonRing} />
                    <div className={styles.skeletonBody}>
                      <div className={styles.skeletonLine} style={{ width: "70%" }} />
                      <div className={styles.skeletonLine} style={{ width: "50%" }} />
                      <div className={styles.skeletonLine} style={{ width: "90%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : grades.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📋</span>
                <span>Оцінок ще немає</span>
              </div>
            ) : (
              <div className={styles.gradesScroll}>
                {grades.map(g => <GradeCard key={g.id} grade={g} />)}
              </div>
            )}
          </section>
        </div>

        {/* ── Notifications ── */}
        <section className={styles.notifSection}>
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

export default ParticipantDashboard;