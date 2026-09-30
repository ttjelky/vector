import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { useSearch } from "@shared/contexts/SearchContext";
import { API, mediaUrl } from "@api";
import { NavBar } from "@shared/components/NavBar";
import { ScrollRow } from "@features/dashboard";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { TournamentCard } from "./TournamentCard";
import { JoinByCodeModal } from "@features/teams";
import { computeStatus, sortTournaments, matchesQuery } from "./tournamentHelpers";
import styles from "../styles/tournaments.module.css";

// ─── Reveal + count-up у мові Головної ────────────────────────────────────────

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
    <div ref={ref} className={`${styles.statCard} ${styles.reveal} ${vis ? styles.revealVisible : ""}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className={styles.statNum}>{animated}</div>
      <div className={styles.statLbl}>{label}</div>
    </div>
  );
}

export function TournamentCell({ tournament, dimmed, onOpen, className }) {
  const status = computeStatus(tournament);
  const custom = tournament.custom_image
    ? (String(tournament.custom_image).startsWith("http")
      ? tournament.custom_image
      : mediaUrl(tournament.custom_image))
    : null;
  return (
    <div
      className={`${className ?? styles.cell} ${dimmed ? styles.cellDimmed : ""}`}
      onClick={() => onOpen(tournament)}
      role="button"
      tabIndex={0}
      aria-label={`Відкрити турнір ${tournament.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(tournament); }
      }}
    >
      <TournamentCard
        name={tournament.name}
        info={tournament.description}
        date={tournament.start_date}
        accentColor={tournament.accent_color}
        imageMode={tournament.image_mode}
        stockImage={tournament.stock_image}
        customImage={custom}
        status={status}
        compact
      />
    </div>
  );
}

// ─── Спільна вкладка «Турніри» ────────────────────────────────────────────────
// variant: "admin" — плитка створення + модалка створення;
//          "participant" — плитка приєднання + модалка за кодом.

export function TournamentsHome({ variant }) {
  const isAdmin = variant === "admin";
  const navigate = useNavigate();
  const location = useLocation();
  const { addTab } = useTabs();
  const { searchQuery } = useSearch();
  const refetchFlag = location.state?.refetch;

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  // У стрічках порядок фіксований (за датою, нові перші);
  // сортування лишилось тільки на сторінках сіток.
  const sortBy = "date";
  const sortAsc = false;

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await API.get("/tournaments/");
      setTournaments(res.data ?? []);
    } catch (err) {
      console.error("Помилка при завантаженні турнірів:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTournaments(); }, []);

  useEffect(() => {
    if (refetchFlag) {
      fetchTournaments();
      window.history.replaceState({}, "");
    }
  }, [refetchFlag]);

  const q = searchQuery.trim().toLowerCase();

  const { active, archive } = useMemo(() => {
    const act = [];
    const arch = [];
    for (const t of tournaments) {
      if (!matchesQuery(t, q)) continue;
      if (computeStatus(t) === "finished") arch.push(t);
      else act.push(t);
    }
    return { active: act, archive: arch };
  }, [tournaments, q]);

  const sortedActive = useMemo(
    () => sortTournaments(active, sortBy, sortAsc), [active, sortBy, sortAsc]);
  const sortedArchive = useMemo(
    () => sortTournaments(archive, sortBy, sortAsc), [archive, sortBy, sortAsc]);

  const openTournament = (t) => {
    addTab({ id: t.id, name: t.name });
    navigate(`/tournament/${t.id}`);
  };

  const handleCreated = (t) => {
    setTournaments((prev) => [...prev, t]);
    setModalOpen(false);
  };

  return (
    <NavBar>
      <div className={styles.content}>
        <div className={styles.statGrid}>
          <Stat value={active.length} label="Активних" delay={0} />
          <Stat value={archive.length} label="В архіві" delay={80} />
          <Stat value={tournaments.length} label="Всього" delay={160} />
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Активні
              {sortedActive.length > 0 && (
                <span className={styles.countText}>&nbsp;· {sortedActive.length}</span>
              )}
            </h3>
            <div className={styles.headerActions}>
              <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
                {isAdmin ? "Створити турнір" : "Приєднатися"}
              </button>
              {sortedActive.length > 0 && (
                <button type="button" className={styles.linkBtn}
                  onClick={() => navigate("/tournaments/active")}>
                  Показати всі
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <div className={styles.row}>
              {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
            </div>
          ) : sortedActive.length === 0 ? (
            <div className={styles.emptyBlock}>
              <p>{q ? "Нічого не знайдено. Спробуйте інший запит." : isAdmin
                ? "Активних турнірів ще немає. Створіть перший — це займе хвилину."
                : "У вас ще немає активних турнірів. Приєднайтеся за посиланням від організатора."}</p>
              {!q && (
                <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
                  {isAdmin ? "Створити турнір" : "Приєднатися"}
                </button>
              )}
            </div>
          ) : (
            <ScrollRow classes={styles}>
              {sortedActive.map((t) => (
                <TournamentCell key={t.id} tournament={t} onOpen={openTournament} />
              ))}
            </ScrollRow>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Архів
              {sortedArchive.length > 0 && (
                <span className={styles.countText}>&nbsp;· {sortedArchive.length}</span>
              )}
            </h3>
            {sortedArchive.length > 0 && (
              <button type="button" className={styles.linkBtn}
                onClick={() => navigate("/tournaments/archive")}>
                Показати всі
              </button>
            )}
          </div>
          {loading ? (
            <div className={styles.row}>
              {[0, 1].map((i) => <div key={i} className={styles.skeleton} />)}
            </div>
          ) : sortedArchive.length === 0 ? (
            <div className={styles.emptyBlock}>Завершені турніри автоматично потрапляють сюди</div>
          ) : (
            <ScrollRow classes={styles}>
              {sortedArchive.map((t) => (
                <TournamentCell key={t.id} tournament={t} dimmed onOpen={openTournament} />
              ))}
            </ScrollRow>
          )}
        </section>
      </div>

      {modalOpen && isAdmin && (
        <CreateTournamentModal onClose={() => setModalOpen(false)} onCreate={handleCreated} />
      )}
      {modalOpen && !isAdmin && (
        <JoinByCodeModal onClose={() => setModalOpen(false)} />
      )}
    </NavBar>
  );
}
