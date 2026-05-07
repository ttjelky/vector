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

const MEDAL = { 1: "1", 2: "2", 3: "3" };

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

export default function LeaderboardTab({ tournamentId, rounds = [], roundsLoading, isOwner, myRole }) {
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [published,    setPublished]    = useState(null); // null = не завантажено
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [sortBy,       setSortBy]       = useState("total");
  const [publishing,   setPublishing]   = useState(false);

  const canAlwaysSee = isOwner || myRole === "admin";

  const fetchLeaderboard = () => {
    setLoading(true);
    setError(null);

    // Єдиний ендпоінт для всіх ролей — бекенд сам контролює доступ
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
          // Таблиця ще не опублікована — бекенд повернув 403
          setPublished(false);
          setLoading(false);
        } else if (status === 404) {
          // Немає окремого ендпоінту — fallback тільки для owner/admin через jury/submissions
          if (canAlwaysSee) {
            API.get(`/tournaments/${tournamentId}/jury/submissions/`)
              .then(r => {
                setPublished(true);
                setLeaderboard(aggregateFromSubmissions(r.data.submissions ?? []));
              })
              .catch(() => setError("Не вдалося завантажити дані."))
              .finally(() => setLoading(false));
          } else {
            // Учасник/журі — не маємо даних, вважаємо не опубліковано
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

  // Таблиця не опублікована
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
          {/* Sort pills */}
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
                      {MEDAL[p.rank] ?? <span className={styles.rankNum}>{p.rank}</span>}
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
