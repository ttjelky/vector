import { useState } from "react";
import styles from "./styles/RoundsTab.module.css";
import API from "../../api";
import { fileIcon } from "./tournamentHelpers";

// ─── TaskForm ─────────────────────────────────────────────────────────────────
// Форма створення нового завдання в раунді

export function TaskForm({ roundId, tournamentId, onCreated, onCancel }) {
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
        await API.post(`/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/attachments/`, fd);
      }

      const updated = await API.get(`/tournaments/${tournamentId}/rounds/${roundId}/tasks/${task.id}/`);
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

        {/* Посилання */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>🔗 Посилання</span>
          {links.length > 0 && (
            <div className={styles.taskLinkList}>
              {links.map((link) => (
                <span key={link.id} className={styles.attachChip}>
                  🔗 {link.label || link.url}
                  <button className={styles.attachChipRemove} onClick={() => removeLink(link.id)} title="Видалити">
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
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
          <span className={styles.attachSectionLabel}>📎 Файли</span>
          {files.length > 0 && (
            <div className={styles.taskFileList}>
              {files.map((f, i) => (
                <span key={i} className={styles.attachChip}>
                  {fileIcon(f.name)} {f.name}
                  <span className={styles.attachChipMeta}>{(f.size / 1024).toFixed(0)} KB</span>
                  <button className={styles.attachChipRemove} onClick={() => removeFile(i)} title="Видалити">
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
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
