import { useState } from "react";
import styles from "./styles/RoundsTab.module.css";
import API from "../../api";
import { fileIcon, toInputDatetime, formatRoundDateRange, roundStatus, getRoundStatusStyle } from "./tournamentHelpers";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";

// ─── RoundEditForm ────────────────────────────────────────────────────────────
// Форма редагування раунду — живе тут, бо використовується тільки в RoundCard

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
      try { await API.delete(`/tournaments/${tournamentId}/rounds/${round.id}/links/${link.id}/`); }
      catch (err) { console.error(err); }
    }
    setLinks((l) => l.filter((x) => x.id !== link.id));
  };

  const removeAttachment = async (att) => {
    if (!att._new) {
      try { await API.delete(`/tournaments/${tournamentId}/rounds/${round.id}/attachments/${att.id}/`); }
      catch (err) { console.error(err); }
    }
    setAttachments((a) => a.filter((x) => x.id !== att.id));
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files);
    if (picked.length > 0) setNewFiles((f) => [...f, ...picked]);
    setFileInputKey((k) => k + 1);
  };

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
        await API.post(`/tournaments/${tournamentId}/rounds/${round.id}/links/`, { label: link.label || link.url, url: link.url });
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
          <textarea className={styles.editTextarea} name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Опис раунду…" />
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

        {/* Посилання */}
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

        {/* Файли */}
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
              <button className={styles.attachRemove} onClick={() => setNewFiles((ff) => ff.filter((_, ii) => ii !== i))}>✕</button>
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

// ─── RoundCard ────────────────────────────────────────────────────────────────

export function RoundCard({
  round,
  tournamentId,
  readOnly,
  myRole,
  isOpen,
  isEditing,
  onToggle,
  onEditToggle,
  onDeleteRequest,
  onRoundSaved,
  onTaskCreated,
  onTaskDeleted,
  openTaskId,
  onTaskToggle,
  activeSection,
  onSectionChange,
}) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const section = activeSection || "tasks";

  return (
    <div className={`${styles.roundCard} ${isOpen || isEditing ? styles.roundCardOpen : ""}`}>

      {/* ── Заголовок ── */}
      <div className={styles.roundHeader} onClick={() => !isEditing && onToggle()}>
        <div className={styles.roundHeaderLeft}>
          <span className={styles.roundTitle}>{round.title}</span>
          <span className={styles.roundDate}>{formatRoundDateRange(round.start_date, round.end_date)}</span>
        </div>
        <div className={styles.roundHeaderRight}>
          <span className={styles.roundStatus} style={getRoundStatusStyle(roundStatus(round))}>
            {roundStatus(round)}
          </span>
          {!readOnly && (
            <button
              className={styles.roundActionBtn}
              onClick={(e) => { e.stopPropagation(); onEditToggle(); }}
              title="Редагувати раунд"
            >✏️</button>
          )}
          {!readOnly && (
            <button
              className={`${styles.roundActionBtn} ${styles.roundActionBtnDanger}`}
              onClick={(e) => { e.stopPropagation(); onDeleteRequest(round); }}
              title="Видалити раунд"
            >🗑️</button>
          )}
          {!isEditing && <span className={styles.roundChevron}>{isOpen ? "▲" : "▼"}</span>}
        </div>
      </div>

      {/* ── Форма редагування ── */}
      {isEditing && (
        <div className={styles.roundBody}>
          <RoundEditForm
            round={round}
            tournamentId={tournamentId}
            onSaved={onRoundSaved}
            onCancel={onEditToggle}
          />
        </div>
      )}

      {/* ── Розгорнутий вміст ── */}
      {isOpen && !isEditing && (
        <div className={styles.roundBody}>
          {round.description && <p className={styles.roundDescription}>{round.description}</p>}

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

          {/* ── Вкладки раунду ── */}
          <div className={styles.roundTabs}>
            <button
              className={`${styles.roundTab} ${section === "tasks" ? styles.roundTabActive : ""}`}
              onClick={() => onSectionChange("tasks")}
            >
              Завдання {(round.tasks || []).length > 0 && `(${(round.tasks || []).length})`}
            </button>
            {!readOnly && (
              <button
                className={`${styles.roundTab} ${section === "allSubmissions" ? styles.roundTabActive : ""}`}
                onClick={() => onSectionChange("allSubmissions")}
              >
                Усі здачі
              </button>
            )}
          </div>

          {/* ── Завдання ── */}
          {section === "tasks" && (
            <div className={styles.taskList}>
              {(round.tasks || []).length === 0 && !showTaskForm && (
                <p className={styles.empty}>📋 Завдання ще не додані.</p>
              )}
              {(round.tasks || []).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  tournamentId={tournamentId}
                  roundId={round.id}
                  readOnly={readOnly}
                  myRole={myRole}
                  isOpen={openTaskId === task.id}
                  onToggle={() => onTaskToggle(task.id)}
                  onDeleted={(taskId) => onTaskDeleted(round.id, taskId)}
                />
              ))}
              {!readOnly && (showTaskForm ? (
                <TaskForm
                  roundId={round.id}
                  tournamentId={tournamentId}
                  onCreated={(task) => { onTaskCreated(round.id, task); setShowTaskForm(false); }}
                  onCancel={() => setShowTaskForm(false)}
                />
              ) : (
                <button className={styles.addTaskBtn} onClick={() => setShowTaskForm(true)}>
                  + Додати завдання
                </button>
              ))}
            </div>
          )}

          {/* ── Всі здачі (для власника / журі) ── */}
          {section === "allSubmissions" && !readOnly && (
            <div className={styles.taskList}>
              {(round.tasks || []).length === 0 ? (
                <p className={styles.empty}>У цьому раунді немає завдань.</p>
              ) : (
                (round.tasks || []).map((task) => (
                  <div key={task.id} className={styles.taskSubmissionsBlock}>
                    <div className={styles.taskSubmissionsBlockTitle}>📋 {task.title}</div>
                    {/* AllSubmissionsPanel підключається через TaskCard з вкладкою allSubs */}
                    <TaskCard
                      task={task}
                      tournamentId={tournamentId}
                      roundId={round.id}
                      readOnly={false}
                      myRole={myRole}
                      isOpen={true}
                      onToggle={() => {}}
                      onDeleted={() => {}}
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
}
