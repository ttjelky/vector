import { useState } from "react";
import styles from "./styles/RoundCard.module.css";
import API from "../../api";
import { fileIcon, toInputDatetime } from "./tournamentHelpers";
import { RichTextArea } from "./RichTextArea";

// ─── Icon helpers ──────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 4 14 4"/>
      <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
      <path d="M6 7v5M10 7v5"/>
      <rect x="3" y="4" width="10" height="9" rx="1"/>
    </svg>
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
      const freshRound = fresh.data.find((r) => r.id === round.id) || { ...round, ...payload };
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
      <div className={styles.editForm}>
        <label className={styles.editLabel}>
          Назва <span className={styles.editRequired}>*</span>
          <input className={styles.editInput} name="title" value={form.title} onChange={handleChange} />
        </label>
        <label className={styles.editLabel}>
          Опис
          <RichTextArea
            id="round-description"
            rows={3}
            placeholder="Опис раунду…"
            value={form.description}
            onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setError(""); }}
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

        {/* Посилання */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>Посилання до раунду</span>
          {links.map((link) => (
            <div key={link.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>🔗</span>
              <span className={styles.attachItemName}>{link.label || link.url}</span>
              <span className={styles.attachItemMeta}>{link.url}</span>
              <button className={styles.attachRemove} onClick={() => removeLink(link)} title="Видалити посилання">
                <TrashIcon />
              </button>
            </div>
          ))}
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
            <button className={styles.addLinkBtn} onClick={addLink}>Додати</button>
          </div>
        </div>

        {/* Файли */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>Файли до раунду</span>
          {attachments.map((att) => (
            <div key={att.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(att.name)}</span>
              <span className={styles.attachItemName}>{att.name}</span>
              <button className={styles.attachRemove} onClick={() => removeAttachment(att)} title="Видалити файл">
                <TrashIcon />
              </button>
            </div>
          ))}
          {newFiles.map((f, i) => (
            <div key={i} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(f.name)}</span>
              <span className={styles.attachItemName}>{f.name}</span>
              <span className={styles.attachItemMeta}>{(f.size / 1024).toFixed(0)} KB</span>
              <button
                className={styles.attachRemove}
                onClick={() => setNewFiles((ff) => ff.filter((_, ii) => ii !== i))}
              >
                <TrashIcon />
              </button>
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
          {saving ? "Збереження…" : "Зберегти зміни"}
        </button>
      </div>
    </div>
  );
}

// ─── RoundCard ────────────────────────────────────────────────────────────────
// Тепер — Drawer для редагування раунду. Пропси збережені для сумісності.

export function RoundCard({
  round,
  tournamentId,
  // Нові ключові пропси для drawer-режиму:
  onRoundSaved,
  onEditToggle,
  // Старі пропси (залишаємо для сумісності, але не використовуємо в UI):
  readOnly,
  myRole,
  isOpen,
  isEditing,
  onToggle,
  onDeleteRequest,
  onTaskCreated,
  onTaskDeleted,
  openTaskId,
  onTaskToggle,
  activeSection,
  onSectionChange,
  showTaskForm,
  onAddTask,
  onCloseTaskForm,
}) {
  if (!round) return null;

  const handleClose = () => {
    if (onEditToggle) onEditToggle();
  };

  return (
    <>
      {/* Фон з blur-ефектом */}
      <div
        className={styles.roundEditDrawerBackdrop}
        onClick={handleClose}
        aria-label="Закрити"
      />

      {/* Drawer панель */}
      <div className={styles.roundEditDrawer} role="dialog" aria-modal="true">
        <div className={styles.roundEditDrawerHeader}>
          <span className={styles.roundEditDrawerTitle}>Редагувати раунд</span>
          <button
            className={styles.drawerCloseBtn}
            onClick={handleClose}
            title="Закрити"
            aria-label="Закрити"
          >
            ✕
          </button>
        </div>
        <div className={styles.roundEditDrawerBody}>
          <RoundEditForm
            round={round}
            tournamentId={tournamentId}
            onSaved={onRoundSaved}
            onCancel={handleClose}
          />
        </div>
      </div>
    </>
  );
}