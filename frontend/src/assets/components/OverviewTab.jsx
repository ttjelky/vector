import { useState, useEffect } from "react";
import styles from "./styles/OverviewTab.module.css";
import { RichTextArea } from "./CreateTournamentModal";
import { StatusBadge, InfoRow } from "./TournamentShared";
import { formatDate, toInputDatetime } from "./tournamentHelpers";

export default function OverviewTab({ tournament, status, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState(buildForm(tournament));

  useEffect(() => {
    setForm(buildForm(tournament));
  }, [tournament]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Назва турніру обов'язкова."); return; }
    setSaving(true);
    try {
      const payload = {
        name:               form.name.trim(),
        description:        form.description.trim(),
        format:             form.format.trim()       || null,
        start_date:         form.start_date          || null,
        registration_start: form.registration_start  || null,
        registration_end:   form.registration_end    || null,
        max_teams:          form.max_teams !== "" ? Number(form.max_teams) : null,
        rules:              form.rules.trim()        || null,
      };
      await onSave(payload);
      setEditing(false);
    } catch {
      setError("Помилка збереження. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  const rules = tournament.rules || "";

  if (editing) {
    return (
      <div className={styles.tabContent}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Редагування</h2>
          <div className={styles.editForm}>
            <label className={styles.editLabel}>
              Назва
              <input className={styles.editInput} name="name" value={form.name} onChange={handleChange} />
            </label>
            <label className={styles.editLabel}>
              Опис
              <RichTextArea
                name="description"
                value={form.description}
                onChange={(e) => handleChange({ target: { name: "description", value: e.target.value } })}
                rows={4}
              />
            </label>
            <label className={styles.editLabel}>
              Формат
              <input className={styles.editInput} name="format" value={form.format} onChange={handleChange} />
            </label>
            <label className={styles.editLabel}>
              Початок турніру
              <input className={styles.editInput} type="datetime-local" name="start_date" value={form.start_date} onChange={handleChange} />
            </label>
            <label className={styles.editLabel}>
              Початок реєстрації
              <input className={styles.editInput} type="datetime-local" name="registration_start" value={form.registration_start} onChange={handleChange} />
            </label>
            <label className={styles.editLabel}>
              Кінець реєстрації
              <input className={styles.editInput} type="datetime-local" name="registration_end" value={form.registration_end} onChange={handleChange} />
            </label>
            <label className={styles.editLabel}>
              Макс. команд
              <input className={styles.editInput} type="number" name="max_teams" value={form.max_teams} onChange={handleChange} min={1} />
            </label>
            <label className={styles.editLabel}>
              Правила
              <RichTextArea
                name="rules"
                value={form.rules}
                onChange={(e) => handleChange({ target: { name: "rules", value: e.target.value } })}
                rows={5}
              />
            </label>
            {error && <p className={styles.formError}>{error}</p>}
          </div>
          <div className={styles.editActions}>
            <button className={styles.cancelBtn} onClick={() => { setError(""); setEditing(false); }} disabled={saving}>
              Скасувати
            </button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Збереження…" : "Зберегти зміни"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Про турнір</h2>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>Редагувати</button>
        </div>
        <p className={styles.description}>{tournament.description || "Опис відсутній."}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Деталі</h2>
        <div className={styles.infoGrid}>
          <InfoRow label="Формат"             value={tournament.format || "Не вказано"} />
          <InfoRow label="Статус"             value={<StatusBadge status={status} />} />
          <InfoRow label="Початок турніру"    value={formatDate(tournament.start_date)} />
          <InfoRow label="Початок реєстрації" value={formatDate(tournament.registration_start)} />
          <InfoRow label="Кінець реєстрації"  value={formatDate(tournament.registration_end)} />
          {tournament.max_teams && <InfoRow label="Макс. команд" value={tournament.max_teams} />}
        </div>
      </section>

      {rules && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Правила</h2>
          <div className={styles.rulesBox}>
            {rules.split("\n").filter(Boolean).map((line, i) => (
              <p key={i} className={styles.ruleLine}>{line}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function buildForm(tournament) {
  return {
    name:               tournament.name               || "",
    description:        tournament.description        || "",
    format:             tournament.format             || "",
    start_date:         toInputDatetime(tournament.start_date),
    registration_start: toInputDatetime(tournament.registration_start),
    registration_end:   toInputDatetime(tournament.registration_end),
    max_teams:          tournament.max_teams          || "",
    rules:              tournament.rules              || "",
  };
}
