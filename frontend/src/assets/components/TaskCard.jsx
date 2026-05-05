import { useState, useEffect } from "react";
import styles from "./styles/RoundsTab.module.css";
import API from "../../api";
import { fileIcon } from "./tournamentHelpers";
import { ConfirmDeleteModal } from "./TournamentShared";
import { SubmissionForm } from "./SubmissionForm";

// ─── Chevron SVG ──────────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return (
    <svg
      className={`${styles.chevronSvg} ${open ? styles.chevronSvgOpen : ""}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 6 8 10 12 6" />
    </svg>
  );
}

// ─── GradeResultPanel ─────────────────────────────────────────────────────────
// Виправлено:
//  - прогрес-бари точно відображають відсоток (100% = повна ширина)
//  - коментар має інформацію про автора
//  - загальний бал пояснюється чітко

function GradeResultPanel({ submissionId, taskId, roundId, tournamentId }) {
  const [grade,   setGrade]   = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!submissionId) { setLoading(false); return; }
    API.get(
      `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/${submissionId}/grade/`
    )
      .then((r) => setGrade(r.data))
      .catch(() => setGrade(null))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return <p className={styles.empty}>Завантаження оцінки…</p>;

  if (!grade) {
    return (
      <div className={styles.gradeResultBlock} style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb" }}>
        <p style={{ margin: 0, fontSize: 13.5, color: "#9ca3af", textAlign: "center", padding: "8px 0" }}>
          Вашу роботу ще не оцінено журі
        </p>
      </div>
    );
  }

  const scores   = grade.scores ?? {};
  const keys     = Object.keys(scores);
  const maxTotal = grade.max_total ?? keys.length * 10;
  const total    = grade.total ?? Object.values(scores).reduce((a, b) => a + Number(b), 0);

  const criteriaLabels = grade.criteria ?? {
    originality:  "Оригінальність",
    execution:    "Виконання",
    presentation: "Презентація",
  };

  return (
    <div className={styles.gradeResultBlock}>
      <div className={styles.gradeResultHeader}>
        <span className={styles.gradeResultTitle}>Оцінка журі</span>
        <div className={styles.gradeResultTotalWrap}>
          <span className={styles.gradeResultTotal}>{total}</span>
          <span className={styles.gradeResultTotalMax}>/ {maxTotal}</span>
        </div>
      </div>

      {keys.length > 0 && (
        <div className={styles.gradeResultScores}>
          {keys.map((key) => {
            const val   = Number(scores[key]) || 0;
            const max   = grade.criteria_max?.[key] ?? 10;
            // Точне відсоткове обчислення (100% = повна ширина)
            const pct   = max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0;
            const label = criteriaLabels[key] ?? key;
            const isMax = val === max;
            return (
              <div key={key} className={styles.gradeResultScoreRow}>
                <span className={styles.gradeResultScoreLabel}>{label}</span>
                <div className={styles.gradeResultScoreBarTrack} title={`${pct}%`}>
                  <div
                    className={styles.gradeResultScoreBarFill}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`${styles.gradeResultScoreValue} ${isMax ? styles.gradeResultScoreValueMax : ""}`}>
                  {val} / {max}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {grade.comment && (
        <div className={styles.gradeResultComment}>
          {/* Показуємо ім'я судді якщо є */}
          {grade.judge_name && (
            <div className={styles.gradeResultCommentAuthor}>
              <span>👤</span>
              <span>{grade.judge_name}</span>
            </div>
          )}
          <span>{grade.comment}</span>
        </div>
      )}

      {grade.updated_at && (
        <span className={styles.gradeResultDate}>
          Оцінено: {new Date(grade.updated_at).toLocaleString("uk-UA")}
        </span>
      )}
    </div>
  );
}

// ─── MySubmissionPanel ────────────────────────────────────────────────────────
// Виправлено: вкладки «Моя здача» та «Оцінка» — чіткі різні назви,
// жодного дублювання

function MySubmissionPanel({ taskId, roundId, tournamentId }) {
  const [submission,  setSubmission]  = useState(undefined);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Перемикач між двома вкладками всередині панелі учасника
  const [activeView,  setActiveView]  = useState("submission"); // "submission" | "grade"

  const basePath = `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/`;

  useEffect(() => {
    setLoading(true);
    API.get(basePath)
      .then((r) => setSubmission(r.data.length > 0 ? r.data[0] : null))
      .catch(() => setSubmission(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleSaved = (sub) => { setSubmission(sub); setShowForm(false); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`${basePath}${submission.id}/`);
      setSubmission(null);
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className={styles.empty}>Завантаження здачі…</p>;

  if (showForm) {
    return (
      <SubmissionForm
        taskId={taskId}
        roundId={roundId}
        tournamentId={tournamentId}
        existingSubmission={submission || undefined}
        onSaved={handleSaved}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  /* Здачі ще немає — показуємо CTA */
  if (!submission) {
    return (
      <div className={styles.mySubmissionEmpty}>
        <p className={styles.empty}>Ви ще не здали роботу по цьому завданню.</p>
        <button className={styles.submitWorkBtn} onClick={() => setShowForm(true)}>
          Здати роботу
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/*
        Вкладки всередині панелі учасника.
        Назви: «Моя здача» і «Оцінка» — чіткі та різні.
      */}
      <div className={styles.taskInnerTabs}>
        <button
          className={`${styles.taskInnerTab} ${activeView === "submission" ? styles.taskInnerTabActive : ""}`}
          onClick={() => setActiveView("submission")}
        >
          Моя здача
        </button>
        <button
          className={`${styles.taskInnerTab} ${activeView === "grade" ? styles.taskInnerTabActive : ""}`}
          onClick={() => setActiveView("grade")}
        >
          Оцінка журі
        </button>
      </div>

      {activeView === "submission" && (
        <div className={styles.mySubmissionCard}>
          <div className={styles.mySubmissionHeader}>
            <span className={styles.mySubmissionLabel}>Здано</span>
            <span className={styles.mySubmissionDate}>
              {new Date(submission.submitted_at).toLocaleString("uk-UA")}
            </span>
            <div className={styles.mySubmissionActions}>
              <button className={styles.editSubmissionBtn} onClick={() => setShowForm(true)}>
                Редагувати
              </button>
              <button
                className={styles.deleteSubmissionBtn}
                onClick={() => setShowConfirm(true)}
                title="Видалити здачу"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 4 14 4"/>
                  <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
                  <path d="M6 7v5M10 7v5"/>
                  <rect x="3" y="4" width="10" height="9" rx="1"/>
                </svg>
              </button>
            </div>
          </div>

          {submission.text && (
            <p className={styles.submissionText}>{submission.text}</p>
          )}

          {submission.links?.length > 0 && (
            <div className={styles.submissionExtras}>
              <span className={styles.submissionExtrasLabel}>Посилання</span>
              <div className={styles.taskLinkList}>
                {submission.links.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.taskLink}>
                    🔗 {link.label || link.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {submission.attachments?.length > 0 && (
            <div className={styles.submissionExtras}>
              <span className={styles.submissionExtrasLabel}>Файли</span>
              <div className={styles.taskFileList}>
                {submission.attachments.map((att) => (
                  <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" className={styles.taskFile}>
                    {fileIcon(att.name)} {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === "grade" && (
        <GradeResultPanel
          submissionId={submission.id}
          taskId={taskId}
          roundId={roundId}
          tournamentId={tournamentId}
        />
      )}

      {showConfirm && (
        <ConfirmDeleteModal
          icon="📤"
          title="Видалити здачу?"
          description="Ваша здана робота буде видалена. Ви зможете здати знову."
          confirmLabel="Так, видалити"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}

// ─── AllSubmissionsPanel ──────────────────────────────────────────────────────

function AllSubmissionsPanel({ taskId, roundId, tournamentId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(null);

  useEffect(() => {
    setLoading(true);
    API.get(`/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/`)
      .then((r) => setSubmissions(r.data))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <p className={styles.empty}>Завантаження здач…</p>;
  if (submissions.length === 0) return <p className={styles.empty}>Жодних здач ще немає.</p>;

  return (
    <div className={styles.allSubmissionsList}>
      {submissions.map((sub) => (
        <div
          key={sub.id}
          className={`${styles.submissionCard} ${expanded === sub.id ? styles.submissionCardExpanded : ""}`}
        >
          <div
            className={styles.submissionCardHeader}
            onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
          >
            <div className={styles.submissionParticipantInfo}>
              <span className={styles.submissionParticipantName}>{sub.participant_username}</span>
              <span className={styles.submissionParticipantEmail}>{sub.participant_email}</span>
            </div>
            <div className={styles.submissionCardMeta}>
              <span className={styles.submissionDate}>
                {new Date(sub.submitted_at).toLocaleString("uk-UA")}
              </span>
              <div className={styles.submissionBadges}>
                {sub.text                && <span className={styles.subBadge}>Текст</span>}
                {sub.links?.length > 0   && <span className={styles.subBadge}>🔗 {sub.links.length}</span>}
                {sub.attachments?.length > 0 && <span className={styles.subBadge}>📎 {sub.attachments.length}</span>}
              </div>
              <ChevronIcon open={expanded === sub.id} />
            </div>
          </div>

          {expanded === sub.id && (
            <div className={styles.submissionCardBody}>
              {sub.text && <p className={styles.submissionText}>{sub.text}</p>}

              {sub.links?.length > 0 && (
                <div className={styles.submissionExtras}>
                  <span className={styles.submissionExtrasLabel}>Посилання</span>
                  <div className={styles.taskLinkList}>
                    {sub.links.map((link) => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.taskLink}>
                        🔗 {link.label || link.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {sub.attachments?.length > 0 && (
                <div className={styles.submissionExtras}>
                  <span className={styles.submissionExtrasLabel}>Файли</span>
                  <div className={styles.taskFileList}>
                    {sub.attachments.map((att) => (
                      <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" className={styles.taskFile}>
                        {fileIcon(att.name)} {att.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
// Виправлено: єдиний рядок вкладок з різними назвами, чіткий activeTab,
// без дублювання «Моя здача»

export function TaskCard({ task, tournamentId, roundId, onDeleted, readOnly = false, myRole, isOpen, onToggle }) {
  const [activeTab,   setActiveTab]   = useState("details");
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";
  const isJury         = myRole === "jury";
  const isParticipant  = readOnly && !isJury;

  const hasDetails = task.description || task.links?.length > 0 || task.attachments?.length > 0;

  /*
   * Будуємо масив вкладок залежно від ролі.
   * Назви чіткі й унікальні — жодного дублювання.
   */
  const innerTabs = [];
  if (hasDetails)    innerTabs.push({ id: "details",  label: "Деталі" });
  if (isParticipant) innerTabs.push({ id: "submit",   label: "Моя здача" });
  if (isOwnerOrAdmin || isJury) innerTabs.push({ id: "allSubs", label: "Здачі учасників" });

  const showTabs = innerTabs.length > 1;
  const validTab = innerTabs.find((t) => t.id === activeTab) ? activeTab : (innerTabs[0]?.id ?? "details");

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/`);
      onDeleted(task.id);
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div className={`${styles.taskCard} ${isOpen ? styles.taskCardExpanded : ""}`}>

        {/* ── Заголовок ── */}
        <div className={styles.taskCardHeader} onClick={onToggle} role="button" aria-expanded={isOpen}>
          <div className={styles.taskCardLeft}>
            <span className={styles.taskTitle}>{task.title}</span>
            {!isOpen && task.description && (
              <p className={styles.taskDesc}>
                {task.description.length > 90
                  ? task.description.slice(0, 90) + "…"
                  : task.description}
              </p>
            )}
          </div>
          <div className={styles.taskCardActions}>
            {!readOnly && (
              <button
                className={styles.taskDeleteBtn}
                onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                disabled={deleting}
                title="Видалити завдання"
              >
                {deleting ? "…" : (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 4 14 4"/>
                    <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
                    <path d="M6 7v5M10 7v5"/>
                    <rect x="3" y="4" width="10" height="9" rx="1"/>
                  </svg>
                )}
              </button>
            )}
            <span className={styles.taskChevron}>
              <ChevronIcon open={isOpen} />
            </span>
          </div>
        </div>

        {/* ── Розгорнутий вміст ── */}
        {isOpen && (
          <div className={styles.taskCardBody}>

            {/* Єдиний рядок вкладок (якщо є більше однієї) */}
            {showTabs && (
              <div className={styles.taskInnerTabs}>
                {innerTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`${styles.taskInnerTab} ${validTab === tab.id ? styles.taskInnerTabActive : ""}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Деталі ── */}
            {(validTab === "details" || !showTabs) && (
              <>
                {task.description && (
                  <p className={styles.taskDescFull}>{task.description}</p>
                )}
                {task.links?.length > 0 && (
                  <div className={styles.taskExtras}>
                    <span className={styles.taskExtrasLabel}>Посилання</span>
                    <div className={styles.taskLinkList}>
                      {task.links.map((link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.taskLink}>
                          🔗 {link.label || link.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {task.attachments?.length > 0 && (
                  <div className={styles.taskExtras}>
                    <span className={styles.taskExtrasLabel}>Файли</span>
                    <div className={styles.taskFileList}>
                      {task.attachments.map((att) => (
                        <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" className={styles.taskFile}>
                          {fileIcon(att.name)} {att.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {!task.description && !task.links?.length && !task.attachments?.length && (
                  <p className={styles.empty}>Опис завдання відсутній.</p>
                )}
              </>
            )}

            {/* ── Моя здача (учасник) ── */}
            {validTab === "submit" && isParticipant && (
              <MySubmissionPanel
                taskId={task.id}
                roundId={roundId}
                tournamentId={tournamentId}
              />
            )}

            {/* ── Всі здачі (власник / адмін / журі) ── */}
            {validTab === "allSubs" && (isOwnerOrAdmin || isJury) && (
              <AllSubmissionsPanel
                taskId={task.id}
                roundId={roundId}
                tournamentId={tournamentId}
              />
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmDeleteModal
          icon="📋"
          title="Видалити завдання?"
          description={
            <>Завдання <strong>«{task.title}»</strong> буде видалено разом з усіма здачами. Цю дію не можна скасувати.</>
          }
          confirmLabel="Видалити завдання"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          loading={deleting}
        />
      )}
    </>
  );
}
