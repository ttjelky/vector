import { useState, useEffect } from "react";
import styles from "./styles/RoundsTab.module.css";
import API from "../../api";
import { fileIcon } from "./tournamentHelpers";
import { ConfirmDeleteModal } from "./TournamentShared";
import { SubmissionForm } from "./SubmissionForm";

// ─── MySubmissionPanel ────────────────────────────────────────────────────────
// Блок учасника: показує його здачу або форму першої здачі

function MySubmissionPanel({ taskId, roundId, tournamentId }) {
  const [submission,  setSubmission]  = useState(undefined);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  if (loading) return <p className={styles.empty}>⏳ Завантаження здачі…</p>;

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
        <button className={styles.submitWorkBtn} onClick={() => setShowForm(true)}>
          📤 Здати роботу
        </button>
      </div>
    );
  }

  return (
    <div className={styles.mySubmissionCard}>
      <div className={styles.mySubmissionHeader}>
        <span className={styles.mySubmissionLabel}>✅ Ваша здача</span>
        <span className={styles.mySubmissionDate}>
          {new Date(submission.submitted_at).toLocaleString("uk-UA")}
        </span>
        <div className={styles.mySubmissionActions}>
          <button className={styles.editSubmissionBtn} onClick={() => setShowForm(true)}>✏️ Редагувати</button>
          <button className={styles.deleteSubmissionBtn} onClick={() => setShowConfirm(true)}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 4 14 4"/>
              <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
              <path d="M6 7v5M10 7v5"/>
              <rect x="3" y="4" width="10" height="9" rx="1"/>
            </svg>
          </button>
        </div>
      </div>

      {submission.text && <p className={styles.submissionText}>{submission.text}</p>}

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
// Для власника / журі: всі здачі з іменами учасників

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

  if (loading) return <p className={styles.empty}>⏳ Завантаження здач…</p>;
  if (submissions.length === 0) return <p className={styles.empty}>📭 Жодних здач ще немає.</p>;

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
              <span className={styles.submissionParticipantName}>👤 {sub.participant_username}</span>
              <span className={styles.submissionParticipantEmail}>{sub.participant_email}</span>
            </div>
            <div className={styles.submissionCardMeta}>
              <span className={styles.submissionDate}>
                {new Date(sub.submitted_at).toLocaleString("uk-UA")}
              </span>
              <div className={styles.submissionBadges}>
                {sub.text                  && <span className={styles.subBadge}>📝</span>}
                {sub.links?.length > 0     && <span className={styles.subBadge}>🔗 {sub.links.length}</span>}
                {sub.attachments?.length > 0 && <span className={styles.subBadge}>📎 {sub.attachments.length}</span>}
              </div>
              <span className={styles.roundChevron}>{expanded === sub.id ? "▲" : "▼"}</span>
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

export function TaskCard({ task, tournamentId, roundId, onDeleted, readOnly = false, myRole, isOpen, onToggle }) {
  const [activeTab,   setActiveTab]   = useState("details");
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isOwnerOrJury = !readOnly || myRole === "jury" || myRole === "admin";
  const hasExtras = task.links?.length > 0 || task.attachments?.length > 0 || task.description;

  const innerTabs = [];
  if (hasExtras)      innerTabs.push({ id: "details",  label: "Деталі" });
  if (readOnly)       innerTabs.push({ id: "submit",   label: "📤 Моя здача" });
  if (isOwnerOrJury)  innerTabs.push({ id: "allSubs",  label: "📋 Здачі учасників" });

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
        <div className={styles.taskCardHeader} onClick={onToggle}>
          <div className={styles.taskCardLeft}>
            <span className={styles.taskTitle}>{task.title}</span>
            {!isOpen && task.description && (
              <p className={styles.taskDesc}>
                {task.description.length > 80 ? task.description.slice(0, 80) + "…" : task.description}
              </p>
            )}
          </div>
          <div className={styles.taskCardActions}>
            <span className={styles.taskChevron}>{isOpen ? "▲" : "▼"}</span>
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
          </div>
        </div>

        {isOpen && (
          <div className={styles.taskCardBody}>
            {innerTabs.length > 1 && (
              <div className={styles.taskInnerTabs}>
                {innerTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`${styles.taskInnerTab} ${activeTab === tab.id ? styles.taskInnerTabActive : ""}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {(activeTab === "details" || innerTabs.length === 1) && (
              <>
                {task.description && <p className={styles.taskDescFull}>{task.description}</p>}
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
              </>
            )}

            {activeTab === "submit" && readOnly && (
              <MySubmissionPanel taskId={task.id} roundId={roundId} tournamentId={tournamentId} />
            )}

            {activeTab === "allSubs" && isOwnerOrJury && (
              <AllSubmissionsPanel taskId={task.id} roundId={roundId} tournamentId={tournamentId} />
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmDeleteModal
          icon="📋"
          title="Видалити завдання?"
          description={<>Завдання <strong>«{task.title}»</strong> буде видалено разом з усіма вкладеннями та здачами. Цю дію не можна скасувати.</>}
          confirmLabel="Видалити завдання"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          loading={deleting}
        />
      )}
    </>
  );
}
