import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { API, mediaUrl } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "@features/tournaments";
import { ScrollRow, NotifCard } from "@features/dashboard";
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

function Stat({ value, label, delay }) {
  const [ref, vis] = useReveal();
  const animated = useCountUp(vis ? value : 0);
  return (
    <div ref={ref} className={`${home.statCard} ${home.reveal} ${vis ? home.revealVisible : ""}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className={home.statNum}>{animated}</div>
      <div className={home.statLbl}>{label}</div>
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
  const dismiss = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await API.delete(`/notifications/${id}/`).catch(() => {});
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
          <h1 className={home.heroTitle}>{greeting()}, {userName}</h1>
          <p className={home.heroSub}>
            {totalPending === 0
              ? "Всі роботи оцінено. Дякуємо за уважність."
              : `На вас чекають ${totalPending} робіт у ${pending.length} турнірах. Почніть з найтерміновіших.`}
          </p>
          <div className={home.heroActions}>
            <button className={home.heroBtnPrimary}
              onClick={() => sortedPending[0] && openTournament(sortedPending[0].tournament_id, sortedPending[0].tournament_name)}
              disabled={!sortedPending[0]}>
              Оцінити роботи{totalPending > 0 ? ` · ${totalPending}` : ""}
            </button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/public")}>Публічні</button>
          </div>
        </div>

        <div className={home.statGrid}>
          <Stat value={totalPending} label="Робіт чекають" delay={0} />
          <Stat value={tournaments.length} label="Турнірів" delay={80} />
          <Stat value={pending.length} label="Активних перевірок" delay={160} />
          <Stat value={unread} label="Непрочитаних" delay={240} />
        </div>

        <section className={home.section}>
          <div className={home.sectionHeader}>
            <h3 className={home.sectionTitle}>Черга оцінювання</h3>
            <button className={home.linkBtn} onClick={() => navigate("/tournaments")}>Всі турніри</button>
          </div>
          {loadingP ? (
            <div className={home.tournRow}>{[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 100, flex: "0 0 280px" }} />)}</div>
          ) : sortedPending.length === 0 ? (
            <div className={home.emptyState}>
              <p>Всі роботи оцінено.</p>
            </div>
          ) : (
            <ScrollRow>
              {sortedPending.map((p) => (
                <div key={p.tournament_id} className={home.eventCard}
                  onClick={() => openTournament(p.tournament_id, p.tournament_name)}>
                  <div className={home.eventDate}>
                    <span className={home.eventDay}>{p.pending_count}</span>
                    <span className={home.eventMonth}>робіт</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={home.eventName}>{p.tournament_name}</div>
                    <div className={home.eventMeta}>Натисніть, щоб оцінити</div>
                  </div>
                </div>
              ))}
            </ScrollRow>
          )}
        </section>

        <section className={home.section}>
          <div className={home.sectionHeader}>
            <h3 className={home.sectionTitle}>Мої турніри</h3>
          </div>
          {loadingT ? (
            <div className={home.tournRow}>{[0,1].map(i => <div key={i} className={home.skeleton} style={{ height: 200 }} />)}</div>
          ) : recent.length === 0 ? (
            <div className={home.emptyState}>Немає турнірів</div>
          ) : (
            <ScrollRow>
              {recent.slice(0, 4).map((t) => (
                <div key={t.id} className={home.tournCell} onClick={() => openTournament(t.id, t.name)}>
                  <TournamentCard
                    name={t.name} info={t.description} date={t.start_date}
                    accentColor={t.accent_color} imageMode={t.image_mode}
                    stockImage={t.stock_image}
                    customImage={t.custom_image ? (t.custom_image.startsWith("http") ? t.custom_image : mediaUrl(t.custom_image)) : null}
                    status={computeStatus(t)}
                    compact
                  />
                </div>
              ))}
            </ScrollRow>
          )}
        </section>

        <section className={home.section}>
            <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>
                Сповіщення{unread > 0 && <span className={home.countText}>&nbsp;· {unread} нових</span>}
              </h3>
              {unread > 0 && <button className={home.linkBtn} onClick={markAllRead}>Всі прочитано</button>}
            </div>
            {loadingN ? (
              <div className={home.tournRow}>{[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 120, flex: "0 0 320px" }} />)}</div>
            ) : notifications.length === 0 ? (
              <div className={home.emptyState}>Немає сповіщень</div>
            ) : (
              <ScrollRow>
                {notifications.slice(0, 8).map((n) => (
                  <NotifCard key={n.id} n={n} onRead={markOneRead} onDismiss={dismiss} />
                ))}
              </ScrollRow>
            )}
          </section>
      </div>
    </NavBar>
  );
};

export { JuryDashboard };
