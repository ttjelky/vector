import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./styles/JuryTab.module.css";
import API from "../../api";

const STATUS_ALL     = "all";
const STATUS_GRADED  = "graded";
const STATUS_PENDING = "pending";

const SORT_OPTIONS = [
  { value: "submitted_desc", label: "Дата подання (від нових)" },
  { value: "submitted_asc",  label: "Дата подання (від старих)" },
  { value: "score_desc",     label: "Бал (від високого)" },
  { value: "score_asc",      label: "Бал (від низького)" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function calcTotal(scores) {
  if (!scores || typeof scores !== "object") return null;
  const vals = Object.values(scores).map(Number).filter(v => !isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0);
}

function fileIcon(name = "") {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc","docx"].includes(ext)) return "📝";
  if (["zip","rar","7z"].includes(ext)) return "🗜️";
  return "📎";
}

function isImageFile(nameOrUrl = "") {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(nameOrUrl);
}

// ─── JuryTab ──────────────────────────────────────────────────────────────────

export default function JuryTab({ tournamentId, rounds = [], loading }) {
  const [submissions,   setSubmissions]   = useState([]);
  const [criteria,      setCriteria]      = useState([]);
  const [subsLoading,   setSubsLoading]   = useState(true);
  const [selectedRound, setSelectedRound] = useState("all");
  const [statusFilter,  setStatusFilter]  = useState(STATUS_ALL);
  const [sortBy,        setSortBy]        = useState("submitted_desc");
  const [search,        setSearch]        = useState("");
  const [selectedSub,   setSelectedSub]   = useState(null);
  const [gradeForm,     setGradeForm]     = useState(null);
  const [savingGrade,   setSavingGrade]   = useState(false);
  const [gradeError,    setGradeError]    = useState("");
  const [gradeSuccess,  setGradeSuccess]  = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    setSubsLoading(true);
    API.get(`/tournaments/${tournamentId}/jury/submissions/`)
      .then(r => {
        setSubmissions(r.data.submissions ?? []);
        setCriteria(r.data.criteria ?? []);
      })
      .catch(err => console.error("Помилка завантаження подань:", err))
      .finally(() => setSubsLoading(false));
  }, [tournamentId]);

  const filtered = useMemo(() => {
    let list = [...submissions];
    if (selectedRound !== "all")
      list = list.filter(s => String(s.round_id) === String(selectedRound));
    if (statusFilter === STATUS_GRADED)
      list = list.filter(s => s.my_grade != null);
    else if (statusFilter === STATUS_PENDING)
      list = list.filter(s => s.my_grade == null);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        (s.task_title  || "").toLowerCase().includes(q) ||
        (s.round_title || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const ta = a.my_grade ? (a.my_grade.total ?? calcTotal(a.my_grade.scores) ?? -1) : -1;
      const tb = b.my_grade ? (b.my_grade.total ?? calcTotal(b.my_grade.scores) ?? -1) : -1;
      switch (sortBy) {
        case "submitted_asc":  return new Date(a.submitted_at) - new Date(b.submitted_at);
        case "submitted_desc": return new Date(b.submitted_at) - new Date(a.submitted_at);
        case "score_asc":      return ta - tb;
        case "score_desc":     return tb - ta;
        default: return 0;
      }
    });
    return list;
  }, [submissions, selectedRound, statusFilter, search, sortBy]);

  const openSubmission = useCallback((sub) => {
    setSelectedSub(sub);
    setGradeError("");
    setGradeSuccess(false);
    const existing = sub.my_grade?.scores ?? {};
    const scores = {};
    criteria.forEach(c => { scores[c.key] = existing[c.key] ?? ""; });
    setGradeForm({ scores, comment: sub.my_grade?.comment ?? "" });
  }, [criteria]);

  const closeSubmission = () => {
    setSelectedSub(null);
    setGradeForm(null);
    setGradeError("");
    setGradeSuccess(false);
  };

  const handleGradeSave = async () => {
    if (!selectedSub || !gradeForm) return;
    for (const c of criteria) {
      const v = Number(gradeForm.scores[c.key]);
      if (gradeForm.scores[c.key] === "" || isNaN(v) || v < 0 || v > c.max) {
        setGradeError(`Введіть коректний бал для «${c.label}» (0–${c.max}).`);
        return;
      }
    }
    setSavingGrade(true);
    setGradeError("");
    try {
      const payload = {
        scores:  Object.fromEntries(criteria.map(c => [c.key, Number(gradeForm.scores[c.key])])),
        comment: gradeForm.comment.trim(),
      };
      const res = await API.post(
        `/tournaments/${tournamentId}/jury/submissions/${selectedSub.id}/grade/`,
        payload
      );
      const updatedGrade = res.data;
      setSubmissions(prev => prev.map(s =>
        s.id === selectedSub.id ? { ...s, my_grade: updatedGrade } : s
      ));
      setSelectedSub(prev => ({ ...prev, my_grade: updatedGrade }));
      setGradeSuccess(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setGradeError(detail || "Не вдалося зберегти оцінку. Спробуйте ще раз.");
    } finally {
      setSavingGrade(false);
    }
  };

  if (selectedSub) {
    return (
      <SubmissionDetail
        submission={selectedSub}
        criteria={criteria}
        gradeForm={gradeForm}
        setGradeForm={setGradeForm}
        onSave={handleGradeSave}
        onClose={closeSubmission}
        saving={savingGrade}
        error={gradeError}
        success={gradeSuccess}
      />
    );
  }

  const pendingCount = submissions.filter(s => s.my_grade == null).length;
  const gradedCount  = submissions.filter(s => s.my_grade != null).length;
  const maxTotal     = criteria.reduce((a, c) => a + c.max, 0);

  return (
    <div className={styles.tabContent}>
      <div className={styles.statsRow}>
        <StatCard label="Всього робіт" value={submissions.length} />
        <StatCard label="Не оцінено"   value={pendingCount} accent="warning" />
        <StatCard label="Оцінено"      value={gradedCount}  accent="success" />
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Пошук за назвою завдання або раунду..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className={styles.filterSelect} value={selectedRound} onChange={e => setSelectedRound(e.target.value)}>
          <option value="all">Всі раунди</option>
          {rounds.map(r => <option key={r.id} value={String(r.id)}>{r.title}</option>)}
        </select>

        <div className={styles.statusTabs}>
          {[
            { value: STATUS_ALL,     label: "Усі" },
            { value: STATUS_PENDING, label: "Не оцінено" },
            { value: STATUS_GRADED,  label: "Оцінено" },
          ].map(opt => (
            <button
              key={opt.value}
              className={`${styles.statusTab} ${statusFilter === opt.value ? styles.statusTabActive : ""}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {subsLoading || loading ? (
        <div className={styles.emptyBlock}>
          <span className={styles.emptyIcon}>⏳</span>
          <p>Завантаження робіт...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyBlock}>
          <span className={styles.emptyIcon}>📋</span>
          <p>{submissions.length === 0
            ? "Подань ще немає. Учасники ще не здали роботи."
            : "За вашим фільтром нічого не знайдено."
          }</p>
        </div>
      ) : (
        <div className={styles.submissionList}>
          {filtered.map((sub, idx) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              index={idx + 1}
              maxTotal={maxTotal}
              onClick={() => openSubmission(sub)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles[`statCard_${accent}`] : ""}`}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

// ─── SubmissionCard ───────────────────────────────────────────────────────────

function SubmissionCard({ submission: sub, index, maxTotal, onClick }) {
  const isGraded = sub.my_grade != null;
  const total    = isGraded ? (sub.my_grade.total ?? calcTotal(sub.my_grade.scores)) : null;
  return (
    <button className={styles.subCard} onClick={onClick}>
      <div className={styles.subCardLeft}>
        <span className={styles.subIndex}>{index}</span>
        <div className={styles.subInfo}>
          <span className={styles.subTask}>{sub.task_title || "Без назви"}</span>
          <span className={styles.subRound}>{sub.round_title || "—"}</span>
          <span className={styles.subDate}>Подано: {formatDate(sub.submitted_at)}</span>
        </div>
      </div>
      <div className={styles.subCardRight}>
        {isGraded ? (
          <>
            {total !== null && (
              <span className={styles.scoreBadge}>{total} / {maxTotal}</span>
            )}
            <span className={`${styles.statusPill} ${styles.statusGraded}`}>Оцінено ✓</span>
          </>
        ) : (
          <span className={`${styles.statusPill} ${styles.statusPending}`}>Не оцінено</span>
        )}
        <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    </button>
  );
}

// ─── SubmissionDetail ─────────────────────────────────────────────────────────

function SubmissionDetail({ submission: sub, criteria, gradeForm, setGradeForm, onSave, onClose, saving, error, success }) {
  const isGraded = sub.my_grade != null;
  const maxTotal = criteria.reduce((a, c) => a + c.max, 0);
  const total    = gradeForm
    ? criteria.reduce((a, c) => a + (Number(gradeForm.scores[c.key]) || 0), 0)
    : null;

  const links = sub.content_links ?? [];
  const files = sub.content_files ?? [];
  const imageFiles = files.filter(f => isImageFile(f.name || f.file || ""));
  const otherFiles = files.filter(f => !isImageFile(f.name || f.file || ""));
  const hasContent = sub.content_text || links.length > 0 || files.length > 0;

  return (
    <div className={styles.detailWrap}>
      <button className={styles.backBtn} onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Назад до списку
      </button>

      <div className={styles.detailGrid}>
        {/* ── Ліва колонка ── */}
        <div className={styles.detailContent}>
          <div className={styles.detailHeader}>
            <h2 className={styles.detailTitle}>{sub.task_title || "Без назви"}</h2>
            <span className={styles.detailRound}>{sub.round_title}</span>
          </div>

          <div className={styles.anonBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Особисті дані учасника приховані для об'єктивного оцінювання
          </div>

          <div className={styles.contentBox}>
            {sub.content_text && (
              <div className={styles.contentSection}>
                <h3 className={styles.contentSectionTitle}>Текст роботи</h3>
                <div className={styles.contentText}>{sub.content_text}</div>
              </div>
            )}

            {links.length > 0 && (
              <div className={styles.contentSection}>
                <h3 className={styles.contentSectionTitle}>Посилання</h3>
                <div className={styles.linkList}>
                  {links.map(link => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.contentLink}>
                      🔗 {link.label || link.url}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {imageFiles.length > 0 && (
              <div className={styles.contentSection}>
                <h3 className={styles.contentSectionTitle}>Зображення</h3>
                <div className={styles.imageGrid}>
                  {imageFiles.map(att => (
                    <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer">
                      <img src={att.file} alt={att.name} className={styles.contentImage} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {otherFiles.length > 0 && (
              <div className={styles.contentSection}>
                <h3 className={styles.contentSectionTitle}>Прикріплені файли</h3>
                <div className={styles.fileList}>
                  {otherFiles.map(att => (
                    <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" className={styles.fileItem}>
                      <span>{fileIcon(att.name)}</span>
                      <span>{att.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {!hasContent && (
              <p className={styles.noContent}>Учасник не додав жодного контенту до цієї здачі.</p>
            )}
          </div>

          <div className={styles.submittedAt}>Подано: {formatDate(sub.submitted_at)}</div>
        </div>

        {/* ── Права колонка: оцінювання ── */}
        <div className={styles.gradePanel}>
          <div className={styles.gradePanelHeader}>
            <h3 className={styles.gradePanelTitle}>
              {isGraded ? "Змінити оцінку" : "Оцінити роботу"}
            </h3>
            {isGraded && (
              <span className={`${styles.statusPill} ${styles.statusGraded}`}>Оцінено ✓</span>
            )}
          </div>

          {gradeForm && criteria.length > 0 ? (
            <>
              <div className={styles.criteriaList}>
                {criteria.map(c => {
                  const pct = Math.min(100, ((Number(gradeForm.scores[c.key]) || 0) / c.max) * 100);
                  return (
                    <div key={c.key} className={styles.criteriaItem}>
                      <div className={styles.criteriaHeader}>
                        <span className={styles.criteriaLabel}>{c.label}</span>
                        <span className={styles.criteriaMax}>макс. {c.max}</span>
                      </div>
                      <div className={styles.scoreInputWrap}>
                        <input
                          type="number"
                          min={0}
                          max={c.max}
                          step={1}
                          className={styles.scoreInput}
                          value={gradeForm.scores[c.key]}
                          onChange={e => setGradeForm(f => ({ ...f, scores: { ...f.scores, [c.key]: e.target.value } }))}
                          placeholder="0"
                        />
                        <span className={styles.scoreSlash}>/ {c.max}</span>
                      </div>
                      <div className={styles.scoreBar}>
                        <div className={styles.scoreBarFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.totalScore}>
                <span className={styles.totalLabel}>Загальний бал</span>
                <span className={styles.totalValue}>{total} / {maxTotal}</span>
              </div>

              <label className={styles.commentLabel}>
                Коментар / Фідбек
                <textarea
                  className={styles.commentArea}
                  rows={4}
                  value={gradeForm.comment}
                  onChange={e => setGradeForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Напишіть детальний фідбек для учасника..."
                />
              </label>

              {error   && <p className={styles.gradeError}>{error}</p>}
              {success && <p className={styles.gradeSuccess}>✓ Оцінку збережено успішно!</p>}

              <button className={styles.gradeBtn} onClick={onSave} disabled={saving}>
                {saving ? "Збереження…" : isGraded ? "Оновити оцінку" : "Зберегти оцінку"}
              </button>

              {isGraded && sub.my_grade?.updated_at && (
                <p className={styles.gradeDate}>Оцінено: {formatDate(sub.my_grade.updated_at)}</p>
              )}
            </>
          ) : (
            <p className={styles.noContent}>Критерії оцінювання не налаштовані.</p>
          )}
        </div>
      </div>
    </div>
  );
}
