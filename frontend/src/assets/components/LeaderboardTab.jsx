
import { useState, useEffect, useMemo } from "react";
import styles from "./styles/LeaderboardTab.module.css";
import API from "../../api";

function getInitials(name = "") {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function getAvatarColor(str = "") {
  const palette = ["#dbeafe","#dcfce7","#fef9c3","#ede9fe","#fce7f3","#cffafe","#ffedd5"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

const MEDAL_LABELS = { 1: "🥇", 2: "🥈", 3: "🥉" };

function aggregateFromSubmissions(submissions) {
  const byParticipant = {};
  submissions.forEach(sub => {
    const name = sub.author_name || "Невідомий";
    if (!byParticipant[name]) {
      byParticipant[name] = { participant_name: name, round_scores: {}, total: 0 };
    }
    const grade = sub.my_grade;
    if (!grade) return;
    const score = grade.total ?? (
      grade.scores
        ? Object.values(grade.scores).map(Number).filter(v => !isNaN(v)).reduce((a, b) => a + b, 0)
        : 0
    );
    const roundId = String(sub.round_id);
    byParticipant[name].round_scores[roundId] = (byParticipant[name].round_scores[roundId] ?? 0) + score;
    byParticipant[name].total += score;
  });
  return Object.values(byParticipant);
}

async function exportToExcel({ ranked, roundIds, roundMap, tournamentId, isTeam }) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const nameCol = isTeam ? "Команда" : "Учасник";
  const header = ["#", nameCol, ...roundIds.map(id => roundMap[id]), "Разом"];
  const rows = ranked.map(p => [
    p.rank,
    isTeam ? p.team_name : p.participant_name,
    ...roundIds.map(id => p.round_scores?.[id] ?? ""),
    p.total,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 5 }, { wch: 30 }, ...roundIds.map(() => ({ wch: 16 })), { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Таблиця лідерів");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `leaderboard_${tournamentId}_${date}.xlsx`);
}

export default function LeaderboardTab({ tournamentId, rounds = [], roundsLoading, isOwner, myRole }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [published,   setPublished]   = useState(null);
  const [isTeam,      setIsTeam]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [sortBy,      setSortBy]      = useState("total");
  const [publishing,  setPublishing]  = useState(false);
  const [exporting,   setExporting]   = useState(false);

  const canAlwaysSee = isOwner || myRole === "admin";

  const fetchLeaderboard = () => {
    setLoading(true); setError(null);
    API.get(`/tournaments/${tournamentId}/leaderboard/`)
      .then(r => {
        const data = r.data;
        setPublished(data.is_published ?? true);
        setIsTeam(data.tournament_type === "team");
        setLeaderboard(data.participants ?? []);
        setLoading(false);
      })
      .catch(err => {
        const s = err?.response?.status;
        if (s === 403) { setPublished(false); setLoading(false); }
        else if (s === 404 && canAlwaysSee) {
          API.get(`/tournaments/${tournamentId}/jury/submissions/`)
            .then(r => {
              setPublished(true);
              setLeaderboard(aggregateFromSubmissions(r.data.submissions ?? []));
            })
            .catch(() => setError("Не вдалося завантажити дані."))
            .finally(() => setLoading(false));
        } else {
          setError("Не вдалося завантажити таблицю лідерів.");
          setLoading(false);
        }
      });
  };

  useEffect(() => { if (tournamentId) fetchLeaderboard(); }, [tournamentId]); // eslint-disable-line

  const handleTogglePublish = async () => {
    setPublishing(true);
    try {
      const res = await API.patch(`/tournaments/${tournamentId}/leaderboard/`, { is_published: !published });
      setPublished(res.data.is_published ?? !published);
    } catch { } finally { setPublishing(false); }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try { await exportToExcel({ ranked, roundIds, roundMap, tournamentId, isTeam }); }
    catch { } finally { setExporting(false); }
  };

  const roundIds = useMemo(() => {
    const ids = new Set();
    leaderboard.forEach(p => Object.keys(p.round_scores ?? {}).forEach(id => ids.add(id)));
    const sorted = rounds.map(r => String(r.id)).filter(id => ids.has(id));
    ids.forEach(id => { if (!sorted.includes(id)) sorted.push(id); });
    return sorted;
  }, [leaderboard, rounds]);

  const roundMap = useMemo(() => {
    const map = {};
    rounds.forEach(r => { map[String(r.id)] = r.name || r.title || `Раунд ${r.id}`; });
    roundIds.forEach(id => { if (!map[id]) map[id] = `Раунд ${id}`; });
    return map;
  }, [rounds, roundIds]);

  const ranked = useMemo(() => {
    return [...leaderboard]
      .sort((a, b) => sortBy === "total"
        ? b.total - a.total
        : (b.round_scores?.[sortBy] ?? 0) - (a.round_scores?.[sortBy] ?? 0)
      )
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [leaderboard, sortBy]);

  // Ім'я рядка залежить від типу
  const getRowName = (p) => isTeam ? p.team_name : p.participant_name;

  if (loading || roundsLoading) return (
    <div className={styles.stateBox}>
      <div className={styles.spinner} />
      <span>Завантаження таблиці лідерів…</span>
    </div>
  );

  if (error) return (
    <div className={styles.stateBox}>
      <span className={styles.stateIcon}>⚠️</span>
      <span className={styles.errorText}>{error}</span>
    </div>
  );

  if (!canAlwaysSee && !published) return (
    <div className={styles.stateBox}>
      <span className={styles.stateIcon}>🔒</span>
      <span className={styles.emptyText}>Таблиця лідерів ще не опублікована</span>
      <span className={styles.emptyHint}>Організатор опублікує результати після завершення оцінювання</span>
    </div>
  );

  return (
    <div className={styles.wrap}>
      {/* Тип турніру — бейдж */}
      {isTeam && (
        <div className={styles.teamBadge}>👥 Командний турнір — результати по командах</div>
      )}

      {/* Панель публікації */}
      {canAlwaysSee && (
        <div className={`${styles.publishBar} ${published ? styles.publishBarActive : styles.publishBarDraft}`}>
          <div className={styles.publishInfo}>
            <span className={styles.publishDot} />
            <div>
              <span className={styles.publishStatus}>
                {published ? "Таблиця опублікована" : "Таблиця прихована від учасників і журі"}
              </span>
              <span className={styles.publishHint}>
                {published ? "Учасники та журі бачать результати" : "Тільки адміністратори бачать таблицю зараз"}
              </span>
            </div>
          </div>
          <button
            className={`${styles.publishBtn} ${published ? styles.publishBtnHide : styles.publishBtnShow}`}
            onClick={handleTogglePublish}
            disabled={publishing}
          >
            {publishing ? "Збереження…" : published ? "Приховати таблицю" : "Опублікувати таблицю"}
          </button>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className={styles.stateBox}>
          <span className={styles.stateIcon}>🏆</span>
          <span className={styles.emptyText}>Поки що немає оцінених робіт</span>
          <span className={styles.emptyHint}>
            {isTeam
              ? "Таблиця заповниться після того, як журі оцінить роботи команд"
              : "Таблиця заповниться після того, як журі виставить перші оцінки"
            }
          </span>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            <span className={styles.controlsLabel}>Сортувати за:</span>
            <div className={styles.pills}>
              <button
                className={`${styles.pill} ${sortBy === "total" ? styles.pillActive : ""}`}
                onClick={() => setSortBy("total")}
              >
                Загальний бал
              </button>
              {roundIds.map(id => (
                <button
                  key={id}
                  className={`${styles.pill} ${sortBy === id ? styles.pillActive : ""}`}
                  onClick={() => setSortBy(id)}
                >
                  {roundMap[id]}
                </button>
              ))}
            </div>
            <button
              className={styles.exportBtn}
              onClick={handleExportExcel}
              disabled={exporting}
              title="Завантажити у форматі Excel"
            >
              {exporting ? <><span className={styles.exportSpinner} />Експорт…</> : (
                <><svg className={styles.exportIcon} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 14.5V16a1 1 0 001 1h12a1 1 0 001-1v-1.5M10 3v9m0 0l-3-3m3 3l3-3"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>Excel</>
              )}
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thRank}>#</th>
                  <th className={styles.thName}>{isTeam ? "Команда" : "Учасник"}</th>
                  {roundIds.map(id => (
                    <th key={id} className={`${styles.thScore} ${sortBy === id ? styles.thActive : ""}`}>
                      {roundMap[id]}
                    </th>
                  ))}
                  <th className={`${styles.thScore} ${styles.thTotal} ${sortBy === "total" ? styles.thActive : ""}`}>
                    Разом
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, idx) => (
                  <tr
                    key={getRowName(p)}
                    className={[
                      styles.row,
                      idx === 0 ? styles.rowGold   : "",
                      idx === 1 ? styles.rowSilver : "",
                      idx === 2 ? styles.rowBronze : "",
                    ].join(" ")}
                  >
                    <td className={styles.tdRank}>
                      {MEDAL_LABELS[p.rank] ?? <span className={styles.rankNum}>{p.rank}</span>}
                    </td>
                    <td className={styles.tdName}>
                      <div className={styles.participant}>
                        <div className={styles.avatar} style={{ background: getAvatarColor(getRowName(p)) }}>
                          {getInitials(getRowName(p))}
                        </div>
                        <div className={styles.participantInfo}>
                          <span className={styles.participantName}>{getRowName(p)}</span>
                          {isTeam && p.members_count && (
                            <span className={styles.participantSub}>{p.members_count} учасників</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {roundIds.map(id => (
                      <td key={id} className={`${styles.tdScore} ${sortBy === id ? styles.tdActive : ""}`}>
                        {p.round_scores?.[id] != null
                          ? <span className={styles.scoreValue}>{p.round_scores[id]}</span>
                          : <span className={styles.noScore}>—</span>
                        }
                      </td>
                    ))}
                    <td className={`${styles.tdScore} ${styles.tdTotal} ${sortBy === "total" ? styles.tdActive : ""}`}>
                      <span className={styles.totalValue}>{p.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles.footnote}>
            * Бали підраховані на основі оцінок журі за всіма завданнями раунду
          </p>
        </>
      )}
    </div>
  );
}