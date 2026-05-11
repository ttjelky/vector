import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./styles/LeaderboardTab.module.css";
import detailStyles from "./styles/LeaderboardDetail.module.css";
import API from "../../api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function aggregateFromSubmissions(submissions) {
  const byParticipant = {};
  submissions.forEach(sub => {
    const name = sub.author_name || "Невідомий";
    const pid  = sub.participant_id || name;
    if (!byParticipant[pid]) {
      byParticipant[pid] = { participant_id: pid, participant_name: name, round_scores: {}, total: 0 };
    }
    const grade = sub.my_grade;
    if (!grade) return;
    const score = grade.total ?? (
      grade.scores
        ? Object.values(grade.scores).map(Number).filter(v => !isNaN(v)).reduce((a, b) => a + b, 0)
        : 0
    );
    const roundId = String(sub.round_id);
    byParticipant[pid].round_scores[roundId] = (byParticipant[pid].round_scores[roundId] ?? 0) + score;
    byParticipant[pid].total += score;
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

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial", sz: 11 },
    fill: { fgColor: { rgb: "4F46E5" }, patternType: "solid" },
    alignment: { horizontal: "center", vertical: "center" },
    border: { bottom: { style: "thin", color: { rgb: "3730A3" } } },
  };
  header.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) ws[addr] = {};
    ws[addr].s = headerStyle;
  });

  const medalFills = {
    1: { fgColor: { rgb: "FFF9C4" }, patternType: "solid" },
    2: { fgColor: { rgb: "F0F0F0" }, patternType: "solid" },
    3: { fgColor: { rgb: "FFE0CC" }, patternType: "solid" },
  };
  const zebraFill = { fgColor: { rgb: "F8F7FF" }, patternType: "solid" };

  ranked.forEach((p, rowIdx) => {
    const excelRow = rowIdx + 1;
    const fill = medalFills[p.rank] ?? (rowIdx % 2 === 1 ? zebraFill : undefined);
    header.forEach((_, c) => {
      const addr = XLSX.utils.encode_cell({ r: excelRow, c });
      if (!ws[addr]) ws[addr] = { v: "", t: "s" };
      ws[addr].s = {
        font: { name: "Arial", sz: 10, bold: c === header.length - 1 },
        alignment: { horizontal: c === 1 ? "left" : "center", vertical: "center" },
        ...(fill ? { fill } : {}),
        border: { bottom: { style: "hair", color: { rgb: "E5E7EB" } } },
      };
    });
  });

  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
  XLSX.utils.book_append_sheet(wb, ws, "Таблиця лідерів");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `leaderboard_${tournamentId}_${date}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000;

// ── ScoreBar ──────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 10, color = "#6366f1" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={detailStyles.scoreBar}>
      <div
        className={detailStyles.scoreBarFill}
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ── RoundSection (shared between ParticipantDetail and TeamDetail) ────────────

function RoundSection({ round, criteria_meta, criteriaColors, isPrivileged, showJuryBreak, submissions, members }) {
  return (
    <div className={detailStyles.roundSection}>
      <div className={detailStyles.roundSectionHeader}>
        <h3 className={detailStyles.roundTitle}>{round.round_title}</h3>
        <span className={detailStyles.roundAvg}>
          Середній бал: <strong>{round.avg_total}</strong>
        </span>
      </div>

      {criteria_meta.length > 0 && round.criteria_avg && (
        <div className={detailStyles.criteriaGrid}>
          {criteria_meta.map(c => {
            const val = round.criteria_avg?.[c.key] ?? null;
            if (val === null) return null;
            return (
              <div key={c.key} className={detailStyles.criteriaRow}>
                <div className={detailStyles.criteriaLabelRow}>
                  <span className={detailStyles.criteriaLabel}>{c.label}</span>
                  <span className={detailStyles.criteriaValue} style={{ color: criteriaColors[c.key] }}>
                    {val} <span className={detailStyles.criteriaMax}>/ {c.max}</span>
                  </span>
                </div>
                <ScoreBar value={val} max={c.max} color={criteriaColors[c.key]} />
              </div>
            );
          })}
        </div>
      )}

      {submissions && submissions.length > 0 && (
        <div className={detailStyles.submissionsTable}>
          <div className={detailStyles.submissionsHead}>
            <span className={detailStyles.subThName}>Учасник</span>
            <span className={detailStyles.subThTask}>Завдання</span>
            {criteria_meta.map(c => (
              <span key={c.key} className={detailStyles.subThCrit} title={c.label}>
                {c.label.split(" ")[0]}
              </span>
            ))}
            <span className={detailStyles.subThTotal}>Бал</span>
          </div>
          {submissions.map((s, idx) => {
            const member = members?.find(m => m.participant_id === s.participant_id);
            return (
              <div key={s.submission_id ?? idx} className={detailStyles.submissionsRow}>
                <span className={detailStyles.subCellName}>
                  <span className={detailStyles.subAvatar} style={{ background: getAvatarColor(s.participant_name ?? member?.name ?? "") }}>
                    {getInitials(s.participant_name ?? member?.name ?? "?")}
                  </span>
                  <span>{s.participant_name ?? member?.name ?? "—"}</span>
                  {member?.is_captain && <span style={{ fontSize: 11 }}>👑</span>}
                </span>
                <span className={detailStyles.subCellTask}>{s.task_title ?? `Завдання ${s.task_id}`}</span>
                {criteria_meta.map(c => (
                  <span key={c.key} className={detailStyles.subCellCrit}>
                    {s.scores?.[c.key] != null
                      ? <span style={{ color: criteriaColors[c.key], fontWeight: 600 }}>{s.scores[c.key]}</span>
                      : <span className={detailStyles.noScore}>—</span>}
                  </span>
                ))}
                <span className={detailStyles.subCellTotal}>{s.total ?? "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      {isPrivileged && showJuryBreak && round.jury_breakdown?.length > 0 && (
        <div className={detailStyles.jurySection}>
          <p className={detailStyles.jurySectionTitle}><JuryIcon /> Оцінки журі</p>
          <div className={detailStyles.juryTable}>
            <div className={detailStyles.juryTableHead}>
              <span className={detailStyles.juryTableThName}>Журі</span>
              {criteria_meta.map(c => (
                <span key={c.key} className={detailStyles.juryTableTh} title={c.label}>
                  {c.label.split(" ")[0]}
                </span>
              ))}
              <span className={detailStyles.juryTableThTotal}>Разом</span>
            </div>
            {round.jury_breakdown.map(j => (
              <div key={j.juror_id} className={detailStyles.juryTableRow}>
                <span className={detailStyles.juryTableName}>{j.juror_name}</span>
                {criteria_meta.map(c => (
                  <span key={c.key} className={detailStyles.juryTableCell}>
                    {j.scores?.[c.key] ?? <span className={detailStyles.noScore}>—</span>}
                  </span>
                ))}
                <span className={detailStyles.juryTableTotal}>{j.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TeamDetail ────────────────────────────────────────────────────────────────

function TeamDetail({ tournamentId, teamId, isPrivileged, onClose }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [activeRound,   setActiveRound]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    API.get(`/tournaments/${tournamentId}/leaderboard/team/${teamId}/`)
      .then(r => {
        setData(r.data);
        if (r.data.rounds?.length === 1) setActiveRound(r.data.rounds[0].round_id);
      })
      .catch(() => setError("Не вдалося завантажити деталізацію команди."))
      .finally(() => setLoading(false));
  }, [tournamentId, teamId]);

  const criteriaColors = useMemo(() => {
    const palette = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ec4899","#8b5cf6","#14b8a6"];
    if (!data?.criteria_meta) return {};
    return Object.fromEntries(data.criteria_meta.map((c, i) => [c.key, palette[i % palette.length]]));
  }, [data]);

  if (loading) return (
    <div className={detailStyles.panel}>
      <div className={detailStyles.panelHeader}>
        <button className={detailStyles.backBtn} onClick={onClose}><BackIcon /> Назад</button>
      </div>
      <div className={detailStyles.stateBox}>
        <div className={detailStyles.spinner} /><span>Завантаження…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className={detailStyles.panel}>
      <div className={detailStyles.panelHeader}>
        <button className={detailStyles.backBtn} onClick={onClose}><BackIcon /> Назад</button>
      </div>
      <div className={detailStyles.stateBox}>
        <span className={detailStyles.errorText}>{error}</span>
      </div>
    </div>
  );

  const { team_name: _tn, participant_name: _pn, grand_total, members = [], rounds = [], criteria_avg = {}, criteria_meta = [] } = data;
  const team_name = _tn ?? _pn ?? "Команда";

  const visibleRounds = activeRound ? rounds.filter(r => r.round_id === activeRound) : rounds;
  const hasJury = rounds.some(r => r.jury_breakdown?.length > 0);

  return (
    <div className={detailStyles.panel}>
      <div className={detailStyles.panelHeader}>
        <button className={detailStyles.backBtn} onClick={onClose}>
          <BackIcon /> Назад до таблиці
        </button>
        <div className={detailStyles.headerRight} />
      </div>

      {/* Team hero */}
      <div className={detailStyles.hero}>
        <div className={detailStyles.heroAvatar} style={{ background: getAvatarColor(team_name) }}>
          {getInitials(team_name)}
        </div>
        <div className={detailStyles.heroInfo}>
          <h2 className={detailStyles.heroName}>{team_name}</h2>
          <span className={detailStyles.heroTotal}>
            Загальний бал команди: <strong>{grand_total}</strong>
          </span>
          {members.length > 0 && (
            <span className={detailStyles.heroSub}>👥 {members.length} учасників</span>
          )}
        </div>
      </div>



      {/* Round filter pills */}
      {rounds.length > 1 && (
        <div className={detailStyles.roundPills}>
          <button
            className={`${detailStyles.roundPill} ${activeRound === null ? detailStyles.roundPillActive : ""}`}
            onClick={() => setActiveRound(null)}
          >Всі раунди</button>
          {rounds.map(r => (
            <button
              key={r.round_id}
              className={`${detailStyles.roundPill} ${activeRound === r.round_id ? detailStyles.roundPillActive : ""}`}
              onClick={() => setActiveRound(r.round_id)}
            >{r.round_title}</button>
          ))}
        </div>
      )}

      {activeRound === null && criteria_meta.length > 0 && (
        <div className={detailStyles.section}>
          <h3 className={detailStyles.sectionTitle}>Середнє по критеріях (всі раунди)</h3>
          <div className={detailStyles.criteriaGrid}>
            {criteria_meta.map(c => {
              const val = criteria_avg[c.key] ?? 0;
              return (
                <div key={c.key} className={detailStyles.criteriaRow}>
                  <div className={detailStyles.criteriaLabelRow}>
                    <span className={detailStyles.criteriaLabel}>{c.label}</span>
                    <span className={detailStyles.criteriaValue} style={{ color: criteriaColors[c.key] }}>
                      {val} <span className={detailStyles.criteriaMax}>/ {c.max}</span>
                    </span>
                  </div>
                  <ScoreBar value={val} max={c.max} color={criteriaColors[c.key]} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visibleRounds.map(round => (
        <RoundSection
          key={round.round_id}
          round={round}
          criteria_meta={criteria_meta}
          criteriaColors={criteriaColors}
          isPrivileged={isPrivileged}
          showJuryBreak={true}
          submissions={round.submissions ?? []}
          members={members}
        />
      ))}
    </div>
  );
}

// ── ParticipantDetail ─────────────────────────────────────────────────────────

function ParticipantDetail({ tournamentId, participantId, isPrivileged, onClose }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showJuryBreak, setShowJuryBreak] = useState(false);
  const [activeRound,   setActiveRound]   = useState(null); // null = всі раунди

  useEffect(() => {
    setLoading(true);
    setError(null);
    API.get(`/tournaments/${tournamentId}/leaderboard/${participantId}/`)
      .then(r => {
        setData(r.data);
        // Якщо тільки один раунд — одразу його показуємо
        if (r.data.rounds?.length === 1) setActiveRound(r.data.rounds[0].round_id);
      })
      .catch(() => setError("Не вдалося завантажити деталізацію."))
      .finally(() => setLoading(false));
  }, [tournamentId, participantId]);

  // Колір для кожного критерію (стабільний)
  const criteriaColors = useMemo(() => {
    const palette = [
      "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
      "#ec4899", "#8b5cf6", "#14b8a6",
    ];
    if (!data?.criteria_meta) return {};
    return Object.fromEntries(
      data.criteria_meta.map((c, i) => [c.key, palette[i % palette.length]])
    );
  }, [data]);

  if (loading) return (
    <div className={detailStyles.panel}>
      <div className={detailStyles.panelHeader}>
        <button className={detailStyles.backBtn} onClick={onClose}>
          <BackIcon /> Назад
        </button>
      </div>
      <div className={detailStyles.stateBox}>
        <div className={detailStyles.spinner} />
        <span>Завантаження…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className={detailStyles.panel}>
      <div className={detailStyles.panelHeader}>
        <button className={detailStyles.backBtn} onClick={onClose}>
          <BackIcon /> Назад
        </button>
      </div>
      <div className={detailStyles.stateBox}>
        <span className={detailStyles.errorText}>{error}</span>
      </div>
    </div>
  );

  const { participant_name, rounds = [], grand_total, criteria_avg = {}, criteria_meta = [] } = data;
  const visibleRounds = activeRound ? rounds.filter(r => r.round_id === activeRound) : rounds;

  return (
    <div className={detailStyles.panel}>
      <div className={detailStyles.panelHeader}>
        <button className={detailStyles.backBtn} onClick={onClose}>
          <BackIcon /> Назад до таблиці
        </button>
        <div className={detailStyles.headerRight}>
          {isPrivileged && rounds.some(r => r.jury_breakdown?.length > 0) && (
            <button
              className={`${detailStyles.juryToggle} ${showJuryBreak ? detailStyles.juryToggleOn : ""}`}
              onClick={() => setShowJuryBreak(v => !v)}
            >
              <EyeIcon />
              {showJuryBreak ? "Сховати оцінки журі" : "Показати оцінки журі"}
            </button>
          )}
        </div>
      </div>

      <div className={detailStyles.hero}>
        <div className={detailStyles.heroAvatar} style={{ background: getAvatarColor(participant_name) }}>
          {getInitials(participant_name)}
        </div>
        <div className={detailStyles.heroInfo}>
          <h2 className={detailStyles.heroName}>{participant_name}</h2>
          <span className={detailStyles.heroTotal}>Загальний бал: <strong>{grand_total}</strong></span>
        </div>
      </div>

      {rounds.length > 1 && (
        <div className={detailStyles.roundPills}>
          <button
            className={`${detailStyles.roundPill} ${activeRound === null ? detailStyles.roundPillActive : ""}`}
            onClick={() => setActiveRound(null)}
          >Всі раунди</button>
          {rounds.map(r => (
            <button
              key={r.round_id}
              className={`${detailStyles.roundPill} ${activeRound === r.round_id ? detailStyles.roundPillActive : ""}`}
              onClick={() => setActiveRound(r.round_id)}
            >{r.round_title}</button>
          ))}
        </div>
      )}

      {activeRound === null && criteria_meta.length > 0 && (
        <div className={detailStyles.section}>
          <h3 className={detailStyles.sectionTitle}>Середнє по критеріях (всі раунди)</h3>
          <div className={detailStyles.criteriaGrid}>
            {criteria_meta.map(c => {
              const val = criteria_avg[c.key] ?? 0;
              return (
                <div key={c.key} className={detailStyles.criteriaRow}>
                  <div className={detailStyles.criteriaLabelRow}>
                    <span className={detailStyles.criteriaLabel}>{c.label}</span>
                    <span className={detailStyles.criteriaValue} style={{ color: criteriaColors[c.key] }}>
                      {val} <span className={detailStyles.criteriaMax}>/ {c.max}</span>
                    </span>
                  </div>
                  <ScoreBar value={val} max={c.max} color={criteriaColors[c.key]} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visibleRounds.map(round => (
        <RoundSection
          key={round.round_id}
          round={round}
          criteria_meta={criteria_meta}
          criteriaColors={criteriaColors}
          isPrivileged={isPrivileged}
          showJuryBreak={showJuryBreak}
        />
      ))}
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function JuryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LeaderboardTab({ tournamentId, tournamentType, rounds = [], roundsLoading, isOwner, myRole }) {
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [published,     setPublished]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [sortBy,        setSortBy]        = useState("total");
  const [publishing,    setPublishing]    = useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);

  const canAlwaysSee = isOwner || myRole === "admin";
  const isTeam = tournamentType === "team";
  const getRowName = (p) => isTeam ? (p.team_name ?? p.participant_name) : p.participant_name;

  // selected: { type: "team"|"participant", id } | null
  const [selected, setSelected] = useState(null);

  const fetchLeaderboard = useCallback((silent = false) => {
    if (silent) setRefreshing(true);
    else { setLoading(true); setError(null); }

    API.get(`/tournaments/${tournamentId}/leaderboard/`)
      .then(r => {
        const data = r.data;
        setPublished(data.is_published ?? true);
        setLeaderboard(data.participants ?? data ?? []);
        setLastUpdated(new Date());
      })
      .catch(err => {
        const st = err?.response?.status;
        if (st === 403) {
          setPublished(false);
        } else if (st === 404) {
          if (canAlwaysSee) {
            API.get(`/tournaments/${tournamentId}/jury/submissions/`)
              .then(r => {
                setPublished(true);
                setLeaderboard(aggregateFromSubmissions(r.data.submissions ?? []));
                setLastUpdated(new Date());
              })
              .catch(() => { if (!silent) setError("Не вдалося завантажити дані."); });
          } else {
            setPublished(false);
          }
        } else {
          if (!silent) setError("Не вдалося завантажити таблицю лідерів.");
        }
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [tournamentId, canAlwaysSee]);

  useEffect(() => {
    if (!tournamentId) return;
    fetchLeaderboard();
    const timer = setInterval(() => fetchLeaderboard(true), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [tournamentId, fetchLeaderboard]);

  const handleTogglePublish = async () => {
    if (published === null) return;
    setPublishing(true);
    try {
      const res = await API.patch(`/tournaments/${tournamentId}/leaderboard/`, { is_published: !published });
      setPublished(res.data.is_published ?? !published);
    } catch (err) {
      console.error("Помилка публікації:", err);
    } finally {
      setPublishing(false);
    }
  };

  // Обчислення roundIds / roundMap (тільки раунди що є в leaderboard)
  const { roundIds, roundMap } = useMemo(() => {
    const ids = new Set();
    leaderboard.forEach(p => Object.keys(p.round_scores ?? {}).forEach(id => ids.add(id)));
    const sorted = [...ids].sort((a, b) => Number(a) - Number(b));
    const map = {};
    sorted.forEach(id => {
      const r = rounds.find(r => String(r.id) === id);
      map[id] = r?.title ?? `Раунд ${id}`;
    });
    return { roundIds: sorted, roundMap: map };
  }, [leaderboard, rounds]);

  const ranked = useMemo(() => {
    return [...leaderboard]
      .sort((a, b) => sortBy === "total"
        ? b.total - a.total
        : (b.round_scores?.[sortBy] ?? 0) - (a.round_scores?.[sortBy] ?? 0)
      )
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [leaderboard, sortBy]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportToExcel({ ranked, roundIds, roundMap, tournamentId, isTeam });
    } catch (err) {
      console.error("Помилка експорту:", err);
    } finally {
      setExporting(false);
    }
  };

  // ── Якщо обрано рядок — показуємо деталізацію ────────────────────────────

  if (selected !== null) {
    if (selected.type === "team") {
      return (
        <TeamDetail
          tournamentId={tournamentId}
          teamId={selected.id}
          isPrivileged={canAlwaysSee}
          onClose={() => setSelected(null)}
        />
      );
    }
    return (
      <ParticipantDetail
        tournamentId={tournamentId}
        participantId={selected.id}
        isPrivileged={canAlwaysSee}
        onClose={() => setSelected(null)}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Publish bar */}
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
          {/* Controls */}
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
              {exporting ? (
                <><span className={styles.exportSpinner} /> Експорт…</>
              ) : (
                <>
                  <svg className={styles.exportIcon} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 14.5V16a1 1 0 001 1h12a1 1 0 001-1v-1.5M10 3v9m0 0l-3-3m3 3l3-3"
                      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Excel
                </>
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
                  <th className={styles.thAction} />
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, idx) => {
                  const rowKey = isTeam
                    ? (p.team_id ?? p.participant_id ?? p.team_name ?? idx)
                    : (p.participant_id ?? p.participant_name ?? idx);
                  const detailId = isTeam
                    ? (p.team_id ?? p.participant_id ?? p.team_name)
                    : (p.participant_id ?? p.participant_name);
                  return (
                  <tr
                    key={String(rowKey)}
                    className={[
                      styles.row,
                      styles.rowClickable,
                      idx === 0 ? styles.rowGold   : "",
                      idx === 1 ? styles.rowSilver : "",
                      idx === 2 ? styles.rowBronze : "",
                    ].join(" ")}
                    onClick={() => setSelected({ type: isTeam ? "team" : "participant", id: detailId })}
                    title="Переглянути деталізацію"
                  >
                    <td className={styles.tdRank}>
                      {MEDAL[p.rank] ?? <span className={styles.rankNum}>{p.rank}</span>}
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
                    <td className={styles.tdAction}>
                      <span className={styles.detailArrow}>›</span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Realtime bar */}
          <div className={styles.realtimeBar}>
            <span className={styles.realtimeDot} />
            <span className={styles.realtimeText}>
              {refreshing
                ? "Оновлення…"
                : lastUpdated
                ? `Оновлено о ${lastUpdated.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : ""}
            </span>
            <button
              className={styles.refreshBtn}
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing}
              title="Оновити таблицю"
            >
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
                className={`${styles.refreshIcon} ${refreshing ? styles.refreshIconSpin : ""}`}>
                <path d="M4 4.5A7 7 0 1 1 3 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M1 5l3 .5L4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <p className={styles.footnote}>
            * Бали підраховані на основі середнього між оцінками журі за всіма завданнями раунду.
            Натисніть на рядок для деталізації.
          </p>
        </>
      )}
    </div>
  );
}