import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { useSearch } from "@shared/contexts/SearchContext";
import { API } from "@api";
import { NavBar } from "@shared/components/NavBar";
import { computeStatus, pluralize, sortTournaments, matchesQuery } from "../components/tournamentHelpers";
import { TournamentCell } from "../components/TournamentsHome";
import styles from "../styles/tournaments.module.css";

// ─── Сторінка вертикальної сітки: /tournaments/active | /tournaments/archive ──
// filter: "active" — усе крім завершених; "archive" — тільки завершені.

export function TournamentsGrid({ filter }) {
  const isArchive = filter === "archive";
  const navigate = useNavigate();
  const { addTab } = useTabs();
  const { searchQuery } = useSearch();

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    API.get("/tournaments/")
      .then((res) => setTournaments(res.data ?? []))
      .catch((err) => console.error("Помилка при завантаженні турнірів:", err))
      .finally(() => setLoading(false));
  }, []);

  const q = searchQuery.trim().toLowerCase();

  const list = useMemo(() => {
    const out = [];
    for (const t of tournaments) {
      if (!matchesQuery(t, q)) continue;
      const finished = computeStatus(t) === "finished";
      if (isArchive ? finished : !finished) out.push(t);
    }
    return sortTournaments(out, sortBy, sortAsc);
  }, [tournaments, q, isArchive, sortBy, sortAsc]);

  const openTournament = (t) => {
    addTab({ id: t.id, name: t.name });
    navigate(`/tournament/${t.id}`);
  };

  return (
    <NavBar
      topbarSlot={
        <button type="button" className={`btn-secondary ${styles.topbarBackBtn}`} onClick={() => navigate("/tournaments")}>
          ← До турнірів
        </button>
      }
    >
      <div className={styles.content}>
        <div className={styles.gridTop}>
          <button type="button" className={styles.linkBtn} onClick={() => navigate("/tournaments")}>
            ← До турнірів
          </button>
        </div>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            {isArchive ? "Архів" : "Активні турніри"}
            {list.length > 0 && (
              <span className={styles.countText}>&nbsp;· {pluralize(list.length, "турнір", "турніри", "турнірів")}</span>
            )}
          </h3>
          <div className={styles.sortRow}>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Сортування турнірів"
            >
              <option value="date">За датою</option>
              <option value="status">За статусом</option>
              <option value="name">За назвою</option>
            </select>
            <button
              type="button"
              className={styles.sortOrderBtn}
              onClick={() => setSortAsc((v) => !v)}
              title={sortAsc ? "За спаданням" : "За зростанням"}
              aria-label={sortAsc ? "За спаданням" : "За зростанням"}
            >
              {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>
        {loading ? (
          <div className={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.gridSkeleton} />)}
          </div>
        ) : list.length === 0 ? (
          <div className={styles.emptyBlock}>
            {q ? "Нічого не знайдено. Спробуйте інший запит."
              : isArchive ? "Архів порожній. Завершені турніри потрапляють сюди автоматично."
              : "Активних турнірів немає."}
          </div>
        ) : (
          <div className={styles.grid}>
            {list.map((t) => (
              <TournamentCell
                key={t.id}
                tournament={t}
                dimmed={isArchive}
                onOpen={openTournament}
                className={styles.gridCell}
              />
            ))}
          </div>
        )}
      </div>
    </NavBar>
  );
}
