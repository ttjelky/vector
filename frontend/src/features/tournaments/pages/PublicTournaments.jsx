import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "@shared/contexts/SearchContext";
import { API } from "@api";
import { NavBar } from "@shared/components/NavBar";
import { ScrollRow } from "@features/dashboard";
import { computeStatus, matchesQuery, sortTournaments, usePublicJoin } from "../components/tournamentHelpers";
import { PublicCell, PublicJoinDialog } from "../components/PublicCard";
import { Stat } from "../components/TournamentsHome";
import styles from "../styles/tournaments.module.css";

const ROW_LIMIT = 6;

const SECTIONS = [
  { key: "registration", title: "Реєстрація" },
  { key: "ongoing", title: "Тривають" },
  { key: "upcoming", title: "Скоро" },
  { key: "finished", title: "Архів", dimmed: true },
];

const PUBLIC_SECTION_PATH = {
  registration: "/public/registration",
  ongoing: "/public/ongoing",
  upcoming: "/public/upcoming",
  finished: "/public/archive",
};

const PublicTournaments = () => {
  const navigate = useNavigate();
  const { searchQuery } = useSearch();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const join = usePublicJoin(navigate);

  useEffect(() => {
    API.get("/tournaments/public/")
      .then((res) => setTournaments(res.data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const q = searchQuery.trim().toLowerCase();

  const openCount = useMemo(
    () => tournaments.filter((t) => t.registration_open !== false).length,
    [tournaments],
  );
  const teamCount = useMemo(
    () => tournaments.filter((t) => t.tournament_type === "team").length,
    [tournaments],
  );

  const groups = useMemo(() => {
    const byStatus = { registration: [], ongoing: [], upcoming: [], finished: [] };
    for (const t of tournaments) {
      if (!matchesQuery(t, q)) continue;
      const s = computeStatus(t);
      if (byStatus[s]) byStatus[s].push(t);
    }
    // У стрічках — свіжі першими.
    for (const k of Object.keys(byStatus)) {
      byStatus[k] = sortTournaments(byStatus[k], "date", false);
    }
    return byStatus;
  }, [tournaments, q]);

  const visibleSections = SECTIONS.filter((s) => groups[s.key].length > 0);
  const isEmpty = visibleSections.length === 0;

  return (
    <NavBar>
      <div className={styles.content}>
        <div className={styles.statGrid}>
          <Stat value={tournaments.length} label="У каталозі" delay={0} />
          <Stat value={openCount} label="З відкритою реєстрацією" delay={80} />
          <Stat value={teamCount} label="Командних" delay={160} />
        </div>

        {loading ? (
          <section className={styles.section}>
            <div className={styles.row}>
              {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
            </div>
          </section>
        ) : isEmpty ? (
          <div className={styles.emptyBlock}>
            {q ? "Нічого не знайдено. Спробуйте інший запит."
              : "Публічних турнірів немає."}
          </div>
        ) : (
          visibleSections.map((s) => {
            const list = groups[s.key];
            return (
              <section key={s.key} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    {s.title}
                    <span className={styles.countText}>&nbsp;· {list.length}</span>
                  </h3>
                  {list.length > ROW_LIMIT && (
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => navigate(PUBLIC_SECTION_PATH[s.key])}
                    >
                      Показати всі
                    </button>
                  )}
                </div>
                <ScrollRow classes={styles}>
                  {list.slice(0, ROW_LIMIT).map((t) => (
                    <PublicCell
                      key={t.id}
                      t={t}
                      dimmed={s.dimmed}
                      cellClass={styles.cell}
                      onJoin={join.openJoin}
                    />
                  ))}
                </ScrollRow>
              </section>
            );
          })
        )}
      </div>

      <PublicJoinDialog join={join} />
    </NavBar>
  );
};

export { PublicTournaments };
