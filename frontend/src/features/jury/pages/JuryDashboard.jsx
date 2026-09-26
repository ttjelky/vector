import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { API, mediaUrl } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "@features/tournaments";
import { computeStatus } from "@features/tournaments/components/tournamentHelpers";
import home from "@features/dashboard/styles/dashboardHome.module.css";

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Stat({ icon, bg, value, label, delay }) {
  const [ref, vis] = useReveal();
  const animated = useCountUp(vis ? value : 0);
  return (
    <div ref={ref} className={`${home.statCard} ${home.reveal} ${vis ? home.revealVisible : ""}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className={home.statIcon} style={{ background: bg }}>{icon}</div>
      <div>
        <div className={home.statNum}>{animated}</div>
        <div className={home.statLbl}>{label}</div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Доброї ночі";
  if (h < 12) return "Доброго ранку";
  if (h < 18) return "Доброго дня";
  return "Доброго вечора";
}

const JuryDashboard = () => {
  const navigate = useNavigate();
  const { addTab } = useTabs();
  const userName = localStorage.getItem("fullUserName") || "Член журі";

  const [tournaments, setTournaments] = useState([]);
  const [pending, setPending] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingN, setLoadingN] = useState(true);

  useEffect(() => {
    API.get("/tournaments/").then(r => setTournaments(r.data)).catch(() => {}).finally(() => setLoadingT(false));
    API.get("/tournaments/jury/pending-submissions/").then(r => setPending(r.data)).catch(() => {}).finally(() => setLoadingP(false));
    API.get("/notifications/").then(r => setNotifications(r.data)).catch(() => {}).finally(() => setLoadingN(false));
  }, []);

  const markOneRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await API.post(`/notifications/mark-read/${id}/`).catch(() => {});
  };
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await API.post("/notifications/mark-read/").catch(() => {});
  };

  const totalPending = pending.reduce((s, p) => s + (p.pending_count || 0), 0);
  const unread = notifications.filter(n => !n.is_read).length;
  const recent = useMemo(() => [...tournaments].slice(-6).reverse(), [tournaments]);
  const sortedPending = useMemo(() => [...pending].sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0)), [pending]);

  const openTournament = (id, name) => {
    addTab({ id, name });
    navigate(`/tournament/${id}`);
  };

  const [heroRef, heroVis] = useReveal();

  return (
    <NavBar>
      <div className={home.contentArea}>
        <div ref={heroRef} className={`${home.hero} ${home.reveal} ${heroVis ? home.revealVisible : ""}`}>
          <span className={home.roleBadge}>Журі</span>
          <h1 className={home.heroTitle}>{greeting()}, {userName}! ⚖️</h1>
          <p className={home.heroSub}>
            {totalPending === 0
              ? "Всі роботи оцінено. Дякуємо за уважність!"
              : `На вас чекають ${totalPending} робіт у ${pending.length} турнірах. Почніть з найтерміновіших.`}
          </p>
          <div className={home.heroActions}>
            <button className={home.heroBtnPrimary}
              onClick={() => sortedPending[0] && openTournament(sortedPending[0].tournament_id, sortedPending[0].tournament_name)}
              disabled={!sortedPending[0]}>
              ✏️ Оцінити роботи{totalPending > 0 ? ` (${totalPending})` : ""}
            </button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/tournaments")}>🏆 Мої турніри</button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/public")}>🌍 Публічні</button>
          </div>
        </div>

        <div className={home.statGrid}>
          <Stat icon="📥" bg="#fef3c7" value={totalPending} label="робіт чекають" delay={0} />
          <Stat icon="🏆" bg="#dcfce7" value={tournaments.length} label="турнірів" delay={80} />
          <Stat icon="📋" bg="#e0e7ff" value={pending.length} label="активних перевірок" delay={160} />
          <Stat icon="🔔" bg="#fce7f3" value={unread} label="непрочитаних" delay={240} />
        </div>

        <div className={home.mainGrid}>
          <section className={home.section}>
            <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>⏳ Черга оцінювання</h3>
              <button className={home.linkBtn} onClick={() => navigate("/tournaments")}>Всі турніри →</button>
            </div>
            {loadingP ? (
              [0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 60, marginBottom: 8 }} />)
            ) : sortedPending.length === 0 ? (
              <div className={home.emptyState}>
                <div style={{ fontSize: 32 }}>✅</div>
                <p>Всі роботи оцінено!</p>
              </div>
            ) : (
              <div className={home.eventList}>
                {sortedPending.map((p) => {
                  const urgency = p.pending_count >= 10 ? "#ef4444" : p.pending_count >= 3 ? "#f59e0b" : "#16a34a";
                  return (
                    <div key={p.tournament_id} className={home.eventRow}
                      onClick={() => openTournament(p.tournament_id, p.tournament_name)}>
                      <div className={home.eventDate} style={{ background: urgency }}>
                        <span className={home.eventDay}>{p.pending_count}</span>
                        <span className={home.eventMonth}>робіт</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className={home.eventName}>{p.tournament_name}</div>
                        <div className={home.eventMeta}>Натисніть щоб оцінити →</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={home.sectionHeader} style={{ marginTop: 18 }}>
              <h3 className={home.sectionTitle}>Мої турніри</h3>
            </div>
            {loadingT ? (
              <div className={home.tournGrid}>{[0,1].map(i => <div key={i} className={home.skeleton} style={{ height: 110 }} />)}</div>
            ) : recent.length === 0 ? (
              <div className={home.emptyState}>Немає турнірів</div>
            ) : (
              <div className={home.tournGrid}>
                {recent.slice(0, 4).map((t) => (
                  <div key={t.id} className={home.tournCell} onClick={() => openTournament(t.id, t.name)}>
                    <TournamentCard
                      name={t.name} info={t.description} date={t.start_date}
                      accentColor={t.accent_color} imageMode={t.image_mode}
                      stockImage={t.stock_image}
                      customImage={t.custom_image ? (t.custom_image.startsWith("http") ? t.custom_image : mediaUrl(t.custom_image)) : null}
                      status={computeStatus(t)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={home.section}>
            <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>🔔 Сповіщення {unread > 0 && <span className={home.countBadge}>{unread}</span>}</h3>
              {unread > 0 && <button className={home.linkBtn} onClick={markAllRead}>Всі прочитано</button>}
            </div>
            <div className={home.notifList}>
              {loadingN ? (
                [0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 48 }} />)
              ) : notifications.length === 0 ? (
                <div className={home.emptyState}>Немає сповіщень</div>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className={`${home.notifTile} ${!n.is_read ? home.notifUnread : ""}`}
                    onClick={() => !n.is_read && markOneRead(n.id)}>
                    {!n.is_read && <span className={home.notifDot} />}
                    <div style={{ fontWeight: 700 }}>{n.subject || "Сповіщення"}</div>
                    <div style={{ color: "#555" }}>{n.text}</div>
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

export { JuryDashboard };
