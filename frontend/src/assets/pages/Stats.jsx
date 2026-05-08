import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../../api";
import NavBar from "../components/NavBar";
import s from "../components/styles/Stats.module.css";

/* ── Критерії ── */
const CRITERIA = [
  { key: "participants", label: "Учасники"  },
  { key: "rounds",       label: "Раунди"    },
  { key: "scores",       label: "Результати"},
  { key: "activity",     label: "Активність"},
  { key: "status",       label: "Статус"    },
];

/* ── Donut chart ── */
const COLORS = ["#111111", "#444444", "#777777", "#aaaaaa", "#cccccc"];

const Donut = ({ segments, size = 112 }) => {
  const r = 40, cx = 56, cy = 56, circ = 2 * Math.PI * r;
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 112 112">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={15}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 56 56)"
          />
        );
        offset += dash;
        return el;
      })}
      <circle cx={cx} cy={cy} r={28} fill="#fff" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#111111"
            fontSize="14" fontFamily="Google Sans Display, sans-serif" fontWeight="700">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#888888"
            fontSize="9" fontFamily="Google Sans, sans-serif">
        всього
      </text>
    </svg>
  );
};

/* ── Bar chart ── */
const BarChart = ({ rows, color }) => {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className={s.chartWrap}>
      {rows.map((row, i) => (
        <div key={i} className={s.barRow}>
          <span className={s.barLabel} title={row.label}>{row.label}</span>
          <div className={s.barTrack}>
            <div
              className={s.barFill}
              style={{ width: `${(row.value / max) * 100}%`, "--bar-color": color }}
            />
          </div>
          <span className={s.barVal}>{row.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── KPI card ── */
const KpiCard = ({ label, value, sub, accent, delay }) => (
  <div
    className={`${s.kpiCard} ${s[delay] ?? ""}`}
    style={{ "--kpi-accent": accent }}
  >
    <div className={s.kpiAccentBar} />
    <p className={s.kpiLabel}>{label}</p>
    <p className={s.kpiValue}>{value ?? "—"}</p>
    {sub && <p className={s.kpiSub}>{sub}</p>}
  </div>
);

/* ── Leaderboard ── */
const Leaderboard = ({ entries }) => (
  <div className={s.leaderList}>
    {entries.map((e, i) => (
      <div key={i} className={s.leaderRow}>
        <span className={`${s.leaderRank} ${i === 0 ? s.rank1 : i === 1 ? s.rank2 : i === 2 ? s.rank3 : ""}`}>
          {i + 1}
        </span>
        <span className={s.leaderName}>{e.name}</span>
        <span className={s.leaderMeta}>{e.value}</span>
      </div>
    ))}
  </div>
);

/* ── Timeline ── */
const DOT = { round_start: "#111111", match: "#444444", join: "#16a34a", other: "#888888" };

const Timeline = ({ events }) => (
  <div className={s.timeline}>
    {events.map((ev, i) => (
      <div key={i} className={s.timelineItem}>
        <div className={s.timelineDot} style={{ "--dot-color": DOT[ev.type] ?? DOT.other }} />
        <div>
          <span className={s.timelineText}>{ev.description}</span>
          <span className={s.timelineDate}>{ev.date}</span>
        </div>
      </div>
    ))}
  </div>
);

/* ── Loading / Empty ── */
const Loading = () => <div className={s.emptyState}><div className={s.spinner} /></div>;
const Empty   = ({ text = "Даних немає" }) => (
  <div className={s.emptyState}>
    <span style={{ fontSize: 36, opacity: 0.15 }}>📭</span>
    <span style={{ fontSize: 14 }}>{text}</span>
  </div>
);

/* ── Normalize API response ── */
const normalize = (criterion, raw) => {
  if (!raw) return null;
  switch (criterion) {
    case "participants": {
      const kpi = [
        { label: "Всього учасників", value: raw.total,      accent: "#111111", delay: "d1" },
        { label: "Активних",         value: raw.active,     accent: "#16a34a", delay: "d2" },
        { label: "Вибули",           value: raw.eliminated, accent: "#888888", delay: "d3" },
      ];
      const chart   = (raw.by_round ?? []).map(r => ({ label: `Р. ${r.round}`, value: r.count }));
      const leaders = (raw.top ?? []).map(p => ({ name: p.name, value: `${p.wins} перем.` }));
      return { kpi, chart, chartColor: "#111111", chartTitle: "Учасники по раундах", leaders };
    }
    case "rounds": {
      const kpi = [
        { label: "Всього раундів", value: raw.total_rounds, accent: "#111111", delay: "d1" },
        { label: "Завершено",      value: raw.completed,    accent: "#16a34a", delay: "d2" },
        { label: "Поточних",       value: raw.ongoing,      accent: "#d97706", delay: "d3" },
        { label: "Матчів/раунд",   value: raw.avg_matches,  accent: "#444444", delay: "d4" },
      ];
      const chart = (raw.by_round ?? []).map(r => ({ label: `Р. ${r.round}`, value: r.matches }));
      return { kpi, chart, chartColor: "#444444", chartTitle: "Матчів по раундах", leaders: [] };
    }
    case "scores": {
      const kpi = [
        { label: "Середній бал", value: raw.avg_score, accent: "#111111", delay: "d1" },
        { label: "Максимум",     value: raw.max_score, accent: "#16a34a", delay: "d2" },
        { label: "Мінімум",      value: raw.min_score, accent: "#888888", delay: "d3" },
      ];
      const chart   = (raw.by_round ?? []).map(r => ({ label: `Р. ${r.round}`, value: r.avg }));
      const leaders = (raw.top ?? []).map(p => ({ name: p.name, value: `${p.score} б.` }));
      return { kpi, chart, chartColor: "#111111", chartTitle: "Середній бал по раундах", leaders };
    }
    case "activity": {
      return {
        kpi: [{ label: "Подій", value: (raw.events ?? []).length, accent: "#111111", delay: "d1" }],
        chart: [], chartColor: "", chartTitle: "", leaders: [],
        events: raw.events ?? [],
      };
    }
    case "status": {
      return {
        kpi: [
          { label: "Переможець",    value: raw.winner ?? "—", accent: "#111111", delay: "d1" },
          { label: "Призовий фонд", value: raw.prize  ?? "—", accent: "#16a34a", delay: "d2" },
        ],
        chart: [], chartColor: "", chartTitle: "", leaders: [],
        segments: raw.segments ?? [],
      };
    }
    default: return null;
  }
};

/* ══════════════════════════════════════════════════════════
   Головний компонент
══════════════════════════════════════════════════════════ */
const Stats = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId,  setSelectedId]  = useState("");
  const [criterion,   setCriterion]   = useState("participants");
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const abortRef = useRef(null);

  /* Список турнірів */
  useEffect(() => {
    API.get("/tournaments/")
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setTournaments(list);
      })
      .catch(() => {});
  }, []);

  /* Статистика */
  const fetchStats = useCallback(async (id, crit) => {
    if (!id) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await API.get(`/tournaments/${id}/stats/${crit}/`, { signal: ctrl.signal });
      setData(normalize(crit, res.data));
    } catch (err) {
      if (err.name !== "CanceledError" && err.name !== "AbortError")
        setError("Не вдалося завантажити статистику");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(selectedId, criterion); }, [selectedId, criterion, fetchStats]);

  return (
    <NavBar>
      <div className={s.page}>

        {/* ── Header ── */}
        <div className={s.header}>
          <div>
            <p className={s.eyebrow}>Аналітика</p>
            <h1 className={s.title}>Статистика</h1>
          </div>

          <div className={s.selectorWrap}>
            <label className={s.selectorLabel} htmlFor="t-sel">Турнір</label>
            <div className={s.selectOuter}>
              <select
                id="t-sel"
                className={s.select}
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">— Оберіть турнір —</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <svg className={s.selectArrow} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Criteria pills ── */}
        {selectedId && (
          <div className={s.criteriaBar}>
            {CRITERIA.map(c => (
              <button
                key={c.key}
                className={`${s.pill} ${criterion === c.key ? s.pillActive : ""}`}
                onClick={() => setCriterion(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* ── No selection ── */}
        {!selectedId && (
          <div className={s.selectPrompt}>
            <div className={s.promptIllustration}>🏆</div>
            <p className={s.promptText}>Оберіть турнір</p>
            <p className={s.promptSub}>
              Щоб переглянути статистику, оберіть турнір зі списку вище
            </p>
          </div>
        )}

        {/* ── Content ── */}
        {selectedId && (
          <>
            {loading && <Loading />}
            {error && !loading && <Empty text={error} />}

            {data && !loading && !error && (
              <>
                {/* KPI */}
                <div className={s.kpiRow}>
                  {data.kpi.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
                </div>

                {/* Chart + Leaderboard */}
                {(data.chart.length > 0 || data.leaders?.length > 0) && (
                  <div className={s.mainGrid}>
                    {data.chart.length > 0 && (
                      <div className={s.panel}>
                        <p className={s.panelTitle}>{data.chartTitle}</p>
                        <BarChart rows={data.chart} color={data.chartColor} />
                      </div>
                    )}
                    {data.leaders?.length > 0 && (
                      <div className={s.panel}>
                        <p className={s.panelTitle}>Топ учасників</p>
                        <Leaderboard entries={data.leaders} />
                      </div>
                    )}
                  </div>
                )}

                {/* Activity timeline */}
                {criterion === "activity" && data.events?.length > 0 && (
                  <div className={s.panel}>
                    <p className={s.panelTitle}>Хронологія подій</p>
                    <Timeline events={data.events} />
                  </div>
                )}

                {/* Status donut */}
                {criterion === "status" && data.segments?.length > 0 && (
                  <div className={s.bottomGrid}>
                    <div className={s.panel}>
                      <p className={s.panelTitle}>Розподіл статусів</p>
                      <div className={s.donutWrap}>
                        <Donut segments={data.segments} />
                        <div className={s.donutLegend}>
                          {data.segments.map((seg, i) => (
                            <div key={i} className={s.legendItem}>
                              <div className={s.legendDot}
                                   style={{ background: COLORS[i % COLORS.length] }} />
                              <span className={s.legendLabel}>{seg.label}</span>
                              <span className={s.legendVal}>{seg.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback */}
                {!data.chart.length && !data.leaders?.length
                  && !data.events?.length && !data.segments?.length && (
                  <Empty text="Дані для цього критерію відсутні" />
                )}
              </>
            )}
          </>
        )}
      </div>
    </NavBar>
  );
};

export default Stats;
