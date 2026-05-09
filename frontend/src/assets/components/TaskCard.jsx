import { useState, useEffect } from "react";
import styles from "./styles/TaskCard.module.css";
import API from "../../api";
import { fileIcon } from "./tournamentHelpers";
import { ConfirmDeleteModal } from "./TournamentShared";
import { SubmissionForm } from "./SubmissionForm";

// ─── Icon helpers ──────────────────────────────────────────────────────────────

function TrashIconSm() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 4 14 4"/>
      <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
      <path d="M6 7v5M10 7v5"/>
      <rect x="3" y="4" width="10" height="9" rx="1"/>
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 4 10 8 6 12"/>
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`${styles.chevronSvg} ${open ? styles.chevronSvgOpen : ""}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="4 6 8 10 12 6" />
    </svg>
  );
}

// ─── Deadline helpers ──────────────────────────────────────────────────────────

function isDeadlinePassed(endDate) {
  if (!endDate) return false;
  return new Date() > new Date(endDate);
}

function formatDeadline(endDate) {
  if (!endDate) return null;
  return new Date(endDate).toLocaleDateString("uk-UA", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ─── GradeResultPanel ──────────────────────────────────────────────────────────

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
      <div className={styles.gradeResultBlock} style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ margin: 0, fontSize: 13.5, color: "#aeaeb2", textAlign: "center", padding: "8px 0" }}>
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
            const pct   = max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0;
            const label = criteriaLabels[key] ?? key;
            const isMax = val === max;
            return (
              <div key={key} className={styles.gradeResultScoreRow}>
                <span className={styles.gradeResultScoreLabel}>{label}</span>
                <div className={styles.gradeResultScoreBarTrack} title={`${pct}%`}>
                  <div className={styles.gradeResultScoreBarFill} style={{ width: `${pct}%` }} />
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

function MySubmissionPanel({ taskId, roundId, tournamentId, deadlinePassed, canSubmit = true }) {
  const [submission,  setSubmission]  = useState(undefined);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeView,  setActiveView]  = useState("submission");

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
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
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

  if (!submission) {
    return (
      <div className={styles.mySubmissionEmpty}>
        <p className={styles.empty}>Ви ще не здали роботу по цьому завданню.</p>
        {deadlinePassed ? (
          <p style={{ fontSize: 13, color: "#ff3b30", margin: 0 }}>
            ⏰ Дедлайн минув — здача недоступна
          </p>
        ) : (
          <button className={styles.submitWorkBtn} onClick={() => setShowForm(true)}>
            Здати роботу
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
            <span className={styles.mySubmissionLabel}>✓ Здано</span>
            <span className={styles.mySubmissionDate}>
              {new Date(submission.submitted_at).toLocaleString("uk-UA")}
            </span>
            <div className={styles.mySubmissionActions}>
              {!deadlinePassed && canSubmit && (
                <button className={styles.editSubmissionBtn} onClick={() => setShowForm(true)}>
                  Редагувати
                </button>
              )}
              {canSubmit && (
                <button
                  className={styles.deleteSubmissionBtn}
                  onClick={() => setShowConfirm(true)}
                  title="Видалити здачу"
                >
                  <TrashIconSm />
                </button>
              )}
              {!canSubmit && (
                <span style={{
                  fontSize: 12, fontWeight: 500, color: "#991b1b",
                  background: "#fff1f2", border: "1px solid #fecdd3",
                  borderRadius: 100, padding: "3px 10px", whiteSpace: "nowrap"
                }}>🔒 Раунд завершено</span>
              )}
            </div>
          </div>

          {submission.text && (
            <div className={`${styles.submissionText} richContent`} dangerouslySetInnerHTML={{ __html: submission.text }} />
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
                {sub.text                    && <span className={styles.subBadge}>Текст</span>}
                {sub.links?.length > 0       && <span className={styles.subBadge}>🔗 {sub.links.length}</span>}
                {sub.attachments?.length > 0 && <span className={styles.subBadge}>📎 {sub.attachments.length}</span>}
              </div>
              <ChevronIcon open={expanded === sub.id} />
            </div>
          </div>

          {expanded === sub.id && (
            <div className={styles.submissionCardBody}>
              {sub.text && <div className={`${styles.submissionText} richContent`} dangerouslySetInnerHTML={{ __html: sub.text }} />}

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

// ─── Task Drawer ───────────────────────────────────────────────────────────────

function TaskDrawer({ task: taskProp, roundId, tournamentId, readOnly, myRole, roundEndDate, canSubmit = true, onClose }) {
  const [activeTab,   setActiveTab]   = useState("details");
  const [task,        setTask]        = useState(taskProp);

  // Підвантажуємо повні дані завдання при відкритті —
  // список tasks у раунді може не містити нових полів (tech_requirements, must_have).
  useEffect(() => {
    API.get(`/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskProp.id}/`)
      .then((r) => setTask(r.data))
      .catch(() => { /* залишаємо дані з пропсу */ });
  }, [taskProp.id, roundId, tournamentId]);

  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";
  const isJury         = myRole === "jury";
  const isParticipant  = readOnly && !isJury;

  const hasDetails     = true; // завжди показуємо вкладку Деталі
  const deadlinePassed = isDeadlinePassed(roundEndDate ?? task.end_date);
  const deadlineLabel  = formatDeadline(roundEndDate ?? task.end_date);

  const tabs = [];
  tabs.push({ id: "details", label: "Деталі" });
  if (isParticipant) tabs.push({ id: "submit",   label: "Моя здача" });
  if (isOwnerOrAdmin || isJury) tabs.push({ id: "allSubs", label: "Здачі учасників" });

  // Якщо поточна вкладка недоступна — беремо першу
  const validTab = tabs.find((t) => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? "details");

  // Зупиняємо клік усередині drawer від закриття
  const handleDrawerClick = (e) => e.stopPropagation();

  return (
    <>
      {/* Backdrop з blur */}
      <div className={styles.drawerBackdrop} onClick={onClose} />

      {/* Сам Drawer */}
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        onClick={handleDrawerClick}
      >
        {/* Шапка */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleGroup}>
            <span className={styles.drawerTitle}>{task.title}</span>
            {deadlineLabel && (
              <span className={styles.drawerSubtitle}>
                Дедлайн: {deadlineLabel}
              </span>
            )}
          </div>
          <button
            className={styles.drawerCloseBtn}
            onClick={onClose}
            aria-label="Закрити"
          >
            ✕
          </button>
        </div>

        {/* Банер простроченого дедлайну */}
        {deadlinePassed && (isParticipant) && (
          <div style={{ padding: "0 24px" }}>
            <div className={`${styles.drawerDeadlineBanner} ${styles.drawerDeadlineExpired}`}>
              ⏰ Дедлайн минув — нові здачі не приймаються
            </div>
          </div>
        )}

        {/* Вкладки */}
        {tabs.length > 1 && (
          <div className={styles.drawerTabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.drawerTab} ${validTab === tab.id ? styles.drawerTabActive : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Тіло */}
        <div className={styles.drawerBody}>

          {/* ── Деталі ── */}
          {(validTab === "details" || tabs.length === 0) && (
            <>
              {task.description && (
                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Опис</span>
                  <div className={`${styles.drawerDesc} richContent`} dangerouslySetInnerHTML={{ __html: task.description }} />
                </div>
              )}

              {task.tech_requirements?.length > 0 && (
                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Вимоги до технологій</span>
                  <div className={styles.techReqGrid}>
                    {task.tech_requirements.map((req, i) => (
                      <div key={i} className={styles.techReqCard}>
                        <span className={styles.techReqCategory}>{req.category}</span>
                        <span className={styles.techReqValue}>{req.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {task.must_have?.length > 0 && (
                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Must have</span>
                  <ul className={styles.mustHaveViewList}>
                    {task.must_have.map((item, i) => (
                      <li key={i} className={styles.mustHaveViewItem}>
                        <span className={styles.mustHaveCheck}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {task.links?.length > 0 && (
                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Посилання</span>
                  <div className={styles.chipList}>
                    {task.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.chip}
                      >
                        🔗 {link.label || link.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {task.attachments?.length > 0 && (
                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Файли</span>
                  <div className={styles.chipList}>
                    {task.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.chip}
                      >
                        {fileIcon(att.name)} {att.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!task.description && !task.links?.length && !task.attachments?.length
               && !task.tech_requirements?.length && !task.must_have?.length && (
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
              deadlinePassed={deadlinePassed}
              canSubmit={canSubmit}
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
      </div>
    </>
  );
}

// ─── Rich-text preview helper ─────────────────────────────────────────────────
// Замінює таблиці на "Таблиця", списки → перший елемент, решту тегів прибирає.

function getDescriptionPreview(html, maxLen = 80) {
  if (!html) return "";
  let result = html.replace(/<table[\s\S]*?<\/table>/gi, " Таблиця ");
  result = result.replace(/<ul[\s\S]*?<\/ul>/gi, (match) => {
    const firstLi = match.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
    if (!firstLi) return "";
    const text = firstLi[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return " " + text + "… ";
  });
  result = result.replace(/<ol[\s\S]*?<\/ol>/gi, (match) => {
    const firstLi = match.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
    if (!firstLi) return "";
    const text = firstLi[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return " " + text + "… ";
  });
  const plain = result.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
// Slim row card → відкриває Drawer при кліку.
// Пропс roundEndDate передається з RoundsTab для перевірки дедлайну.

export function TaskCard({
  task,
  tournamentId,
  roundId,
  onDeleted,
  readOnly = false,
  myRole,
  roundEndDate,
  canSubmit = true,
  // Legacy пропси (ігноруємо, залишаємо для сумісності)
  isOpen: _isOpen,
  onToggle: _onToggle,
}) {
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const endDate      = roundEndDate ?? task.end_date;
  const deadlinePast = isDeadlinePassed(endDate);
  const deadlineStr  = formatDeadline(endDate);

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
      {/* ── Slim row card ── */}
      <div
        className={styles.taskCard}
        onClick={() => setDrawerOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDrawerOpen(true)}
        aria-label={`Відкрити завдання: ${task.title}`}
      >
        <div className={styles.taskCardLeft}>
          <span className={styles.taskTitle}>{task.title}</span>
          {task.description && (
            <p className={styles.taskDesc}>
              {getDescriptionPreview(task.description, 80)}
            </p>
          )}
        </div>

        <div className={styles.taskCardRight}>
          {deadlineStr && (
            <span className={`${styles.taskDeadline} ${deadlinePast ? styles.taskDeadlinePast : ""}`}>
              {deadlinePast ? "⏰ " : ""}
              {deadlineStr}
            </span>
          )}

          {!readOnly && (
            <button
              className={styles.taskDeleteBtn}
              onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
              disabled={deleting}
              title="Видалити завдання"
              aria-label="Видалити завдання"
            >
              {deleting ? "…" : <TrashIconSm />}
            </button>
          )}

          <span className={styles.taskArrow}>
            <ChevronRight />
          </span>
        </div>
      </div>

      {/* ── Slide-over Drawer ── */}
      {drawerOpen && (
        <TaskDrawer
          task={task}
          roundId={roundId}
          tournamentId={tournamentId}
          readOnly={readOnly}
          myRole={myRole}
          roundEndDate={endDate}
          canSubmit={canSubmit}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Confirm delete modal ── */}
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