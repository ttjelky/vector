import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { API, mediaUrl } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "@features/tournaments";
import { ScrollRow } from "../components/ScrollRow";
import { NotifCard } from "../components/NotifCard";
import { JoinByCodeModal } from "@features/teams";
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
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Stat({ value, label, delay, suffix = "" }) {
  const [ref, vis] = useReveal();
  const animated = useCountUp(vis ? value : 0);
  return (
    <div ref={ref} className={`${home.statCard} ${home.reveal} ${vis ? home.revealVisible : ""}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className={home.statNum}>{animated}{suffix}</div>
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

const ParticipantDashboard = () => {
  const navigate = useNavigate();
  const { addTab } = useTabs();
  const userName = localStorage.getItem("fullUserName") || "Учаснику";

  const [tournaments, setTournaments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [publicCount, setPublicCount] = useState(0);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingG, setLoadingG] = useState(true);
  const [loadingN, setLoadingN] = useState(true);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    API.get("/tournaments/").then(r => setTournaments(r.data)).catch(() => {}).finally(() => setLoadingT(false));
    API.get("/tournaments/my-grades/").then(r => setGrades(r.data)).catch(() => {}).finally(() => setLoadingG(false));
    API.get("/notifications/").then(r => setNotifications(r.data)).catch(() => {}).finally(() => setLoadingN(false));
    API.get("/tournaments/public/").then(r => setPublicCount((r.data || []).length)).catch(() => {});
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

  const avgScore = grades.length > 0
    ? Math.round(grades.reduce((s, g) => s + (g.max_total > 0 ? (g.total / g.max_total) * 100 : 0), 0) / grades.length)
    : 0;
  const unread = notifications.filter(n => !n.is_read).length;
  const active = tournaments.filter(t => computeStatus(t) !== "finished").length;
  const recent = useMemo(() => [...tournaments].slice(-6).reverse(), [tournaments]);
  const topGrades = useMemo(() => [...grades].slice(0, 3), [grades]);

  const events = useMemo(() => {
    const evs = [];
    for (const t of tournaments) {
      if (t.end_date) evs.push(toEvent(t.end_date, t.name, "Дедлайн", t.id));
      if (t.registration_end) evs.push(toEvent(t.registration_end, t.name, "Кінець реєстрації", t.id));
    }
    return evs.filter(e => !isNaN(e.date)).sort((a, b) => a.date - b.date)
      .filter(e => e.date >= new Date(Date.now() - 86400000)).slice(0, 5);
  }, [tournaments]);

  const openTournament = (t) => {
    addTab({ id: t.id, name: t.name });
    navigate(`/tournament/${t.id}`);
  };

  const [heroRef, heroVis] = useReveal();
  const UA_MONTHS = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];

  return (
    <NavBar>
      <div className={home.contentArea}>
        <div ref={heroRef} className={`${home.hero} ${home.reveal} ${heroVis ? home.revealVisible : ""}`}>
          <h1 className={home.heroTitle}>{greeting()}, {userName}</h1>
          <p className={home.heroSub}>
            {tournaments.length === 0
              ? "Ви ще не в жодному турнірі — загляньте в публічний каталог або вставте посилання від організатора."
              : `У вас ${tournaments.length} турнірів і ${grades.length} оцінок${grades.length ? `, середній бал — ${avgScore}%` : ""}.`}
          </p>
          <div className={home.heroActions}>
            <button className={home.heroBtnPrimary} onClick={() => setShowJoin(true)}>
              Приєднатися за посиланням
            </button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/public")}>
              Публічні турніри{publicCount > 0 ? ` · ${publicCount}` : ""}
            </button>
          </div>
        </div>

        <div className={home.statGrid}>
          <Stat value={tournaments.length} label="Мої турніри" delay={0} />
          <Stat value={active} label="Активних" delay={80} />
          <Stat value={grades.length} label="Оцінок" delay={160} />
          <Stat value={avgScore} suffix="%" label="Середній бал" delay={240} />
          <Stat value={unread} label="Непрочитаних" delay={320} />
        </div>

        <section className={home.section}>
          <div className={home.sectionHeader}>
            <h3 className={home.sectionTitle}>
              Мої турніри{tournaments.length > 0 && <span className={home.countText}>&nbsp;· {tournaments.length}</span>}
            </h3>
            <button className={home.linkBtn} onClick={() => navigate("/tournaments")}>Всі</button>
          </div>
          {loadingT ? (
              <div className={home.tournRow}>{[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 200 }} />)}</div>
          ) : recent.length === 0 ? (
            <div className={home.emptyState}>
              <p>Поки порожньо. Приєднайтеся до першого турніру.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className={home.heroBtnPrimary}
                  onClick={() => navigate("/public")}>До каталогу</button>
              </div>
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

        {!loadingG && topGrades.length > 0 && (
          <section className={home.section}>
            <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>Останні оцінки</h3>
              <button className={home.linkBtn} onClick={() => navigate("/works")}>Всі роботи</button>
            </div>
            <ScrollRow>
              {topGrades.map((g) => (
                <div key={g.id} className={home.eventCard}>
                  <div className={home.eventDate}>
                    <span className={home.eventDay}>{g.total}</span>
                    <span className={home.eventMonth}>/{g.max_total}</span>
                  </div>
                  <div>
                    <div className={home.eventName}>{g.task_title}</div>
                    <div className={home.eventMeta}>{g.tournament} · {g.round_title}</div>
                  </div>
                </div>
              ))}
            </ScrollRow>
          </section>
        )}

        <section className={home.section}>
          <div className={home.sectionHeader}>
            <h3 className={home.sectionTitle}>Дедлайни</h3>
          </div>
          {events.length === 0 ? (
            <div className={home.emptyState}>Немає наближених дедлайнів</div>
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
              {notifications.slice(0, 6).map((n) => (
                <NotifCard key={n.id} n={n} onRead={markOneRead} onDismiss={dismiss} />
              ))}
            </ScrollRow>
          )}
        </section>
      </div>
      {showJoin && <JoinByCodeModal onClose={() => setShowJoin(false)} />}
    </NavBar>
  );
};

export { ParticipantDashboard };
