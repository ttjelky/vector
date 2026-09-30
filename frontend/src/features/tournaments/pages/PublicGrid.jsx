import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "@shared/contexts/SearchContext";
import { API } from "@api";
import { NavBar } from "@shared/components/NavBar";
import { computeStatus, matchesQuery, sortTournaments, usePublicJoin } from "../components/tournamentHelpers";
import { PublicCell, PublicJoinDialog } from "../components/PublicCard";
import styles from "../styles/tournaments.module.css";

// ─── Вертикальна сітка секції каталогу ────────────────────────────────────────
// status: один із registration | ongoing | upcoming | finished.
// На відміну від стрічок, тут є фільтр формату та сортування.

const PUBLIC_GRID_TITLE = {
  registration: "Реєстрація",
  ongoing: "Тривають",
  upcoming: "Скоро",
  finished: "Архів",
};

export function PublicGrid({ status }) {
  const isArchive = status === "finished";
  const navigate = useNavigate();
  const { searchQuery } = useSearch();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all"); // all | solo | team

  const join = usePublicJoin(navigate);

  useEffect(() => {
    API.get("/tournaments/public/")
      .then((res) => setTournaments(res.data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const q = searchQuery.trim().toLowerCase();

  const list = useMemo(() => {
    const out = [];
    for (const t of tournaments) {
      if (computeStatus(t) !== status) continue;
      if (!matchesQuery(t, q)) continue;
      if (typeFilter !== "all" && t.tournament_type !== typeFilter) continue;
      out.push(t);
    }
    return sortTournaments(out, sortBy, sortAsc);
  }, [tournaments, status, q, typeFilter, sortBy, sortAsc]);

  return (
    <NavBar
      topbarSlot={
        <button type="button" className={`btn-secondary ${styles.topbarBackBtn}`} onClick={() => navigate("/public")}>
          ← До каталогу
        </button>
      }
    >
      <div className={styles.content}>
        <div className={styles.gridTop}>
          <button type="button" className={styles.linkBtn} onClick={() => navigate("/public")}>
            ← До каталогу
          </button>
        </div>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            {PUBLIC_GRID_TITLE[status] ?? "Каталог"}
            {list.length > 0 && (
              <span className={styles.countText}>&nbsp;· {list.length}</span>
            )}
          </h3>
          <div className={styles.filterGroup}>
            <select
              className={styles.sortSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Формат турніру"
            >
              <option value="all">Всі формати</option>
              <option value="solo">Одиночні</option>
              <option value="team">Командні</option>
            </select>
            <div className={styles.sortRow}>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Сортування турнірів"
              >
                <option value="date">За датою</option>
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
        </div>
        {loading ? (
          <div className={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.gridSkeleton} />)}
          </div>
        ) : list.length === 0 ? (
          <div className={styles.emptyBlock}>
            {q ? "Нічого не знайдено. Спробуйте інший запит."
              : "Тут поки порожньо. Спробуйте змінити фільтри."}
          </div>
        ) : (
          <div className={styles.grid}>
            {list.map((t) => (
              <PublicCell
                key={t.id}
                t={t}
                dimmed={isArchive}
                cellClass={styles.gridCell}
                onJoin={join.openJoin}
              />
            ))}
          </div>
        )}
      </div>

      <PublicJoinDialog join={join} />
    </NavBar>
  );
}
