import { useState, useEffect, useCallback } from "react";
import styles from "./styles/RoundsTab.module.css";
import API from "../../api";
import { ConfirmDeleteModal, Toast } from "./TournamentShared";
import { fileIcon, toInputDatetime, formatRoundDateRange, roundStatus, getRoundStatusStyle } from "./tournamentHelpers";

// ─── SubmissionForm ───────────────────────────────────────────────────────────
// Форма для учасника: здати або оновити роботу по завданню

function SubmissionForm({ taskId, roundId, tournamentId, existingSubmission, onSaved, onCancel }) {
  const [text,         setText]         = useState(existingSubmission?.text || "");
  const [links,        setLinks]        = useState(existingSubmission?.links || []);
  const [linkForm,     setLinkForm]     = useState({ label: "", url: "" });
  const [files,        setFiles]        = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const isEdit = !!existingSubmission;

  const addLink = () => {
    if (!linkForm.url.trim()) return;
    setLinks((l) => [...l, { ...linkForm, _new: true, id: Date.now() }]);
    setLinkForm({ label: "", url: "" });
  };

  const removeLink = async (link) => {
    if (!link._new && existingSubmission) {
      try {
        await API.delete(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/${existingSubmission.id}/links/${link.id}/`
        );
      } catch (err) { console.error(err); }
    }
    setLinks((l) => l.filter((x) => x.id !== link.id));
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files);
    if (picked.length > 0) setFiles((f) => [...f, ...picked]);
    setFileInputKey((k) => k + 1);
  };

  const removeNewFile = (idx) => setFiles((f) => f.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const hasContent = text.trim() || links.length > 0 || files.length > 0 ||
      (existingSubmission?.attachments?.length > 0);
    if (!hasContent) {
      setError("Додайте текст, посилання або файл перед здачею.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let submission;
      const basePath = `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/`;

      if (isEdit) {
        const r = await API.patch(`${basePath}${existingSubmission.id}/`, { text: text.trim() || null });
        submission = r.data;
      } else {
        const r = await API.post(basePath, { text: text.trim() || null });
        submission = r.data;
      }

      // Нові посилання
      for (const link of links.filter((l) => l._new)) {
        await API.post(
          `${basePath}${submission.id}/links/`,
          { label: link.label || link.url, url: link.url }
        );
      }

      // Нові файли
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await API.post(`${basePath}${submission.id}/attachments/`, fd);
      }

      // Отримати оновлену здачу
      const fresh = await API.get(`${basePath}${submission.id}/`);
      onSaved(fresh.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail
        || err.response?.data?.[0]
        || "Помилка при збереженні. Спробуйте ще раз.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.submissionForm}>
      <h4 className={styles.submissionFormTitle}>
        {isEdit ? "✏️ Редагувати здачу" : "📤 Здати роботу"}
      </h4>

      <div className={styles.editForm}>
        <label className={styles.editLabel}>
          Текст відповіді
          <textarea
            className={styles.editTextarea}
            value={text}
            onChange={(e) => { setText(e.target.value); setError(""); }}
            rows={4}
            placeholder="Введіть текст вашої відповіді…"
          />
        </label>

        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>🔗 Посилання</span>
          {links.map((link) => (
            <div key={link.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>🔗</span>
              <span className={styles.attachItemName}>{link.label || link.url}</span>
              <span className={styles.attachItemMeta}>{link.url}</span>
              <button className={styles.attachRemove} onClick={() => removeLink(link)}>✕</button>
            </div>
          ))}
          <div className={styles.linkInputRow}>
            <input
              className={styles.editInput}
              placeholder="URL посилання"
              value={linkForm.url}
              onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <input
              className={styles.editInput}
              placeholder="Підпис (необов'язково)"
              value={linkForm.label}
              onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <button className={styles.addLinkBtn} onClick={addLink}>Додати</button>
          </div>
        </div>

        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>📎 Файли</span>
          {/* Вже збережені файли (при редагуванні) */}
          {isEdit && existingSubmission?.attachments?.map((att) => (
            <div key={att.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(att.name)}</span>
              <span className={styles.attachItemName}>{att.name}</span>
              <span className={styles.attachItemMeta}>збережено</span>
            </div>
          ))}
          {/* Нові файли */}
          {files.map((f, i) => (
            <div key={i} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(f.name)}</span>
              <span className={styles.attachItemName}>{f.name}</span>
              <span className={styles.attachItemMeta}>{(f.size / 1024).toFixed(0)} KB</span>
              <button className={styles.attachRemove} onClick={() => removeNewFile(i)}>✕</button>
            </div>
          ))}
          <label className={styles.filePickBtn}>
            + Прикріпити файл
            <input key={fileInputKey} type="file" multiple hidden accept="*/*" onChange={handleFiles} />
          </label>
        </div>

        {error && <p className={styles.formError}>{error}</p>}
      </div>

      <div className={styles.editActions}>
        <button className={styles.cancelBtn} onClick={onCancel} disabled={saving}>Скасувати</button>
        <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? "Збереження…" : isEdit ? "Зберегти зміни" : "Здати роботу"}
        </button>
      </div>
    </div>
  );
}

// ─── MySubmissionPanel ────────────────────────────────────────────────────────
// Блок учасника: показує його здачу або форму першої здачі

function MySubmissionPanel({ taskId, roundId, tournamentId }) {
  const [submission,  setSubmission]  = useState(undefined); // undefined = ще не завантажено
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const basePath = `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/`;

  useEffect(() => {
    setLoading(true);
    API.get(basePath)
      .then((r) => {
        // учасник отримає масив з 0 або 1 елементом (своя здача)
        setSubmission(r.data.length > 0 ? r.data[0] : null);
      })
      .catch(() => setSubmission(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleSaved = (sub) => {
    setSubmission(sub);
    setShowForm(false);
  };

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
          <button className={styles.deleteSubmissionBtn} onClick={() => setShowConfirm(true)}>🗑️</button>
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
// Для власника / журі / адміна: всі здачі з іменами учасників

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
              <span className={styles.submissionParticipantName}>
                👤 {sub.participant_username}
              </span>
              <span className={styles.submissionParticipantEmail}>
                {sub.participant_email}
              </span>
            </div>
            <div className={styles.submissionCardMeta}>
              <span className={styles.submissionDate}>
                {new Date(sub.submitted_at).toLocaleString("uk-UA")}
              </span>
              <div className={styles.submissionBadges}>
                {sub.text && <span className={styles.subBadge}>📝</span>}
                {sub.links?.length > 0 && <span className={styles.subBadge}>🔗 {sub.links.length}</span>}
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

function TaskCard({ task, tournamentId, roundId, onDeleted, readOnly = false, myRole }) {
  const [expanded,    setExpanded]    = useState(false);
  const [activeTab,   setActiveTab]   = useState("details"); // "details" | "submit" | "allSubs"
  const [deleting,    setDeleting]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const hasExtras = (task.links?.length > 0) || (task.attachments?.length > 0) || task.description;
  const isOwnerOrJury = !readOnly || myRole === "jury" || myRole === "admin";

  // Визначення доступних вкладок всередині завдання
  const innerTabs = [];
  if (hasExtras) innerTabs.push({ id: "details", label: "Деталі" });
  if (readOnly) innerTabs.push({ id: "submit", label: "📤 Моя здача" });
  if (isOwnerOrJury) innerTabs.push({ id: "allSubs", label: "📋 Здачі учасників" });

  return (
    <>
      <div className={`${styles.taskCard} ${expanded ? styles.taskCardExpanded : ""}`}>
        <div className={styles.taskCardHeader} onClick={() => setExpanded((v) => !v)}>
          <div className={styles.taskCardLeft}>
            <span className={styles.taskTitle}>{task.title}</span>
            {!expanded && task.description && (
              <p className={styles.taskDesc}>
                {task.description.length > 80 ? task.description.slice(0, 80) + "…" : task.description}
              </p>
            )}
          </div>
          <div className={styles.taskCardActions}>
            <span className={styles.taskChevron}>{expanded ? "▲" : "▼"}</span>
            {!readOnly && (
              <button
                className={styles.taskDeleteBtn}
                onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                disabled={deleting}
                title="Видалити завдання"
              >
                {deleting ? "…" : "✕"}
              </button>
            )}
          </div>
        </div>

        {expanded && (
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
              <MySubmissionPanel
                taskId={task.id}
                roundId={roundId}
                tournamentId={tournamentId}
              />
            )}

            {activeTab === "allSubs" && isOwnerOrJury && (
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

// ─── TaskForm ─────────────────────────────────────────────────────────────────

function TaskForm({ roundId, tournamentId, onCreated, onCancel }) {
  const [form,         setForm]         = useState({ title: "", description: "" });
  const [links,        setLinks]        = useState([]);
  const [linkForm,     setLinkForm]     = useState({ label: "", url: "" });
  const [files,        setFiles]        = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const addLink = () => {
    if (!linkForm.url.trim()) return;
    setLinks((l) => [...l, { ...linkForm, id: Date.now() }]);
    setLinkForm({ label: "", url: "" });
  };

  const removeLink = (id) => setLinks((l) => l.filter((x) => x.id !== id));

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files);
    if (picked.length > 0) setFiles((f) => [...f, ...picked]);
    setFileInputKey((k) => k + 1);
  };

  const removeFile = (idx) => setFiles((f) => f.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Назва завдання обов'язкова."); return; }
    setSaving(true);
    try {
      const taskRes = await API.post(
        `/tournaments/${tournamentId}/rounds/${roundId}/tasks/`,
        { title: form.title.trim(), description: form.description.trim() || null }
      );
      const task = taskRes.data;

      for (const link of links) {
        await API.post(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/links/`,
          { label: link.label || link.url, url: link.url }
        );
      }

      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await API.post(
          `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/attachments/`,
          fd
        );
      }

      const updated = await API.get(
        `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/`
      );
      onCreated(updated.data);
    } catch (err) {
      console.error(err);
      setError("Помилка при створенні завдання.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.taskFormCard}>
      <h4 className={styles.taskFormTitle}>Нове завдання</h4>
      <div className={styles.editForm}>
        <label className={styles.editLabel}>
          Назва <span className={styles.editRequired}>*</span>
          <input
            className={styles.editInput}
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Назва завдання"
            autoFocus
          />
        </label>
        <label className={styles.editLabel}>
          Опис
          <textarea
            className={styles.editTextarea}
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Детальний опис завдання…"
          />
        </label>

        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>🔗 Посилання</span>
          {links.map((link) => (
            <div key={link.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>🔗</span>
              <span className={styles.attachItemName}>{link.label || link.url}</span>
              <span className={styles.attachItemMeta}>{link.url}</span>
              <button className={styles.attachRemove} onClick={() => removeLink(link.id)}>✕</button>
            </div>
          ))}
          <div className={styles.linkInputRow}>
            <input
              className={styles.editInput}
              placeholder="URL посилання"
              value={linkForm.url}
              onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <input
              className={styles.editInput}
              placeholder="Підпис (необов'язково)"
              value={linkForm.label}
              onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <button className={styles.addLinkBtn} onClick={addLink}>Додати</button>
          </div>
        </div>

        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>📎 Файли</span>
          {files.map((f, i) => (
            <div key={i} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(f.name)}</span>
              <span className={styles.attachItemName}>{f.name}</span>
              <span className={styles.attachItemMeta}>{(f.size / 1024).toFixed(0)} KB</span>
              <button className={styles.attachRemove} onClick={() => removeFile(i)}>✕</button>
            </div>
          ))}
          <label className={styles.filePickBtn}>
            + Прикріпити файл
            <input key={fileInputKey} type="file" multiple hidden accept="*/*" onChange={handleFiles} />
          </label>
        </div>

        {error && <p className={styles.formError}>{error}</p>}
      </div>
      <div className={styles.editActions}>
        <button className={styles.cancelBtn} onClick={onCancel} disabled={saving}>Скасувати</button>
        <button className={styles.saveBtn} onClick={handleCreate} disabled={saving}>
          {saving ? "Створення…" : "Додати завдання"}
        </button>
      </div>
    </div>
  );
}

// ─── RoundEditForm ────────────────────────────────────────────────────────────

function RoundEditForm({ round, tournamentId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title:       round.title       || "",
    description: round.description || "",
    start_date:  toInputDatetime(round.start_date),
    end_date:    toInputDatetime(round.end_date),
  });
  const [links,        setLinks]        = useState(round.links || []);
  const [attachments,  setAttachments]  = useState(round.attachments || []);
  const [linkForm,     setLinkForm]     = useState({ label: "", url: "" });
  const [newFiles,     setNewFiles]     = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const addLink = () => {
    if (!linkForm.url.trim()) return;
    setLinks((l) => [...l, { ...linkForm, _new: true, id: Date.now() }]);
    setLinkForm({ label: "", url: "" });
  };

  const removeLink = async (link) => {
    if (!link._new) {
      try {
        await API.delete(`/tournaments/${tournamentId}/rounds/${round.id}/links/${link.id}/`);
      } catch (err) { console.error(err); }
    }
    setLinks((l) => l.filter((x) => x.id !== link.id));
  };

  const removeAttachment = async (att) => {
    if (!att._new) {
      try {
        await API.delete(`/tournaments/${tournamentId}/rounds/${round.id}/attachments/${att.id}/`);
      } catch (err) { console.error(err); }
    }
    setAttachments((a) => a.filter((x) => x.id !== att.id));
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files);
    if (picked.length > 0) setNewFiles((f) => [...f, ...picked]);
    setFileInputKey((k) => k + 1);
  };

  const removeNewFile = (idx) => setNewFiles((f) => f.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Назва раунду обов'язкова."); return; }
    setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim() || null,
        start_date:  form.start_date || null,
        end_date:    form.end_date   || null,
      };
      await API.patch(`/tournaments/${tournamentId}/rounds/${round.id}/`, payload);

      for (const link of links.filter((l) => l._new)) {
        await API.post(
          `/tournaments/${tournamentId}/rounds/${round.id}/links/`,
          { label: link.label || link.url, url: link.url }
        );
      }

      for (const file of newFiles) {
        const fd = new FormData();
        fd.append("file", file);
        await API.post(`/tournaments/${tournamentId}/rounds/${round.id}/attachments/`, fd);
      }

      const fresh = await API.get(`/tournaments/${tournamentId}/rounds/`);
      const freshRound = fresh.data.find((r) => r.id === round.id) || payload;
      onSaved(freshRound);
    } catch (err) {
      console.error(err);
      setError("Помилка збереження. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.roundEditForm}>
      <h4 className={styles.roundEditTitle}>Редагування раунду</h4>
      <div className={styles.editForm}>
        <label className={styles.editLabel}>
          Назва <span className={styles.editRequired}>*</span>
          <input className={styles.editInput} name="title" value={form.title} onChange={handleChange} />
        </label>
        <label className={styles.editLabel}>
          Опис
          <textarea
            className={styles.editTextarea}
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Опис раунду…"
          />
        </label>
        <div className={styles.editRow}>
          <label className={styles.editLabel}>
            Початок
            <input className={styles.editInput} type="datetime-local" name="start_date" value={form.start_date} onChange={handleChange} />
          </label>
          <label className={styles.editLabel}>
            Кінець
            <input className={styles.editInput} type="datetime-local" name="end_date" value={form.end_date} onChange={handleChange} />
          </label>
        </div>

        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>🔗 Посилання до раунду</span>
          {links.map((link) => (
            <div key={link.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>🔗</span>
              <span className={styles.attachItemName}>{link.label || link.url}</span>
              <span className={styles.attachItemMeta}>{link.url}</span>
              <button className={styles.attachRemove} onClick={() => removeLink(link)}>✕</button>
            </div>
          ))}
          <div className={styles.linkInputRow}>
            <input
              className={styles.editInput}
              placeholder="URL посилання"
              value={linkForm.url}
              onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <input
              className={styles.editInput}
              placeholder="Підпис (необов'язково)"
              value={linkForm.label}
              onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
            />
            <button className={styles.addLinkBtn} onClick={addLink}>Додати</button>
          </div>
        </div>

        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>📎 Файли до раунду</span>
          {attachments.map((att) => (
            <div key={att.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(att.name)}</span>
              <span className={styles.attachItemName}>{att.name}</span>
              <button className={styles.attachRemove} onClick={() => removeAttachment(att)}>✕</button>
            </div>
          ))}
          {newFiles.map((f, i) => (
            <div key={i} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(f.name)}</span>
              <span className={styles.attachItemName}>{f.name}</span>
              <span className={styles.attachItemMeta}>{(f.size / 1024).toFixed(0)} KB</span>
              <button className={styles.attachRemove} onClick={() => removeNewFile(i)}>✕</button>
            </div>
          ))}
          <label className={styles.filePickBtn}>
            + Прикріпити файл
            <input key={fileInputKey} type="file" multiple hidden accept="*/*" onChange={handleFiles} />
          </label>
        </div>

        {error && <p className={styles.formError}>{error}</p>}
      </div>
      <div className={styles.editActions}>
        <button className={styles.cancelBtn} onClick={onCancel} disabled={saving}>Скасувати</button>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Збереження…" : "Зберегти"}
        </button>
      </div>
    </div>
  );
}

// ─── RoundsTab ────────────────────────────────────────────────────────────────

const EMPTY_ROUND_FORM = { title: "", description: "", start_date: "", end_date: "" };

export default function RoundsTab({ rounds: initialRounds, loading, tournamentId, onRoundCreated, readOnly = false, myRole }) {
  const [rounds,        setRounds]        = useState(initialRounds);
  const [openRound,     setOpenRound]     = useState(null);
  const [activeSection, setActiveSection] = useState({});
  const [editingRound,  setEditingRound]  = useState(null);
  const [showTaskForm,  setShowTaskForm]  = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(EMPTY_ROUND_FORM);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState("");
  const [deleteRound,   setDeleteRound]   = useState(null);
  const [deletingRound, setDeletingRound] = useState(false);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { setRounds(initialRounds); }, [initialRounds]);

  const toggleRound = (id) => {
    if (editingRound === id) return;
    setOpenRound(openRound === id ? null : id);
    setActiveSection((s) => ({ ...s, [id]: s[id] || "tasks" }));
  };

  const setSection = (roundId, section) =>
    setActiveSection((s) => ({ ...s, [roundId]: section }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFormError("");
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { setFormError("Назва раунду обов'язкова."); return; }
    setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim() || null,
        start_date:  form.start_date || null,
        end_date:    form.end_date   || null,
      };
      const r = await API.post(`/tournaments/${tournamentId}/rounds/`, payload);
      onRoundCreated(r.data);
      setRounds((prev) => [...prev, r.data]);
      setForm(EMPTY_ROUND_FORM);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setFormError("Помилка при створенні раунду. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoundSaved = (updatedRound) => {
    setRounds((prev) => prev.map((r) => r.id === updatedRound.id ? updatedRound : r));
    setEditingRound(null);
  };

  const handleDeleteRound = async () => {
    if (!deleteRound) return;
    setDeletingRound(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/rounds/${deleteRound.id}/`);
      setRounds((prev) => prev.filter((r) => r.id !== deleteRound.id));
      if (openRound === deleteRound.id) setOpenRound(null);
      setToast({ message: `Раунд «${deleteRound.title}» видалено`, type: "success" });
      setDeleteRound(null);
    } catch (err) {
      console.error(err);
      setToast({ message: "Помилка при видаленні раунду", type: "error" });
    } finally {
      setDeletingRound(false);
    }
  };

  const handleTaskCreated = (roundId, task) => {
    setRounds((prev) => prev.map((r) =>
      r.id !== roundId ? r : { ...r, tasks: [...(r.tasks || []), task] }
    ));
    setShowTaskForm(null);
  };

  const handleTaskDeleted = (roundId, taskId) => {
    setRounds((prev) => prev.map((r) =>
      r.id !== roundId ? r : { ...r, tasks: (r.tasks || []).filter((t) => t.id !== taskId) }
    ));
  };

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <p className={styles.empty}>⏳ Завантаження раундів…</p>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      {!readOnly && (!showForm ? (
        <button className={styles.createRoundBtn} onClick={() => setShowForm(true)}>
          ＋ Новий раунд
        </button>
      ) : (
        <div className={styles.roundFormCard}>
          <h3 className={styles.roundFormTitle}>Новий раунд</h3>
          <div className={styles.editForm}>
            <label className={styles.editLabel}>
              Назва <span className={styles.editRequired}>*</span>
              <input
                className={styles.editInput}
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Наприклад: Кваліфікація"
                autoFocus
              />
            </label>
            <label className={styles.editLabel}>
              Опис
              <textarea
                className={styles.editTextarea}
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Короткий опис раунду…"
              />
            </label>
            <div className={styles.editRow}>
              <label className={styles.editLabel}>
                Початок
                <input className={styles.editInput} type="datetime-local" name="start_date" value={form.start_date} onChange={handleChange} />
              </label>
              <label className={styles.editLabel}>
                Кінець
                <input className={styles.editInput} type="datetime-local" name="end_date" value={form.end_date} onChange={handleChange} />
              </label>
            </div>
            {formError && <p className={styles.formError}>{formError}</p>}
          </div>
          <div className={styles.editActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => { setForm(EMPTY_ROUND_FORM); setFormError(""); setShowForm(false); }}
              disabled={saving}
            >
              Скасувати
            </button>
            <button className={styles.saveBtn} onClick={handleCreate} disabled={saving}>
              {saving ? "Створення…" : "Створити раунд"}
            </button>
          </div>
        </div>
      ))}

      {rounds.length === 0 ? (
        <div className={styles.emptyBlock}>
          <p>🏁 Раунди ще не створені.</p>
          {!readOnly && <p style={{ fontSize: 12, marginTop: -4 }}>Натисніть «Новий раунд», щоб розпочати.</p>}
        </div>
      ) : (
        <div className={styles.roundList}>
          {rounds.map((round) => {
            const isOpen    = openRound === round.id;
            const isEditing = editingRound === round.id;
            const section   = activeSection[round.id] || "tasks";

            return (
              <div key={round.id} className={`${styles.roundCard} ${isOpen || isEditing ? styles.roundCardOpen : ""}`}>
                <div className={styles.roundHeader} onClick={() => !isEditing && toggleRound(round.id)}>
                  <div className={styles.roundHeaderLeft}>
                    <span className={styles.roundTitle}>{round.title}</span>
                    <span className={styles.roundDate}>{formatRoundDateRange(round.start_date, round.end_date)}</span>
                  </div>
                  <div className={styles.roundHeaderRight}>
                    <span className={styles.roundStatus} style={getRoundStatusStyle(roundStatus(round))}>{roundStatus(round)}</span>
                    {!readOnly && (
                      <button
                        className={styles.roundActionBtn}
                        onClick={(e) => { e.stopPropagation(); setEditingRound(isEditing ? null : round.id); setOpenRound(null); }}
                        title="Редагувати раунд"
                      >
                        ✏️
                      </button>
                    )}
                    {!readOnly && (
                      <button
                        className={`${styles.roundActionBtn} ${styles.roundActionBtnDanger}`}
                        onClick={(e) => { e.stopPropagation(); setDeleteRound(round); }}
                        title="Видалити раунд"
                      >
                        🗑️
                      </button>
                    )}
                    {!isEditing && (
                      <span className={styles.roundChevron}>{isOpen ? "▲" : "▼"}</span>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className={styles.roundBody}>
                    <RoundEditForm
                      round={round}
                      tournamentId={tournamentId}
                      onSaved={handleRoundSaved}
                      onCancel={() => setEditingRound(null)}
                    />
                  </div>
                )}

                {isOpen && !isEditing && (
                  <div className={styles.roundBody}>
                    {round.description && (
                      <p className={styles.roundDescription}>{round.description}</p>
                    )}
                    {round.links?.length > 0 && (
                      <div className={styles.roundMeta}>
                        <span className={styles.roundMetaLabel}>Посилання</span>
                        <div className={styles.roundLinkList}>
                          {round.links.map((link) => (
                            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.roundLink}>
                              🔗 {link.label || link.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {round.attachments?.length > 0 && (
                      <div className={styles.roundMeta}>
                        <span className={styles.roundMetaLabel}>Файли</span>
                        <div className={styles.roundFileList}>
                          {round.attachments.map((att) => (
                            <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" className={styles.roundFile}>
                              {fileIcon(att.name)} {att.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Вкладки раунду: Завдання / Всі здачі (тільки для власника/журі) */}
                    <div className={styles.roundTabs}>
                      <button
                        className={`${styles.roundTab} ${section === "tasks" ? styles.roundTabActive : ""}`}
                        onClick={() => setSection(round.id, "tasks")}
                      >
                        Завдання {(round.tasks || []).length > 0 && `(${(round.tasks || []).length})`}
                      </button>
                      {!readOnly && (
                        <button
                          className={`${styles.roundTab} ${section === "allSubmissions" ? styles.roundTabActive : ""}`}
                          onClick={() => setSection(round.id, "allSubmissions")}
                        >
                          Усі здачі
                        </button>
                      )}
                    </div>

                    {section === "tasks" && (
                      <div className={styles.taskList}>
                        {(round.tasks || []).length === 0 && showTaskForm !== round.id && (
                          <p className={styles.empty}>📋 Завдання ще не додані.</p>
                        )}
                        {(round.tasks || []).map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            tournamentId={tournamentId}
                            roundId={round.id}
                            onDeleted={(taskId) => handleTaskDeleted(round.id, taskId)}
                            readOnly={readOnly}
                            myRole={myRole}
                          />
                        ))}
                        {!readOnly && (showTaskForm === round.id ? (
                          <TaskForm
                            roundId={round.id}
                            tournamentId={tournamentId}
                            onCreated={(task) => handleTaskCreated(round.id, task)}
                            onCancel={() => setShowTaskForm(null)}
                          />
                        ) : (
                          <button className={styles.addTaskBtn} onClick={() => setShowTaskForm(round.id)}>
                            + Додати завдання
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Зведений список усіх здач по всіх завданнях раунду — для власника/журі */}
                    {section === "allSubmissions" && !readOnly && (
                      <div className={styles.taskList}>
                        {(round.tasks || []).length === 0 ? (
                          <p className={styles.empty}>У цьому раунді немає завдань.</p>
                        ) : (
                          (round.tasks || []).map((task) => (
                            <div key={task.id} className={styles.taskSubmissionsBlock}>
                              <div className={styles.taskSubmissionsBlockTitle}>
                                📋 {task.title}
                              </div>
                              <AllSubmissionsPanel
                                taskId={task.id}
                                roundId={round.id}
                                tournamentId={tournamentId}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deleteRound && (
        <ConfirmDeleteModal
          icon="🏁"
          title="Видалити раунд?"
          description={<>Раунд <strong>«{deleteRound.title}»</strong> та всі його завдання будуть видалені назавжди. Цю дію не можна скасувати.</>}
          confirmLabel="Видалити раунд"
          onConfirm={handleDeleteRound}
          onCancel={() => setDeleteRound(null)}
          loading={deletingRound}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
