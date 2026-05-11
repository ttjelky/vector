import { useState } from "react";
import styles from "./styles/SubmissionForm.module.css";
import API from "../../api";
import { fileIcon } from "./tournamentHelpers";
import { RichTextArea } from "./RichTextArea";

// ─── SubmissionForm ───────────────────────────────────────────────────────────
// Форма для учасника: здати або оновити роботу по завданню

export function SubmissionForm({ taskId, roundId, tournamentId, existingSubmission, onSaved, onCancel }) {
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
    const plainText = text.replace(/<[^>]*>/g, "").trim();
    const hasContent = plainText || links.length > 0 || files.length > 0 ||
      (existingSubmission?.attachments?.length > 0);
    if (!hasContent) {
      setError("Додайте текст, посилання або файл перед здачею.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const basePath = `/tournaments/${tournamentId}/rounds/${roundId}/tasks/${taskId}/submissions/`;
      let submission;

      if (isEdit) {
        const r = await API.patch(`${basePath}${existingSubmission.id}/`, { text: text.trim() || null });
        submission = r.data;
      } else {
        const r = await API.post(basePath, { text: text.trim() || null });
        submission = r.data;
      }

      for (const link of links.filter((l) => l._new)) {
        await API.post(`${basePath}${submission.id}/links/`, { label: link.label || link.url, url: link.url });
      }
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await API.post(`${basePath}${submission.id}/attachments/`, fd);
      }

      const fresh = await API.get(`${basePath}${submission.id}/`);
      onSaved(fresh.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.[0] || "Помилка при збереженні. Спробуйте ще раз.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.submissionForm}>
      <RichTextArea
        id="submission-text"
        rows={5}
        placeholder="Введи відповідь…"
        value={text}
        onChange={(e) => { setText(e.target.value); setError(""); }}
      />

      <div className={styles.extrasPanel}>
        {/* Посилання */}
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

        {/* Файли */}
        <div className={styles.attachSection}>
          <span className={styles.attachSectionLabel}>📎 Файли</span>
          {isEdit && existingSubmission?.attachments?.map((att) => (
            <div key={att.id} className={styles.attachItem}>
              <span className={styles.attachItemIcon}>{fileIcon(att.name)}</span>
              <span className={styles.attachItemName}>{att.name}</span>
              <span className={styles.attachItemMeta}>збережено</span>
            </div>
          ))}
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
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.editActions}>
        <button className={styles.cancelBtn} onClick={onCancel} disabled={saving}>Скасувати</button>
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? "Збереження…" : isEdit ? "Зберегти зміни" : "Здати роботу"}
        </button>
      </div>
    </div>
  );
}
