import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { API, mediaUrl } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "@features/tournaments";
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
      if (t.end_date) evs.push({ date: new Date(t.end_date), title: t.name, meta: "Дедлайн турніру", id: t.id });
      if (t.registration_end) evs.push({ date: new Date(t.registration_end), title: t.name, meta: "Кінець реєстрації", id: t.id });
      if (t.start_date) evs.push({ date: new Date(t.start_date), title: t.name, meta: "Старт турніру", id: t.id });
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
          <span className={home.roleBadge}>Адміністратор</span>
          <h1 className={home.heroTitle}>{greeting()}, {userName}! 👋</h1>
          <p className={home.heroSub}>
            {stats.total === 0
              ? "Створіть перший турнір — додайте форму реєстрації, зробіть його публічним і запросіть учасників за посиланням."
              : `У вас ${stats.total} турнірів · ${stats.active} активних · ${stats.unread} непрочитаних сповіщень.`}
          </p>
          <div className={home.heroActions}>
            <button className={home.heroBtnPrimary} onClick={() => navigate("/tournaments")}>
              ＋ Керувати турнірами
            </button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/public")}>
              🌍 Публічний каталог
            </button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/tournaments")}>
              🏆 Мої турніри
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={home.statGrid}>
          <Stat icon="🏆" bg="#fef3c7" value={stats.total} label="всього турнірів" delay={0} />
          <Stat icon="🔥" bg="#dcfce7" value={stats.active} label="активних" delay={80} />
          <Stat icon="🌍" bg="#e0e7ff" value={stats.pub} label="публічних" delay={160} />
          <Stat icon="🏁" bg="#f3f4f6" value={stats.finished} label="завершених" delay={240} />
          <Stat icon="🔔" bg="#fce7f3" value={stats.unread} label="непрочитаних" delay={320} />
        </div>

        <div className={home.mainGrid}>
          {/* Recent */}
          <section ref={gridRef} className={`${home.section} ${home.reveal} ${gridVis ? home.revealVisible : ""}`}>
            <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>
                Останні турніри <span className={home.countBadge}>{tournaments.length}</span>
              </h3>
              <button className={home.linkBtn} onClick={() => navigate("/tournaments")}>Всі →</button>
            </div>
            {loadingT ? (
              <div className={home.tournGrid}>{[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 120 }} />)}</div>
            ) : recent.length === 0 ? (
              <div className={home.emptyState}>
                <div style={{ fontSize: 32 }}>🏆</div>
                <p>Турнірів ще немає. Створіть перший — це займе хвилину.</p>
                <button className={home.heroBtnPrimary} style={{ background: "#18181b", color: "#fff" }}
                  onClick={() => navigate("/tournaments")}>Створити турнір</button>
              </div>
            ) : (
              <div className={home.tournGrid}>
                {recent.map((t) => (
                  <div key={t.id} className={home.tournCell} onClick={() => openTournament(t)}>
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

          {/* Calendar */}
          <section className={home.section}>
            <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>📅 Найближчі події</h3>
            </div>
            {loadingT ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 54 }} />)}
              </div>
            ) : events.length === 0 ? (
              <div className={home.emptyState}>Немає запланованих подій</div>
            ) : (
              <div className={home.eventList}>
                {events.map((e, i) => (
                  <div key={i} className={home.eventRow} onClick={() => navigate(`/tournament/${e.id}`)}>
                    <div className={home.eventDate}>
                      <span className={home.eventDay}>{e.date.getDate()}</span>
                      <span className={home.eventMonth}>{UA_MONTHS[e.date.getMonth()]}</span>
                    </div>
                    <div>
                      <div className={home.eventName}>{e.title}</div>
                      <div className={home.eventMeta}>{e.meta} · {e.date.toLocaleDateString("uk-UA")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Notifications */}
        <section className={home.section}>
          <div className={home.sectionHeader}>
            <h3 className={home.sectionTitle}>
              🔔 Сповіщення {stats.unread > 0 && <span className={home.countBadge}>{stats.unread}</span>}
            </h3>
            {stats.unread > 0 && <button className={home.linkBtn} onClick={markAllRead}>Прочитати всі</button>}
          </div>
          <div className={home.notifList}>
            {loadingN ? (
              [0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 48 }} />)
            ) : notifications.length === 0 ? (
              <div className={home.emptyState}>Немає сповіщень</div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div key={n.id}
                  className={`${home.notifTile} ${!n.is_read ? home.notifUnread : ""}`}
                  onClick={() => !n.is_read && markOneRead(n.id)}>
                  {!n.is_read && <span className={home.notifDot} />}
                  <div style={{ fontWeight: 700 }}>{n.subject || "Сповіщення"}</div>
                  <div style={{ color: "#555" }}>{n.text}</div>
                  {n.tournament && <div style={{ color: "#7a9abf", fontSize: 12 }}>🏆 {n.tournament}</div>}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </NavBar>
  );
};

export { AdminDashboard };
