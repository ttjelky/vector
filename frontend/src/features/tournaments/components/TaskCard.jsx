
import { useState, useEffect } from "react";
import styles from "../styles/TaskCard.module.css";
import { API } from '@api';
import { fileIcon } from "./tournamentHelpers";
import { ConfirmDeleteModal } from "./TournamentShared";
import { SubmissionForm } from "@features/submissions";
import { RichTextArea } from "@shared/components/RichTextArea";

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

// ─── Score color helper ────────────────────────────────────────────────────────

function scoreColorClass(pct) {
  if (pct >= 75) return { bar: styles.barHigh, text: styles.scoreHigh };
  if (pct >= 40) return { bar: styles.barMid,  text: styles.scoreMid  };
  return           { bar: styles.barLow,  text: styles.scoreLow  };
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
  }, [submissionId]); // eslint-disable-line

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
            const { bar, text } = scoreColorClass(pct);

            return (
              <div key={key} className={styles.gradeResultScoreRow}>
                <span className={styles.gradeResultScoreLabel}>{label}</span>
                <div className={styles.gradeResultScoreBarTrack} title={`${pct}%`}>
                  <div className={`${styles.gradeResultScoreBarFill} ${bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`${styles.gradeResultScoreValue} ${text}`}>
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

// ─── TeamMemberSubmissionView ─────────────────────────────────────────────────
// Для учасника командного турніру (не капітана):
// показує здачу команди (readonly) і оцінку журі.
// Здача шукається через список всіх здач задачі — бо /submissions/ без прав
// капітана повертає порожній список (здача прив'язана до команди, не до юзера).

function TeamMemberSubmissionView({ taskId, roundId, tournamentId, teamName }) {
  const [submission, setSubmission] = useState(undefined);
  const [loading,    setLoading]    = useState(true);
  const [activeView, setActiveView] = useState("submission");

  useEffect(() => {
    setLoading(true);
    // Запитуємо список всіх здач задачі — бекенд повертає здачу своєї команди
    API.get(`/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/`)
      .then((r) => {
        // Шукаємо здачу своєї команди за назвою, або беремо першу
        const teamSub = r.data.find((s) => s.team_name === teamName) ?? r.data[0] ?? null;
        setSubmission(teamSub);
      })
      .catch(() => setSubmission(null))
      .finally(() => setLoading(false));
  }, [taskId]); // eslint-disable-line

  if (loading) return <p className={styles.empty}>Завантаження здачі…</p>;

  if (!submission) {
    return (
      <div className={styles.mySubmissionEmpty}>
        <p className={styles.empty} style={{ textAlign: "center" }}>
          🔒 Здавати роботу може лише капітан команди
        </p>
        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0", textAlign: "center" }}>
          Команда ще не здала роботу по цьому завданню
        </p>
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
          Здача команди
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
            {submission.team_name && (
              <span style={{
                fontSize: 12.5, fontWeight: 600, color: "#5566aa",
                background: "#f0f2ff", border: "1px solid #dde4f5",
                borderRadius: 100, padding: "2px 9px"
              }}>🏆 {submission.team_name}</span>
            )}
            <span className={styles.mySubmissionDate}>
              {new Date(submission.submitted_at).toLocaleString("uk-UA")}
            </span>
            {/* Не-капітан не може редагувати/видаляти */}
            <span style={{
              fontSize: 12, fontWeight: 500, color: "#5566aa",
              background: "#f0f2ff", border: "1px solid #dde4f5",
              borderRadius: 100, padding: "3px 10px", whiteSpace: "nowrap"
            }}>🔒 Лише перегляд</span>
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
    </div>
  );
}

// ─── MySubmissionPanel ────────────────────────────────────────────────────────

function MySubmissionPanel({ taskId, roundId, tournamentId, deadlinePassed, canSubmit = true, isTeamCaptain = true, teamName = null }) {
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
  }, [taskId]); // eslint-disable-line

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

  // Командний турнір — не-капітан: показуємо здачу і оцінку команди (readonly)
  if (teamName !== null && !isTeamCaptain) {
    return (
      <TeamMemberSubmissionView
        taskId={taskId}
        roundId={roundId}
        tournamentId={tournamentId}
        teamName={teamName}
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
            {teamName && (
              <span style={{
                fontSize: 12.5, fontWeight: 600, color: "#5566aa",
                background: "#f0f2ff", border: "1px solid #dde4f5",
                borderRadius: 100, padding: "2px 9px"
              }}>🏆 {teamName}</span>
            )}
            <span className={styles.mySubmissionDate}>
              {new Date(submission.submitted_at).toLocaleString("uk-UA")}
            </span>
            <div className={styles.mySubmissionActions}>
              {!deadlinePassed && canSubmit && isTeamCaptain && (
                <button className={styles.editSubmissionBtn} onClick={() => setShowForm(true)}>
                  Редагувати
                </button>
              )}
              {canSubmit && isTeamCaptain && (
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
  }, [taskId]); // eslint-disable-line

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
              <span className={styles.submissionParticipantName}>
                {sub.team_name ?? sub.participant_username}
              </span>
              <span className={styles.submissionParticipantEmail}>
                {sub.team_name ? sub.participant_username : sub.participant_email}
              </span>
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

// ─── TaskEditForm ─────────────────────────────────────────────────────────────

function TaskEditForm({ task, roundId, tournamentId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title:       task.title       || "",
    description: task.description || "",
    end_date:    task.end_date
      ? new Date(task.end_date).toISOString().slice(0, 16)
      : "",
  });
  const [techReqs,     setTechReqs]     = useState(task.tech_requirements || [{ category: "", value: "" }]);
  const [mustHave,     setMustHave]     = useState(task.must_have || [""]);
  const [links,        setLinks]        = useState(task.links || []);
  const [attachments,  setAttachments]  = useState(task.attachments || []);
  const [linkForm,     setLinkForm]     = useState({ label: "", url: "" });
  const [newFiles,     setNewFiles]     = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  // ── Link helpers ──
  const addLink = () => {
    if (!linkForm.url.trim()) return;
    setLinks((l) => [...l, { ...linkForm, _new: true, id: Date.now() }]);
    setLinkForm({ label: "", url: "" });
  };

  const removeLink = async (link) => {
    if (!link._new) {
      try {
        await API.delete(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/links/${link.id}/`
        );
      } catch (err) { console.error(err); }
    }
    setLinks((l) => l.filter((x) => x.id !== link.id));
  };

  // ── Attachment helpers ──
  const removeAttachment = async (att) => {
    if (!att._new) {
      try {
        await API.delete(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/attachments/${att.id}/`
        );
      } catch (err) { console.error(err); }
    }
    setAttachments((a) => a.filter((x) => x.id !== att.id));
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files);
    if (picked.length > 0) setNewFiles((f) => [...f, ...picked]);
    setFileInputKey((k) => k + 1);
  };

  // ── Tech requirements helpers ──
  const addTechReq    = () => setTechReqs((r) => [...r, { category: "", value: "" }]);
  const removeTechReq = (i) => setTechReqs((r) => r.filter((_, idx) => idx !== i));
  const updateTechReq = (i, field, val) =>
    setTechReqs((r) => r.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  // ── Must have helpers ──
  const addMustHave    = () => setMustHave((m) => [...m, ""]);
  const removeMustHave = (i) => setMustHave((m) => m.filter((_, idx) => idx !== i));
  const updateMustHave = (i, val) =>
    setMustHave((m) => m.map((item, idx) => idx === i ? val : item));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Назва завдання обов'язкова."); return; }
    setSaving(true);
    try {
      const filteredTechReqs = techReqs.filter((r) => r.category.trim() || r.value.trim());
      const filteredMustHave = mustHave.filter((m) => m.trim());
      const payload = {
        title:             form.title.trim(),
        description:       form.description.trim() || null,
        end_date:          form.end_date || null,
        tech_requirements: filteredTechReqs.length > 0 ? filteredTechReqs : null,
        must_have:         filteredMustHave.length > 0 ? filteredMustHave : null,
      };
      await API.patch(
        `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/`,
        payload
      );

      for (const link of links.filter((l) => l._new)) {
        await API.post(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/links/`,
          { label: link.label || link.url, url: link.url }
        );
      }
      for (const file of newFiles) {
        const fd = new FormData();
        fd.append("file", file);
        await API.post(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/attachments/`,
          fd
        );
      }

      // Отримуємо свіжі дані
      const fresh = await API.get(
        `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/`
      );
      onSaved(fresh.data);
    } catch (err) {
      console.error(err);
      setError("Помилка збереження. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ── Тіло форми ── */}
      <div className={styles.editFormBody}>

        {/* Назва */}
        <label className={styles.editLabel}>
          Назва <span className={styles.editRequired}>*</span>
          <input
            className={styles.editInput}
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Назва завдання…"
          />
        </label>

        {/* Опис */}
        <div className={styles.editLabel}>
          Опис
          <RichTextArea
            id="round-description"
            rows={3}
            placeholder="Опис раунду…"
            value={form.description}
            onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setError(""); }}
          />
        </div>

        {/* Дедлайн */}
        <label className={styles.editLabel}>
          Дедлайн
          <input
            className={styles.editInput}
            type="datetime-local"
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
          />
        </label>

        {/* Вимоги до технологій */}
        <div>
          <p className={styles.editSectionLabel}>Вимоги до технологій</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {techReqs.map((req, i) => (
              <div key={i} className={styles.editRow}>
                <input
                  className={`${styles.editInput} ${styles.editRowFlex1}`}
                  placeholder="Категорія (напр. Backend)"
                  value={req.category}
                  onChange={(e) => updateTechReq(i, "category", e.target.value)}
                />
                <input
                  className={`${styles.editInput} ${styles.editRowFlex15}`}
                  placeholder="Вимога (напр. Node.js ≥ 18)"
                  value={req.value}
                  onChange={(e) => updateTechReq(i, "value", e.target.value)}
                />
                <button
                  className={styles.editRemoveBtn}
                  onClick={() => removeTechReq(i)}
                  type="button"
                  title="Видалити"
                  disabled={techReqs.length === 1}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button className={styles.editAddBtn} onClick={addTechReq} type="button">
            + Додати категорію
          </button>
        </div>

        {/* Must have */}
        <div>
          <p className={styles.editSectionLabel}>Must have — обов'язкові критерії</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {mustHave.map((item, i) => (
              <div key={i} className={styles.editRow}>
                <span className={styles.editMustHaveIdx}>{i + 1}</span>
                <input
                  className={`${styles.editInput} ${styles.editRowFlex1}`}
                  placeholder="Обов'язкова вимога…"
                  value={item}
                  onChange={(e) => updateMustHave(i, e.target.value)}
                />
                <button
                  className={styles.editRemoveBtn}
                  onClick={() => removeMustHave(i)}
                  type="button"
                  title="Видалити"
                  disabled={mustHave.length === 1}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button className={styles.editAddBtn} onClick={addMustHave} type="button">
            + Додати критерій
          </button>
        </div>

        {/* Посилання */}
        <div>
          <p className={styles.editSectionLabel}>Посилання до завдання</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {links.map((link) => (
              <div key={link.id} className={styles.editAttachItem}>
                <span className={styles.editAttachItemIcon}>🔗</span>
                <span className={styles.editAttachItemName}>{link.label || link.url}</span>
                <span className={styles.editAttachItemMeta}>{link.url}</span>
                <button
                  className={styles.editRemoveBtn}
                  onClick={() => removeLink(link)}
                  title="Видалити посилання"
                >
                  <TrashIconSm />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.editLinkRow} style={{ marginTop: 8 }}>
            <input
              className={`${styles.editInput} ${styles.editRowFlex15}`}
              placeholder="https://..."
              value={linkForm.url}
              onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <input
              className={`${styles.editInput} ${styles.editRowFlex1}`}
              placeholder="Підпис (необов'язково)"
              value={linkForm.label}
              onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <button className={styles.editLinkAddBtn} onClick={addLink} type="button">
              Додати
            </button>
          </div>
        </div>

        {/* Файли */}
        <div>
          <p className={styles.editSectionLabel}>Файли до завдання</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {attachments.map((att) => (
              <div key={att.id} className={styles.editAttachItem}>
                <span className={styles.editAttachItemIcon}>{fileIcon(att.name)}</span>
                <span className={styles.editAttachItemName}>{att.name}</span>
                <button
                  className={styles.editRemoveBtn}
                  onClick={() => removeAttachment(att)}
                  title="Видалити файл"
                >
                  <TrashIconSm />
                </button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={i} className={`${styles.editAttachItem} ${styles.editAttachItemNew}`}>
                <span className={styles.editAttachItemIcon}>{fileIcon(f.name)}</span>
                <span className={styles.editAttachItemName}>{f.name}</span>
                <span className={styles.editAttachItemMeta}>{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  className={styles.editRemoveBtn}
                  onClick={() => setNewFiles((ff) => ff.filter((_, ii) => ii !== i))}
                >
                  <TrashIconSm />
                </button>
              </div>
            ))}
          </div>
          <label className={styles.editFilePickBtn}>
            + Прикріпити файл
            <input key={fileInputKey} type="file" multiple hidden accept="*/*" onChange={handleFiles} />
          </label>
        </div>

        {error && <p className={styles.editFormError}>{error}</p>}
      </div>

      {/* ── Кнопки дій ── */}
      <div className={styles.editFormActions}>
        <button className={styles.editCancelBtn} onClick={onCancel} disabled={saving}>
          Скасувати
        </button>
        <button className={styles.editSaveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Збереження…" : "Зберегти зміни"}
        </button>
      </div>
    </>
  );
}

// ─── Task Drawer ───────────────────────────────────────────────────────────────

function TaskDrawer({ task: taskProp, roundId, tournamentId, readOnly, myRole, roundEndDate, canSubmit = true, isTeamCaptain = true, teamName = null, onTaskUpdated, initialEditMode = false, onClose }) {
  const [activeTab,   setActiveTab]   = useState("details");
  const [task,        setTask]        = useState(taskProp);
  const [isEditing,   setIsEditing]   = useState(initialEditMode);

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

  const deadlinePassed = isDeadlinePassed(roundEndDate ?? task.end_date);
  const deadlineLabel  = formatDeadline(roundEndDate ?? task.end_date);

  const tabs = [];
  tabs.push({ id: "details", label: "Деталі" });
  if (isParticipant) tabs.push({ id: "submit",   label: "Моя здача" });
  if (isOwnerOrAdmin || isJury) tabs.push({ id: "allSubs", label: "Здачі учасників" });

  const validTab = tabs.find((t) => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? "details");

  const handleTaskSaved = (updatedTask) => {
    setTask(updatedTask);
    setIsEditing(false);
    if (onTaskUpdated) onTaskUpdated(updatedTask);
  };

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />

      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleGroup}>
            <span className={styles.drawerTitle}>
              {isEditing ? "Редагувати завдання" : task.title}
            </span>
            {!isEditing && deadlineLabel && (
              <span className={styles.drawerSubtitle}>Дедлайн: {deadlineLabel}</span>
            )}
          </div>
          <div className={styles.drawerHeaderActions}>
            {isOwnerOrAdmin && !isEditing && (
              <button
                className={styles.drawerEditBtn}
                onClick={() => setIsEditing(true)}
                title="Редагувати завдання"
                aria-label="Редагувати завдання"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
                </svg>
                Редагувати
              </button>
            )}
            {isEditing && (
              <span className={styles.drawerEditingLabel}>режим редагування</span>
            )}
            <button className={styles.drawerCloseBtn} onClick={onClose} aria-label="Закрити">
              ✕
            </button>
          </div>
        </div>

        {/* Режим редагування — замінює весь контент */}
        {isEditing && (
          <TaskEditForm
            task={task}
            roundId={roundId}
            tournamentId={tournamentId}
            onSaved={handleTaskSaved}
            onCancel={() => setIsEditing(false)}
          />
        )}

        {/* Банер простроченого дедлайну */}
        {!isEditing && deadlinePassed && isParticipant && (
          <div style={{ padding: "0 24px" }}>
            <div className={`${styles.drawerDeadlineBanner} ${styles.drawerDeadlineExpired}`}>
              ⏰ Дедлайн минув — нові здачі не приймаються
            </div>
          </div>
        )}

        {/* Вкладки */}
        {!isEditing && tabs.length > 1 && (
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
        {!isEditing && (
        <div className={styles.drawerBody}>

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
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.chip}>
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
                      <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" className={styles.chip}>
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

          {validTab === "submit" && isParticipant && (
            <MySubmissionPanel
              taskId={task.id}
              roundId={roundId}
              tournamentId={tournamentId}
              deadlinePassed={deadlinePassed}
              canSubmit={canSubmit}
              isTeamCaptain={isTeamCaptain}
              teamName={teamName}
            />
          )}

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

// ─── TaskScoreBadge — мінімальна оцінка на картці для учасника ───────────────

function TaskScoreBadge({ taskId, roundId, tournamentId }) {
  const [state, setState] = useState(null); // null = loading, false = no sub, object = data

  useEffect(() => {
    // Спочатку перевіряємо чи є здача
    API.get(`/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/`)
      .then((r) => {
        if (!r.data || r.data.length === 0) { setState(false); return; }
        const subId = r.data[0].id;
        // Намагаємось отримати оцінку
        API.get(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/${subId}/grade/`
        )
          .then((gr) => setState({ grade: gr.data, submitted: true }))
          .catch(() => setState({ grade: null, submitted: true }));
      })
      .catch(() => setState(false));
  }, [taskId, roundId, tournamentId]);

  // Ще завантажується — нічого не показуємо, щоб картка не стрибала
  if (state === null) return null;

  // Немає здачі — нічого
  if (state === false) return null;

  const { grade, submitted } = state;

  // Здано, але ще не оцінено
  if (!grade) {
    return <span className={styles.taskSubmittedDot}>Здано</span>;
  }

  const total    = grade.total ?? 0;
  const maxTotal = grade.max_total ?? 100;
  const pct      = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const colorClass =
    pct >= 75 ? styles.taskScoreBadgeHigh :
    pct >= 40 ? styles.taskScoreBadgeMid  :
                styles.taskScoreBadgeLow;

  return (
    <span className={`${styles.taskScoreBadge} ${colorClass}`}>
      ★ {total}/{maxTotal}
    </span>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

export function TaskCard({
  task: taskProp,
  tournamentId,
  roundId,
  onDeleted,
  onUpdated,
  readOnly = false,
  myRole,
  roundEndDate,
  canSubmit = true,
  isTeamCaptain = true,
  teamName = null,
  // Legacy пропси (ігноруємо, залишаємо для сумісності)
  isOpen: _isOpen,
  onToggle: _onToggle,
}) {
  const [task,          setTask]          = useState(taskProp);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);

  // Синхронізуємо task, якщо пропс змінився зовні
  useEffect(() => { setTask(taskProp); }, [taskProp]);

  const handleTaskUpdated = (updatedTask) => {
    setTask(updatedTask);
    if (onUpdated) onUpdated(updatedTask);
  };

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
              {deadlinePast ? "⏰ " : ""}{deadlineStr}
            </span>
          )}

          {/* Оцінка — тільки для учасника */}
          {readOnly && myRole !== "jury" && (
            <TaskScoreBadge
              taskId={task.id}
              roundId={roundId}
              tournamentId={tournamentId}
            />
          )}

          {/* Кнопка редагування — тільки для адміна/власника */}
          {!readOnly && (
            <button
              className={styles.taskEditBtn}
              onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); setOpenInEditMode(true); }}
              title="Редагувати завдання"
              aria-label="Редагувати завдання"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
              </svg>
            </button>
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

          <span className={styles.taskArrow}><ChevronRight /></span>
        </div>
      </div>

      {drawerOpen && (
        <TaskDrawer
          task={task}
          roundId={roundId}
          tournamentId={tournamentId}
          readOnly={readOnly}
          myRole={myRole}
          roundEndDate={endDate}
          canSubmit={canSubmit}
          isTeamCaptain={isTeamCaptain}
          teamName={teamName}
          onTaskUpdated={handleTaskUpdated}
          initialEditMode={openInEditMode}
          onClose={() => { setDrawerOpen(false); setOpenInEditMode(false); }}
        />
      )}

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