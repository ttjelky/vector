import { useState } from "react";
import styles from "@shared/styles/TaskForm.module.css";
import API from "@api";
import { fileIcon } from "./tournamentHelpers";
import { RichTextArea } from "./RichTextArea";

// ─── TaskForm ─────────────────────────────────────────────────────────────────
// Вся логіка збережена без змін.
// Зовнішній вигляд оновлено до нової системи стилів.

export function TaskForm({ roundId, tournamentId, onCreated, onCancel }) {
  const [form,         setForm]         = useState({ title: "", description: "" });
  const [techReqs,     setTechReqs]     = useState([{ category: "", value: "" }]);
  const [mustHave,     setMustHave]     = useState([""]);
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

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Назва завдання обов'язкова."); return; }
    setSaving(true);
    try {
      const filteredTechReqs = techReqs.filter((r) => r.category.trim() || r.value.trim());
      const filteredMustHave = mustHave.filter((m) => m.trim());
      const taskRes = await API.post(
        `/tournaments/${tournamentId}/rounds/${roundId}/tasks/`,
        {
          title:             form.title.trim(),
          description:       form.description.trim() || null,
          tech_requirements: filteredTechReqs.length > 0 ? filteredTechReqs : null,
          must_have:         filteredMustHave.length > 0 ? filteredMustHave : null,
        }
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

        <div className={styles.editLabel}>
        <label>Опис</label>
          <RichTextArea
            id="task-description"
            rows={3}
            placeholder="Детальний опис завдання…"
            value={form.description}
            onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setError(""); }}
          />
        </div>

        {/* ── Посилання ── */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>Посилання</span>

          {links.length > 0 && (
            <div className={styles.taskLinkList}>
              {links.map((link) => (
                <span key={link.id} className={styles.attachChip}>
                  🔗 {link.label || link.url}
                  <button
                    className={styles.attachChipRemove}
                    onClick={() => removeLink(link.id)}
                    title="Видалити"
                    type="button"
                  >
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="2" y1="2" x2="14" y2="14"/>
                      <line x1="14" y1="2" x2="2" y2="14"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className={styles.linkInputRow}>
            <input
              className={styles.editInput}
              placeholder="https://..."
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
            <button className={styles.addLinkBtn} onClick={addLink} type="button">
              Додати
            </button>
          </div>
        </div>

        {/* ── Файли ── */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>Файли</span>

          {files.length > 0 && (
            <div className={styles.taskFileList}>
              {files.map((f, i) => (
                <span key={i} className={styles.attachChip}>
                  {fileIcon(f.name)} {f.name}
                  <span className={styles.attachChipMeta}>{(f.size / 1024).toFixed(0)} KB</span>
                  <button
                    className={styles.attachChipRemove}
                    onClick={() => removeFile(i)}
                    title="Видалити"
                    type="button"
                  >
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="2" y1="2" x2="14" y2="14"/>
                      <line x1="14" y1="2" x2="2" y2="14"/>
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

        {/* ── Вимоги до технологій ── */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>Вимоги до технологій</span>
          <div className={styles.techReqList}>
            {techReqs.map((req, i) => (
              <div key={i} className={styles.techReqRow}>
                <input
                  className={styles.editInput}
                  placeholder="Категорія (напр. Backend)"
                  value={req.category}
                  onChange={(e) => updateTechReq(i, "category", e.target.value)}
                />
                <input
                  className={styles.editInput}
                  placeholder="Вимога (напр. Node.js ≥ 18)"
                  value={req.value}
                  onChange={(e) => updateTechReq(i, "value", e.target.value)}
                />
                <button
                  className={styles.techReqRemove}
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
          <button className={styles.addRowBtn} onClick={addTechReq} type="button">
            + Додати категорію
          </button>
        </div>

        {/* ── Must have ── */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>Must have — обов'язкові критерії</span>
          <div className={styles.mustHaveList}>
            {mustHave.map((item, i) => (
              <div key={i} className={styles.mustHaveRow}>
                <span className={styles.mustHaveIdx}>{i + 1}</span>
                <input
                  className={styles.editInput}
                  placeholder="Обов'язкова вимога…"
                  value={item}
                  onChange={(e) => updateMustHave(i, e.target.value)}
                />
                <button
                  className={styles.techReqRemove}
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
          <button className={styles.addRowBtn} onClick={addMustHave} type="button">
            + Додати критерій
          </button>
        </div>

        {error && <p className={styles.formError}>{error}</p>}
      </div>

      <div className={styles.editActions}>
        <button className={styles.cancelBtn} onClick={onCancel} disabled={saving} type="button">
          Скасувати
        </button>
        <button className={styles.saveBtn} onClick={handleCreate} disabled={saving} type="button">
          {saving ? "Створення…" : "Додати завдання"}
        </button>
      </div>
    </div>
  );
}