import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { API, mediaUrl } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "@features/tournaments";
import { ScrollRow } from "../components/ScrollRow";
import { NotifCard } from "../components/NotifCard";
import { computeStatus } from "@features/tournaments/components/tournamentHelpers";
import home from "../styles/dashboardHome.module.css";

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
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
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

// Дата вже показана на бейджі картки — сюди додаємо лише час (якщо він заданий)
function toEvent(date, title, meta, id) {
  const d = new Date(date);
  const hasTime = !isNaN(d) && (d.getHours() !== 0 || d.getMinutes() !== 0);
  return {
    date: d, title, id,
    meta: hasTime
      ? `${meta} · ${d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}`
      : meta,
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { addTab } = useTabs();
  const userName = localStorage.getItem("fullUserName") || "Організаторе";

  const [tournaments, setTournaments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingN, setLoadingN] = useState(true);

  useEffect(() => {
    API.get("/tournaments/").then(r => setTournaments(r.data)).catch(() => {}).finally(() => setLoadingT(false));
    API.get("/notifications/").then(r => setNotifications(r.data)).catch(() => {}).finally(() => setLoadingN(false));
  }, []);

  const markAllRead = async () => {
    await API.post("/notifications/mark-read/").catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };
  const markOneRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await API.post(`/notifications/mark-read/${id}/`).catch(() => {});
  };
  const dismiss = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await API.delete(`/notifications/${id}/`).catch(() => {});
  };

  const stats = useMemo(() => {
    const active = tournaments.filter(t => computeStatus(t) !== "finished");
    const finished = tournaments.length - active.length;
    const pub = tournaments.filter(t => t.is_public).length;
    const unread = notifications.filter(n => !n.is_read).length;
    return { total: tournaments.length, active: active.length, finished, pub, unread };
  }, [tournaments, notifications]);

  const recent = useMemo(() => [...tournaments].slice(-6).reverse(), [tournaments]);

  const events = useMemo(() => {
    const evs = [];
    for (const t of tournaments) {
      if (t.end_date) evs.push(toEvent(t.end_date, t.name, "Дедлайн турніру", t.id));
      if (t.registration_end) evs.push(toEvent(t.registration_end, t.name, "Кінець реєстрації", t.id));
      if (t.start_date) evs.push(toEvent(t.start_date, t.name, "Старт турніру", t.id));
    }
    return evs
      .filter(e => !isNaN(e.date))
      .sort((a, b) => a.date - b.date)
      .filter(e => e.date >= new Date(Date.now() - 86400000))
      .slice(0, 5);
  }, [tournaments]);

  const openTournament = (t) => {
    addTab({ id: t.id, name: t.name });
    navigate(`/tournament/${t.id}`);
  };

  const [heroRef, heroVis] = useReveal();
  const [gridRef, gridVis] = useReveal();

  const UA_MONTHS = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];

  return (
    <NavBar>
      <div className={home.contentArea}>
        {/* Hero */}
        <div ref={heroRef} className={`${home.hero} ${home.reveal} ${heroVis ? home.revealVisible : ""}`}>
          <h1 className={home.heroTitle}>{greeting()}, {userName}</h1>
          <p className={home.heroSub}>
            {stats.total === 0
              ? "Створіть перший турнір — додайте форму реєстрації, зробіть його публічним і запросіть учасників за посиланням."
              : `У вас ${stats.total} турнірів, з них ${stats.active} активних. Непрочитаних сповіщень: ${stats.unread}.`}
          </p>
          <div className={home.heroActions}>
            <button className="btn-primary" onClick={() => navigate("/tournaments")}>
              Керувати турнірами
            </button>
            <button className="btn-secondary" onClick={() => navigate("/public")}>
              Публічний каталог
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={home.statGrid}>
          <Stat value={stats.total} label="Всього турнірів" delay={0} />
          <Stat value={stats.active} label="Активних" delay={80} />
          <Stat value={stats.pub} label="Публічних" delay={160} />
          <Stat value={stats.finished} label="Завершених" delay={240} />
          <Stat value={stats.unread} label="Непрочитаних" delay={320} />
        </div>

        {/* Recent */}
        <section ref={gridRef} className={`${home.section} ${home.reveal} ${gridVis ? home.revealVisible : ""}`}>
          <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>
                Останні турніри
              </h3>
            <button className={home.linkBtn} onClick={() => navigate("/tournaments")}>Всі</button>
          </div>
          {loadingT ? (
            <div className={home.tournRow}>{[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 200 }} />)}</div>
          ) : recent.length === 0 ? (
            <div className={home.emptyState}>
              <p>Турнірів ще немає. Створіть перший — це займе хвилину.</p>
              <button className="btn-primary"
                onClick={() => navigate("/tournaments")}>Створити турнір</button>
            </div>
          ) : (
            <ScrollRow>
              {recent.map((t) => (
                <div key={t.id} className={home.tournCell} onClick={() => openTournament(t)}>
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

        {/* Calendar */}
        <section className={home.section}>
          <div className={home.sectionHeader}>
            <h3 className={home.sectionTitle}>Найближчі події</h3>
          </div>
          {loadingT ? (
            <div className={home.tournRow}>{[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 100, flex: "0 0 280px" }} />)}</div>
          ) : events.length === 0 ? (
            <div className={home.emptyState}>Немає запланованих подій</div>
          ) : (
            <ScrollRow>
              {events.map((e, i) => (
                <div key={i} className={home.eventCard} onClick={() => navigate(`/tournament/${e.id}`)}>
                  <div className={home.eventDate}>
                    <span className={home.eventDay}>{e.date.getDate()}</span>
                    <span className={home.eventMonth}>{UA_MONTHS[e.date.getMonth()]}</span>
                  </div>
                  <div>
                      <div className={home.eventName}>{e.title}</div>
                      <div className={home.eventMeta}>{e.meta}</div>
                  </div>
                </div>
              ))}
            </ScrollRow>
          )}
        </section>

        {/* Notifications */}
        <section className={home.section}>
          <div className={home.sectionHeader}>
            <h3 className={home.sectionTitle}>
              Сповіщення{stats.unread > 0 && <span className={home.countText}>&nbsp;· {stats.unread} нових</span>}
            </h3>
            {stats.unread > 0 && <button className={home.linkBtn} onClick={markAllRead}>Прочитати всі</button>}
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

export { AdminDashboard };
