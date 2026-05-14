import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import API from "@api";
import NavBar from "@shared/components/NavBar";
import TournamentCard from "@shared/components/TournamentCard";
import JoinByCodeModal from "@shared/components/JoinByCodeModal";
import { computeStatus } from "@shared/components/tournamentHelpers";
import styles from "@shared/styles/tournaments.module.css";

// ─── Сортування ───────────────────────────────────────────────────────────────

const STATUS_ORDER = { ongoing: 0, registration: 1, upcoming: 2, finished: 3 };

function sortTournaments(list, sortBy, sortAsc) {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") {
      const da = new Date(a.start_date ?? 0);
      const db = new Date(b.start_date ?? 0);
      cmp = da - db;
    } else if (sortBy === "status") {
      const sa = STATUS_ORDER[computeStatus(a)] ?? 99;
      const sb = STATUS_ORDER[computeStatus(b)] ?? 99;
      cmp = sa - sb;
    } else {
      cmp = (a.name ?? "").localeCompare(b.name ?? "", "uk");
    }
    return sortAsc ? cmp : -cmp;
  });
}

// ─── ParticipantTournaments ───────────────────────────────────────────────────

const ParticipantTournaments = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { addTab } = useTabs();

  const [tournaments, setTournaments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showJoin,    setShowJoin]    = useState(false);

  // Сортування
  const [sortBy,  setSortBy]  = useState("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Вкладка
  const [tab, setTab] = useState("active");

  // Collapsed архів на вкладці "active"
  const [archiveOpen, setArchiveOpen] = useState(false);

  const fetchTournaments = () => {
    setLoading(true);
    API.get("/tournaments/")
      .then((res) => setTournaments(res.data))
      .catch((err) => console.error("Помилка завантаження турнірів:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTournaments(); }, []);

  useEffect(() => {
    if (location.state?.refetch) {
      fetchTournaments();
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const { active, archive } = useMemo(() => {
    const active  = [];
    const archive = [];
    for (const t of tournaments) {
      if (computeStatus(t) === "finished") archive.push(t);
      else active.push(t);
    }
    return { active, archive };
  }, [tournaments]);

  const sortedActive  = useMemo(() => sortTournaments(active,  sortBy, sortAsc), [active,  sortBy, sortAsc]);
  const sortedArchive = useMemo(() => sortTournaments(archive, sortBy, sortAsc), [archive, sortBy, sortAsc]);

  const openTournament = (tournament) => {
    addTab({ id: tournament.id, name: tournament.name });
    navigate(`/tournament/${tournament.id}`);
  };

  const displayList = tab === "archive" ? sortedArchive : sortedActive;

  return (
    <NavBar>
      <div className={styles.page}>

        {/* ── Шапка ── */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Турніри</h1>
          <div className={styles.pageActions}>
            <button className={styles.createBtn} onClick={() => setShowJoin(true)}>
              + Приєднатися до турніру
            </button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          <div className={styles.segmentTabs}>
            <button
              className={`${styles.segmentTab} ${tab === "active" ? styles.segmentTabActive : ""}`}
              onClick={() => setTab("active")}
            >
              Мої турніри
              <span className={styles.segmentTabBadge}>{active.length}</span>
            </button>
            <button
              className={`${styles.segmentTab} ${tab === "archive" ? styles.segmentTabActive : ""}`}
              onClick={() => setTab("archive")}
            >
              🗄 Архів
              <span className={styles.segmentTabBadge}>{archive.length}</span>
            </button>
          </div>

          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Сортування:</span>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">За датою</option>
              <option value="status">За статусом</option>
              <option value="name">За назвою</option>
            </select>
            <button
              className={styles.sortOrderBtn}
              onClick={() => setSortAsc((v) => !v)}
              title={sortAsc ? "За спаданням" : "За зростанням"}
            >
              {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* ── Контент ── */}
        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard} style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        ) : (
          <div className={styles.gridWrapper}>

            {displayList.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>{tab === "archive" ? "🗄" : "🏆"}</div>
                <p className={styles.emptyTitle}>
                  {tab === "archive" ? "Архів порожній" : "Ви ще не берете участі в турнірах"}
                </p>
                <p className={styles.emptyText}>
                  {tab === "archive"
                    ? "Завершені турніри автоматично потрапляють сюди"
                    : "Натисніть «+ Приєднатися до турніру», щоб розпочати"}
                </p>
              </div>
            ) : (
              <div className={styles.tournamentGrid}>
                {displayList.map((tournament) => (
                  <div
                    key={tournament.id}
                    className={tab === "archive" ? styles.archiveCard : styles.tournamentCard}
                    onClick={() => openTournament(tournament)}
                  >
                    <TournamentCard
                      name={tournament.name}
                      info={tournament.description}
                      date={tournament.start_date}
                      accentColor={tournament.accent_color}
                      imageMode={tournament.image_mode}
                      stockImage={tournament.stock_image}
                      customImage={tournament.custom_image ?? null}
                      status={computeStatus(tournament)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Архів collapsed на активній вкладці ── */}
            {tab === "active" && sortedArchive.length > 0 && (
              <div className={styles.archiveSection}>
                <div className={styles.archiveHeader}>
                  <div className={styles.archiveHeaderLine} />
                  <button
                    className={styles.archiveToggleBtn}
                    onClick={() => setArchiveOpen((v) => !v)}
                  >
                    🗄 Архів ({sortedArchive.length})
                    <i className={`${styles.archiveChevron} ${archiveOpen ? styles.archiveChevronOpen : ""}`}>▼</i>
                  </button>
                  <div className={styles.archiveHeaderLine} />
                </div>

                {archiveOpen && (
                  <div className={styles.archiveGrid}>
                    {sortedArchive.map((tournament) => (
                      <div
                        key={tournament.id}
                        className={styles.archiveCard}
                        onClick={() => openTournament(tournament)}
                      >
                        <TournamentCard
                          name={tournament.name}
                          info={tournament.description}
                          date={tournament.start_date}
                          accentColor={tournament.accent_color}
                          imageMode={tournament.image_mode}
                          stockImage={tournament.stock_image}
                          customImage={tournament.custom_image ?? null}
                          status={computeStatus(tournament)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showJoin && <JoinByCodeModal onClose={() => setShowJoin(false)} />}
    </NavBar>
  );
};

export default ParticipantTournaments;
