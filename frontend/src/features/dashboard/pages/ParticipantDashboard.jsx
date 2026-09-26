import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { API, mediaUrl } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "@features/tournaments";
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

function Stat({ icon, bg, value, label, delay, suffix = "" }) {
  const [ref, vis] = useReveal();
  const animated = useCountUp(vis ? value : 0);
  return (
    <div ref={ref} className={`${home.statCard} ${home.reveal} ${vis ? home.revealVisible : ""}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className={home.statIcon} style={{ background: bg }}>{icon}</div>
      <div>
        <div className={home.statNum}>{animated}{suffix}</div>
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
      if (t.end_date) evs.push({ date: new Date(t.end_date), title: t.name, meta: "Дедлайн", id: t.id });
      if (t.registration_end) evs.push({ date: new Date(t.registration_end), title: t.name, meta: "Кінець реєстрації", id: t.id });
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
          <span className={home.roleBadge}>Учасник</span>
          <h1 className={home.heroTitle}>{greeting()}, {userName}! 🚀</h1>
          <p className={home.heroSub}>
            {tournaments.length === 0
              ? "Ви ще не в жодному турнірі — загляньте в публічний каталог або вставте посилання від організатора."
              : `У вас ${tournaments.length} турнірів · ${grades.length} оцінок${grades.length ? ` · середній бал ${avgScore}%` : ""}. Так тримати!`}
          </p>
          <div className={home.heroActions}>
            <button className={home.heroBtnPrimary} onClick={() => setShowJoin(true)}>
              🔗 Приєднатися за посиланням
            </button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/public")}>
              🌍 Публічні турніри{publicCount > 0 ? ` (${publicCount})` : ""}
            </button>
            <button className={home.heroBtnGhost} onClick={() => navigate("/tournaments")}>
              🏆 Мої турніри
            </button>
          </div>
        </div>

        <div className={home.statGrid}>
          <Stat icon="🏆" bg="#fef3c7" value={tournaments.length} label="мої турніри" delay={0} />
          <Stat icon="🔥" bg="#dcfce7" value={active} label="активних" delay={80} />
          <Stat icon="📝" bg="#e0e7ff" value={grades.length} label="оцінок" delay={160} />
          <Stat icon="⭐" bg="#fef9c3" value={avgScore} suffix="%" label="середній бал" delay={240} />
          <Stat icon="🔔" bg="#fce7f3" value={unread} label="непрочитаних" delay={320} />
        </div>

        <div className={home.mainGrid}>
          <section className={home.section}>
            <div className={home.sectionHeader}>
              <h3 className={home.sectionTitle}>Мої турніри <span className={home.countBadge}>{tournaments.length}</span></h3>
              <button className={home.linkBtn} onClick={() => navigate("/tournaments")}>Всі →</button>
            </div>
            {loadingT ? (
              <div className={home.tournGrid}>{[0,1,2].map(i => <div key={i} className={home.skeleton} style={{ height: 120 }} />)}</div>
            ) : recent.length === 0 ? (
              <div className={home.emptyState}>
                <div style={{ fontSize: 32 }}>🎯</div>
                <p>Поки порожньо. Приєднайтеся до першого турніру!</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                  <button className={home.heroBtnPrimary} style={{ background: "#18181b", color: "#fff" }}
                    onClick={() => navigate("/public")}>До каталогу</button>
                </div>
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

            {topGrades.length > 0 && (
              <>
                <div className={home.sectionHeader} style={{ marginTop: 18 }}>
                  <h3 className={home.sectionTitle}>⭐ Останні оцінки</h3>
                  <button className={home.linkBtn} onClick={() => navigate("/works")}>Всі роботи →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topGrades.map((g) => (
                    <div key={g.id} className={home.eventRow}>
                      <div className={home.eventDate} style={{
                        background: (g.total / (g.max_total || 1)) >= 0.8 ? "#16a34a" : (g.total / (g.max_total || 1)) >= 0.5 ? "#f59e0b" : "#ef4444",
                      }}>
                        <span className={home.eventDay}>{g.total}</span>
                        <span className={home.eventMonth}>/{g.max_total}</span>
                      </div>
                      <div>
                        <div className={home.eventName}>{g.task_title}</div>
                        <div className={home.eventMeta}>{g.tournament} · {g.round_title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section className={home.section}>
              <div className={home.sectionHeader}>
                <h3 className={home.sectionTitle}>📅 Дедлайни</h3>
              </div>
              {events.length === 0 ? (
                <div className={home.emptyState}>Немає наближених дедлайнів</div>
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
                  notifications.slice(0, 6).map((n) => (
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
      </div>
      {showJoin && <JoinByCodeModal onClose={() => setShowJoin(false)} />}
    </NavBar>
  );
};

export { ParticipantDashboard };
