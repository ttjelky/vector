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

export default function OverviewTab({ tournament, status, onSave, readOnly = false, myRole, tournamentId, isRegistered, onLeft }) {
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

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving,          setLeaving]          = useState(false);
  const [leaveError,       setLeaveError]       = useState(null);

  const tournamentEnded = tournament.end_date && new Date() > new Date(tournament.end_date);
  const canLeave = isRegistered && tournamentEnded && (myRole === "participant" || myRole === "jury");

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

  const handleLeave = async () => {
    setLeaving(true);
    setLeaveError(null);
    try {
      await API.delete(`/tournaments/${tournamentId}/leave/`);
      onLeft?.();
    } catch (err) {
      setLeaveError(err?.response?.data?.detail || "Не вдалося покинути турнір.");
      setShowLeaveConfirm(false);
    } finally {
      setLeaving(false);
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
        <div className={styles.detailGrid} {...(tournament.format === "team" ? {"data-team": true} : {})}>

          <div className={`${styles.dc} ${styles.dcBlue}`}>
            <span className={styles.dcIcon}>
              <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
            </span>
            <span className={styles.dcLabel}>Формат</span>
            <span className={styles.dcValue}>{FORMAT_LABELS[tournament.format] || "—"}</span>
          </div>

          <div className={`${styles.dc} ${styles.dcBlue}`}>
            <span className={styles.dcIcon}>
              <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </span>
            <span className={styles.dcLabel}>{tournament.format === "team" ? "Макс. команд" : "Макс. учасників"}</span>
            <span className={styles.dcValue}>{tournament.max_teams || "Без обмежень"}</span>
          </div>

          {tournament.format === "team" && (
            <div className={`${styles.dc} ${styles.dcBlue}`}>
              <span className={styles.dcIcon}>
                <svg viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 14c0-2.485 2.015-4 4.5-4s4.5 1.515 4.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10.5 10.5c1.5-.1 4 .7 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </span>
              <span className={styles.dcLabel}>Розмір команди</span>
              <span className={styles.dcValue}>
                {tournament.min_team_size && tournament.max_team_size
                  ? `${tournament.min_team_size}–${tournament.max_team_size} гравців`
                  : tournament.max_team_size
                    ? `до ${tournament.max_team_size} гравців`
                    : "—"}
              </span>
            </div>
          )}

          <div className={`${styles.dc} ${styles.dcGreen}`}>
            <span className={styles.dcIcon}>
              <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.5"/></svg>
            </span>
            <span className={styles.dcLabel}>Початок турніру</span>
            <span className={styles.dcValue}>{formatDate(tournament.start_date) || "—"}</span>
          </div>

          <div className={`${styles.dc} ${styles.dcGreen}`}>
            <span className={styles.dcIcon}>
              <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 10l2 2 4-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className={styles.dcLabel}>Кінець турніру</span>
            <span className={styles.dcValue}>{formatDate(tournament.end_date) || "—"}</span>
          </div>

          {tournament.open_registration ? (
            <div className={`${styles.dc} ${styles.dcOpenReg}`}>
              <span className={styles.dcIcon}>
                <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6v1H2.5A1.5 1.5 0 0 0 1 8.5v5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 13.5 7H12.5V6c0-2.485-2.015-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="11" r="1.25" fill="currentColor"/><path d="M5.5 7h5V6a2.5 2.5 0 0 0-5 0v1Z" fill="currentColor" opacity=".18"/></svg>
              </span>
              <span className={styles.dcLabel}>Реєстрація</span>
              <span className={styles.dcValue}>Вільна</span>
              <span className={styles.dcOpenRegHint}>Будь-коли до кінця турніру</span>
            </div>
          ) : (
            <>
              <div className={`${styles.dc} ${styles.dcOrange}`}>
                <span className={styles.dcIcon}>
                  <svg viewBox="0 0 16 16" fill="none"><path d="M10.5 2H12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="5.5" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M5 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className={styles.dcLabel}>Початок реєстрації</span>
                <span className={styles.dcValue}>{formatDate(tournament.registration_start) || "—"}</span>
              </div>

              <div className={`${styles.dc} ${styles.dcOrange}`}>
                <span className={styles.dcIcon}>
                  <svg viewBox="0 0 16 16" fill="none"><path d="M10.5 2H12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="5.5" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8v4M6 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </span>
                <span className={styles.dcLabel}>Кінець реєстрації</span>
                <span className={styles.dcValue}>{formatDate(tournament.registration_end) || "—"}</span>
              </div>
            </>
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

      {canLeave && (
        <div className={styles.leaveSection}>
          {!showLeaveConfirm ? (
            <button className={styles.leaveBtn} onClick={() => setShowLeaveConfirm(true)}>
              Покинути турнір
            </button>
          ) : (
            <div className={styles.leaveConfirm}>
              <p className={styles.leaveConfirmText}>
                Ви впевнені? Ви більше не матимете доступу до цього турніру.
              </p>
              <div className={styles.leaveConfirmActions}>
                <button className={styles.leaveBtn} onClick={handleLeave} disabled={leaving}>
                  {leaving ? "Виходжу…" : "Так, покинути"}
                </button>
                <button className={styles.leaveCancelBtn} onClick={() => setShowLeaveConfirm(false)}>
                  Скасувати
                </button>
              </div>
              {leaveError && <p className={styles.formError} style={{ marginTop: 8 }}>{leaveError}</p>}
            </div>
          )}
        </div>
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