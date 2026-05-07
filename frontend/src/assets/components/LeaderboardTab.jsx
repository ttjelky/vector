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

const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
const MEDAL_LABELS = { 1: "1", 2: "2", 3: "3" };

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

// ── Excel export ──────────────────────────────────────────────────────────────

async function exportToExcel({ ranked, roundIds, roundMap, tournamentId }) {
  // Dynamic import — не впливає на початковий бандл
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // ── Заголовки ──
  const header = ["#", "Учасник", ...roundIds.map(id => roundMap[id]), "Разом"];

  // ── Рядки даних ──
  const rows = ranked.map(p => [
    p.rank,
    p.participant_name,
    ...roundIds.map(id => p.round_scores?.[id] ?? ""),
    p.total,
  ]);

  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Ширина колонок ──
  ws["!cols"] = [
    { wch: 5 },                                              // #
    { wch: 30 },                                             // Учасник
    ...roundIds.map(() => ({ wch: 16 })),                   // Раунди
    { wch: 12 },                                             // Разом
  ];

  // ── Стилі заголовка ──
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
    fill: { fgColor: { rgb: "4F46E5" }, patternType: "solid" },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: "3730A3" } },
    },
  };

  header.forEach((_, colIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (!ws[cellAddr]) ws[cellAddr] = {};
    ws[cellAddr].s = headerStyle;
  });

  // ── Стилі рядків (медалі + зебра) ──
  const medalFills = {
    1: { fgColor: { rgb: "FFF9C4" }, patternType: "solid" }, // золото
    2: { fgColor: { rgb: "F0F0F0" }, patternType: "solid" }, // срібло
    3: { fgColor: { rgb: "FFE0CC" }, patternType: "solid" }, // бронза
  };

  const zebraFill   = { fgColor: { rgb: "F8F7FF" }, patternType: "solid" };
  const centerAlign = { horizontal: "center", vertical: "center" };
  const leftAlign   = { horizontal: "left",   vertical: "center" };

  ranked.forEach((p, rowIdx) => {
    const excelRow = rowIdx + 1; // +1 через заголовок
    const fill = medalFills[p.rank] ?? (rowIdx % 2 === 1 ? zebraFill : undefined);

    header.forEach((_, colIdx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: excelRow, c: colIdx });
      if (!ws[cellAddr]) ws[cellAddr] = { v: "", t: "s" };

      const isName  = colIdx === 1;
      const isTotal = colIdx === header.length - 1;

      ws[cellAddr].s = {
        font: {
          name: "Arial",
          sz: 10,
          bold: isTotal,
          color: isTotal ? { rgb: "1E1B4B" } : undefined,
        },
        alignment: isName ? leftAlign : centerAlign,
        ...(fill ? { fill } : {}),
        border: {
          bottom: { style: "hair", color: { rgb: "E5E7EB" } },
          right:  colIdx === header.length - 1
            ? undefined
            : { style: "hair", color: { rgb: "E5E7EB" } },
        },
      };
    });
  });

  // ── Закріпити перший рядок ──
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  XLSX.utils.book_append_sheet(wb, ws, "Таблиця лідерів");

  // ── Зберегти ──
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `leaderboard_${tournamentId}_${date}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LeaderboardTab({ tournamentId, rounds = [], roundsLoading, isOwner, myRole }) {
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [published,    setPublished]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [sortBy,       setSortBy]       = useState("total");
  const [publishing,   setPublishing]   = useState(false);
  const [exporting,    setExporting]    = useState(false);

  const canAlwaysSee = isOwner || myRole === "admin";

  const fetchLeaderboard = () => {
    setLoading(true);
    setError(null);

    API.get(`/tournaments/${tournamentId}/leaderboard/`)
      .then(r => {
        const data = r.data;
        setPublished(data.is_published ?? true);
        setLeaderboard(data.participants ?? data ?? []);
        setLoading(false);
      })
      .catch(err => {
        const status = err?.response?.status;
        if (status === 403) {
          setPublished(false);
          setLoading(false);
        } else if (status === 404) {
          if (canAlwaysSee) {
            API.get(`/tournaments/${tournamentId}/jury/submissions/`)
              .then(r => {
                setPublished(true);
                setLeaderboard(aggregateFromSubmissions(r.data.submissions ?? []));
              })
              .catch(() => setError("Не вдалося завантажити дані."))
              .finally(() => setLoading(false));
          } else {
            setPublished(false);
            setLoading(false);
          }
        } else {
          setError("Не вдалося завантажити таблицю лідерів.");
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    if (!tournamentId) return;
    fetchLeaderboard();
  }, [tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTogglePublish = async () => {
    setPublishing(true);
    try {
      const res = await API.patch(`/tournaments/${tournamentId}/leaderboard/`, {
        is_published: !published,
      });
      setPublished(res.data.is_published ?? !published);
    } catch (err) {
      console.error("Помилка зміни публікації:", err);
    } finally {
      setPublishing(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportToExcel({ ranked, roundIds, roundMap, tournamentId });
    } catch (err) {
      console.error("Помилка експорту:", err);
    } finally {
      setExporting(false);
    }
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
      .sort((a, b) => {
        if (sortBy === "total") return b.total - a.total;
        return (b.round_scores?.[sortBy] ?? 0) - (a.round_scores?.[sortBy] ?? 0);
      })
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [leaderboard, sortBy]);

  // ── Render ──

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

      {/* Панель публікації — тільки для owner/admin */}
      {canAlwaysSee && (
        <div className={`${styles.publishBar} ${published ? styles.publishBarActive : styles.publishBarDraft}`}>
          <div className={styles.publishInfo}>
            <span className={styles.publishDot} />
            <div>
              <span className={styles.publishStatus}>
                {published ? "Таблиця опублікована" : "Таблиця прихована від учасників і журі"}
              </span>
              <span className={styles.publishHint}>
                {published
                  ? "Учасники та журі бачать результати"
                  : "Тільки адміністратори бачать таблицю зараз"
                }
              </span>
            </div>
          </div>
          <button
            className={`${styles.publishBtn} ${published ? styles.publishBtnHide : styles.publishBtnShow}`}
            onClick={handleTogglePublish}
            disabled={publishing}
          >
            {publishing
              ? "Збереження…"
              : published
              ? "Приховати таблицю"
              : "Опублікувати таблицю"
            }
          </button>
        </div>
      )}

      {/* Порожня таблиця */}
      {leaderboard.length === 0 ? (
        <div className={styles.stateBox}>
          <span className={styles.stateIcon}>🏆</span>
          <span className={styles.emptyText}>Поки що немає оцінених робіт</span>
          <span className={styles.emptyHint}>Таблиця заповниться після того, як журі виставить перші оцінки</span>
        </div>
      ) : (
        <>
          {/* Controls row: sort pills + export button */}
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

            {/* Excel export button */}
            <button
              className={styles.exportBtn}
              onClick={handleExportExcel}
              disabled={exporting}
              title="Завантажити таблицю лідерів у форматі Excel"
            >
              {exporting ? (
                <>
                  <span className={styles.exportSpinner} />
                  Експорт…
                </>
              ) : (
                <>
                  <svg
                    className={styles.exportIcon}
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 14.5V16a1 1 0 001 1h12a1 1 0 001-1v-1.5M10 3v9m0 0l-3-3m3 3l3-3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Excel
                </>
              )}
            </button>
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thRank}>#</th>
                  <th className={styles.thName}>Учасник</th>
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
                    key={p.participant_name}
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
                        <div className={styles.avatar} style={{ background: getAvatarColor(p.participant_name) }}>
                          {getInitials(p.participant_name)}
                        </div>
                        <span className={styles.participantName}>{p.participant_name}</span>
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
