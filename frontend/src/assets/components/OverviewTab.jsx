import { useState, useEffect, useRef } from "react";
import styles from "./styles/OverviewTab.module.css";
import "./styles/richContent.css";           // ← глобальні стилі RichContent
import { ImagePicker } from "./CreateTournamentModal";
import { RichTextArea } from "./RichTextArea";
import { StatusBadge, InfoRow } from "./TournamentShared";
import { formatDate, toInputDatetime } from "./tournamentHelpers";
import { STOCK_IMAGES } from "./TournamentCard";
import API from "../../api";

// ─── Константи ────────────────────────────────────────────────────────────────

const ACCENT_COLORS = ["#5da3ea", "#4ad4a9", "#d83030", "#da83a0", "#928be1", "#e4ba80"];

const FORMAT_LABELS = { solo: "Одиночний", team: "Командний" };

// ─── RichContent — безпечний рендер HTML з редактора ─────────────────────────

/**
 * Рендерить HTML із RichTextArea.
 *
 * Стилі для таблиць, заголовків, списків тощо задані у richContent.css.
 * Клас "richContent" — глобальний (не CSS-module), щоб правила з того файлу
 * потрапляли на вкладені елементи через звичайні CSS-селектори (.richContent table і т.д.).
 */
function RichContent({ html, emptyText = "Відсутній.", className }) {
  const isEmpty =
    !html ||
    html === "<br>" ||
    html === "<p><br></p>" ||
    html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "").trim() === "";

  if (isEmpty) {
    return <p className={styles.emptyText}>{emptyText}</p>;
  }

  return (
    <div
      className={`richContent${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function OverviewTab({ tournament, status, onSave, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState(buildForm(tournament));

  const [imageMode,     setImageMode]     = useState(tournament.image_mode  || "stock");
  const [stockImage,    setStockImage]    = useState(tournament.stock_image || STOCK_IMAGES[0].id);
  const [customFile,    setCustomFile]    = useState(null);
  const [customPreview, setCustomPreview] = useState(
    tournament.image_mode === "custom" ? tournament.custom_image : null
  );

  useEffect(() => {
    setForm(buildForm(tournament));
    setImageMode(tournament.image_mode  || "stock");
    setStockImage(tournament.stock_image || STOCK_IMAGES[0].id);
    setCustomPreview(tournament.image_mode === "custom" ? tournament.custom_image : null);
    setCustomFile(null);
  }, [tournament]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Назва турніру обов'язкова."); return; }
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("name",               form.name.trim());
      payload.append("description",        form.description || "");
      payload.append("start_date",         form.start_date         || "");
      payload.append("end_date",           form.end_date           || "");
      payload.append("registration_start", form.registration_start || "");
      payload.append("registration_end",   form.registration_end   || "");
      payload.append("max_teams",          form.max_teams !== "" ? Number(form.max_teams) : "");
      payload.append("rules",              form.rules              || "");
      payload.append("image_mode",         imageMode);
      if (imageMode === "stock")                payload.append("stock_image",  stockImage);
      if (imageMode === "custom" && customFile) payload.append("custom_image", customFile);

      await onSave(payload);
      setEditing(false);
    } catch {
      setError("Помилка збереження. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  // ── Режим редагування ───────────────────────────────────────────────────────

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
            <div className={styles.editLabel}>
              Опис
              <RichTextArea
                id="description"
                name="description"
                value={form.description}
                onChange={(e) => handleChange({ target: { name: "description", value: e.target.value } })}
                rows={4}
              />
            </div>

            <ImagePicker
              imageMode={imageMode}       setImageMode={setImageMode}
              stockImage={stockImage}     setStockImage={setStockImage}
              customImage={customPreview} onCustomUpload={handleCustomUpload}
            />

            <label className={styles.editLabel}>
              Початок турніру
              <input className={styles.editInput} type="datetime-local" name="start_date" value={form.start_date} onChange={handleChange} />
            </label>
            <label className={styles.editLabel}>
              Кінець турніру
              <input className={styles.editInput} type="datetime-local" name="end_date" value={form.end_date} onChange={handleChange} min={form.start_date || undefined} />
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
              Макс. команд/учасників
              <input className={styles.editInput} type="number" name="max_teams" value={form.max_teams} onChange={handleChange} min={1} />
            </label>
            <div className={styles.editLabel}>
              Правила
              <RichTextArea
                id="rules"
                name="rules"
                value={form.rules}
                onChange={(e) => handleChange({ target: { name: "rules", value: e.target.value } })}
                rows={5}
              />
            </div>
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

  // ── Режим перегляду ─────────────────────────────────────────────────────────

  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Про турнір</h2>
          {!readOnly && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>Редагувати</button>
          )}
        </div>
        <RichContent
          html={tournament.description}
          emptyText="Опис відсутній."
          className={styles.descriptionContent}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Деталі</h2>
        <div className={styles.detailCards}>

          <div className={styles.detailCard}>
            <span className={styles.detailCardLabel}>Формат</span>
            <span className={styles.detailCardValue}>{FORMAT_LABELS[tournament.format] || "Не вказано"}</span>
          </div>

          <div className={styles.detailCard}>
            <span className={styles.detailCardLabel}>Початок турніру</span>
            <span className={styles.detailCardValue}>{formatDate(tournament.start_date) || "—"}</span>
          </div>

          <div className={styles.detailCard}>
            <span className={styles.detailCardLabel}>Кінець турніру</span>
            <span className={styles.detailCardValue}>{formatDate(tournament.end_date) || "—"}</span>
          </div>

          <div className={styles.detailCard}>
            <span className={styles.detailCardLabel}>Початок реєстрації</span>
            <span className={styles.detailCardValue}>{formatDate(tournament.registration_start) || "—"}</span>
          </div>

          <div className={styles.detailCard}>
            <span className={styles.detailCardLabel}>Кінець реєстрації</span>
            <span className={styles.detailCardValue}>{formatDate(tournament.registration_end) || "—"}</span>
          </div>

          <div className={styles.detailCard}>
            <span className={styles.detailCardLabel}>
              {tournament.format === "team" ? "Макс. команд" : "Макс. учасників"}
            </span>
            <span className={styles.detailCardValue}>{tournament.max_teams || "Без обмежень"}</span>
          </div>

          {tournament.format === "team" && (
            <div className={styles.detailCard}>
              <span className={styles.detailCardLabel}>Розмір команди</span>
              <span className={styles.detailCardValue}>
                {tournament.min_team_size && tournament.max_team_size
                  ? `${tournament.min_team_size} – ${tournament.max_team_size} гравців`
                  : tournament.max_team_size
                    ? `до ${tournament.max_team_size} гравців`
                    : "Не вказано"
                }
              </span>
            </div>
          )}

        </div>
      </section>

      {tournament.rules && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Правила</h2>
          <div className={styles.rulesBox}>
            <RichContent
              html={tournament.rules}
              emptyText="Правила відсутні."
            />
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
    start_date:         toInputDatetime(tournament.start_date),
    end_date:           toInputDatetime(tournament.end_date),
    registration_start: toInputDatetime(tournament.registration_start),
    registration_end:   toInputDatetime(tournament.registration_end),
    max_teams:          tournament.max_teams          || "",
    rules:              tournament.rules              || "",
  };
}
