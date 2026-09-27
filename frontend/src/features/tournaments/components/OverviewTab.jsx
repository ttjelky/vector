import { useState, useEffect, useRef } from "react";
import styles from "../styles/OverviewTab.module.css";
import "@shared/styles/richContent.css";           // ← глобальні стилі RichContent
import { RichTextArea } from "@shared/components/RichTextArea";
import { StatusBadge, InfoRow } from "./TournamentShared";
import { ScrollRow } from "@features/dashboard";
import { formatDate, toInputDatetime } from "./tournamentHelpers";
import { API } from '@api';

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

export function OverviewTab({ tournament, status, onSave, readOnly = false, myRole, tournamentId, isRegistered, onLeft, canDelete = false, onDeleteRequest, editing: editingProp, onEditingChange, coverImage, onResetCoverImage, editName, onEditNameChange }) {
  const [editingInner, setEditingInner] = useState(false);
  const editing = editingProp ?? editingInner;
  const setEditing = (v) => {
    const next = typeof v === "function" ? v(editing) : v;
    if (onEditingChange) onEditingChange(next);
    else setEditingInner(next);
  };
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState(buildForm(tournament));

  const { imageMode, stockImage, customFile, customPreview } = coverImage ?? {};

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving,          setLeaving]          = useState(false);
  const [leaveError,       setLeaveError]       = useState(null);

  const tournamentEnded = tournament.end_date && new Date() > new Date(tournament.end_date);
  const canLeave = isRegistered && tournamentEnded && (myRole === "participant" || myRole === "jury");

  useEffect(() => {
    setForm(buildForm(tournament));
  }, [tournament]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
  };

  const handleCancelEdit = () => {
    setForm(buildForm(tournament));
    onEditNameChange?.(tournament.name || "");
    onResetCoverImage?.();
    setError("");
    setEditing(false);
  };

  const handleSave = async () => {
    if (!(editName || "").trim()) { setError("Назва турніру обов'язкова."); return; }
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("name",               (editName || "").trim());
      payload.append("description",        form.description || "");
      payload.append("start_date",         form.start_date         || "");
      payload.append("end_date",           form.end_date           || "");
      if (form.open_registration) {
        payload.append("open_registration",  "true");
        payload.append("registration_start", "");
        payload.append("registration_end",   "");
      } else {
        payload.append("open_registration",  "false");
        payload.append("registration_start", form.registration_start || "");
        payload.append("registration_end",   form.registration_end   || "");
      }
      payload.append("max_teams",          form.max_teams !== "" ? Number(form.max_teams) : "");
      payload.append("min_team_size",      form.min_team_size !== "" ? Number(form.min_team_size) : "");
      payload.append("max_team_size",      form.max_team_size !== "" ? Number(form.max_team_size) : "");
      payload.append("rules",              form.rules              || "");
      payload.append("is_public",          form.is_public ? "true" : "false");
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

  const isTeam = tournament.format === "team";

  // Клік по картці в режимі редагування — фокус у її поле
  const focusControl = (e) => {
    if (e.target.closest("input, select, textarea, button")) return;
    e.currentTarget.querySelector("input, select, textarea")?.focus();
  };

  // ── Режим редагування (inline: текст — на місці, картки — по кліку) ────────

  if (editing) {
    const freeReg = !!form.open_registration;
    return (
      <div className={`${styles.tabContent} ${styles.tabContentEditing}`}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Про турнір</h2>
            <span className={styles.publicNote}>Редагування</span>
          </div>
          <RichTextArea
            id="description"
            name="description"
            value={form.description}
            onChange={(e) => handleChange({ target: { name: "description", value: e.target.value } })}
            rows={4}
          />

          <div className={styles.toggleRow}>
            <span className={styles.toggleText}>
              <span className={styles.toggleTitle}>Публічний турнір</span>
              <span className={styles.toggleHint}>Видно в каталозі, вхід в 1 клік</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.is_public}
              aria-label="Публічний турнір"
              className={`${styles.switch} ${form.is_public ? styles.switchOn : ""}`}
              onClick={() => setForm((f) => ({ ...f, is_public: !f.is_public }))}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Деталі</h2>
          <div className={styles.toggleRow}>
            <span className={styles.toggleText}>
              <span className={styles.toggleTitle}>Вільна реєстрація</span>
              <span className={styles.toggleHint}>
                {freeReg ? "Учасники долучаються будь-коли" : "Задати вікно реєстрації вручну"}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={freeReg}
              aria-label="Вільна реєстрація"
              className={`${styles.switch} ${freeReg ? styles.switchOn : ""}`}
              onClick={() => setForm((f) => ({
                ...f,
                open_registration: !f.open_registration,
                registration_start: !f.open_registration ? "" : f.registration_start,
                registration_end:   !f.open_registration ? "" : f.registration_end,
              }))}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>

          <ScrollRow classes={styles}>

            <div className={styles.dc}>
              <span className={styles.dcIcon} aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              </span>
              <span className={styles.dcText}>
                <span className={styles.dcLabel}>Формат</span>
                <span className={styles.dcValue}>{FORMAT_LABELS[tournament.format] || "—"}</span>
              </span>
            </div>

            <div className={`${styles.dc} ${styles.dcEditable}`} onClick={focusControl}>
              <span className={styles.dcIcon} aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </span>
              <span className={styles.dcText}>
                <span className={styles.dcLabel}>{isTeam ? "Макс. команд" : "Макс. учасників"}</span>
                <input
                  className={styles.dcInput}
                  type="number"
                  name="max_teams"
                  value={form.max_teams}
                  onChange={handleChange}
                  min={1}
                  placeholder="Без обмежень"
                  aria-label={isTeam ? "Макс. команд" : "Макс. учасників"}
                />
              </span>
            </div>

            {isTeam && (
              <div className={`${styles.dc} ${styles.dcEditable}`} onClick={focusControl}>
                <span className={styles.dcIcon} aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 14c0-2.485 2.015-4 4.5-4s4.5 1.515 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10.5 10.5c1.5-.1 4 .7 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </span>
                <span className={styles.dcText}>
                  <span className={styles.dcLabel}>Розмір команди</span>
                  <span className={styles.dcTeamInputs}>
                    <input
                      className={styles.dcInput}
                      type="number"
                      name="min_team_size"
                      value={form.min_team_size}
                      onChange={handleChange}
                      min={1}
                      placeholder="мін"
                      aria-label="Мінімальний розмір команди"
                    />
                    <span className={styles.dcDash} aria-hidden="true">–</span>
                    <input
                      className={styles.dcInput}
                      type="number"
                      name="max_team_size"
                      value={form.max_team_size}
                      onChange={handleChange}
                      min={1}
                      placeholder="макс"
                      aria-label="Максимальний розмір команди"
                    />
                  </span>
                </span>
              </div>
            )}

            <div className={`${styles.dc} ${styles.dcEditable}`} onClick={focusControl}>
              <span className={styles.dcIcon} aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              </span>
              <span className={styles.dcText}>
                <span className={styles.dcLabel}>Початок турніру</span>
                <input
                  className={`${styles.dcInput} ${styles.dcInputDate}`}
                  type="datetime-local"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  aria-label="Початок турніру"
                />
              </span>
            </div>

            <div className={`${styles.dc} ${styles.dcEditable}`} onClick={focusControl}>
              <span className={styles.dcIcon} aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 10l2 2 4-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className={styles.dcText}>
                <span className={styles.dcLabel}>Кінець турніру</span>
                <input
                  className={`${styles.dcInput} ${styles.dcInputDate}`}
                  type="datetime-local"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  min={form.start_date || undefined}
                  aria-label="Кінець турніру"
                />
              </span>
            </div>

            {freeReg ? (
              <div className={styles.dc}>
                <span className={styles.dcIcon} aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6v1H2.5A1.5 1.5 0 0 0 1 8.5v5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 13.5 7H12.5V6c0-2.485-2.015-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="11" r="1.25" fill="currentColor"/></svg>
                </span>
                <span className={styles.dcText}>
                  <span className={styles.dcLabel}>Реєстрація</span>
                  <span className={styles.dcValue}>Вільна</span>
                </span>
              </div>
            ) : (
              <>
                <div className={`${styles.dc} ${styles.dcEditable}`} onClick={focusControl}>
                  <span className={styles.dcIcon} aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none"><path d="M10.5 2H12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="5.5" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span className={styles.dcText}>
                    <span className={styles.dcLabel}>Початок реєстрації</span>
                    <input
                      className={`${styles.dcInput} ${styles.dcInputDate}`}
                      type="datetime-local"
                      name="registration_start"
                      value={form.registration_start}
                      onChange={handleChange}
                      aria-label="Початок реєстрації"
                    />
                  </span>
                </div>

                <div className={`${styles.dc} ${styles.dcEditable}`} onClick={focusControl}>
                  <span className={styles.dcIcon} aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none"><path d="M10.5 2H12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="5.5" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M8 8v4M6 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </span>
                  <span className={styles.dcText}>
                    <span className={styles.dcLabel}>Кінець реєстрації</span>
                    <input
                      className={`${styles.dcInput} ${styles.dcInputDate}`}
                      type="datetime-local"
                      name="registration_end"
                      value={form.registration_end}
                      onChange={handleChange}
                      aria-label="Кінець реєстрації"
                    />
                  </span>
                </div>
              </>
            )}

          </ScrollRow>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Правила</h2>
          <RichTextArea
            id="rules"
            name="rules"
            value={form.rules}
            onChange={(e) => handleChange({ target: { name: "rules", value: e.target.value } })}
            rows={5}
          />
          {error && <p className={styles.formError}>{error}</p>}
        </section>

        <div className={styles.editActions}>
          <button className="btn-secondary" onClick={handleCancelEdit} disabled={saving}>
            Скасувати
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Збереження…" : "Зберегти зміни"}
          </button>
        </div>
      </div>
    );
  }

  // ── Режим перегляду ─────────────────────────────────────────────────────────

  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Про турнір</h2>
          {tournament.is_public && (
            <span className={styles.publicNote}>Публічний</span>
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
        <ScrollRow classes={styles}>

          <div className={styles.dc}>
            <span className={styles.dcIcon} aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
            </span>
            <span className={styles.dcText}>
              <span className={styles.dcLabel}>Формат</span>
              <span className={styles.dcValue}>{FORMAT_LABELS[tournament.format] || "—"}</span>
            </span>
          </div>

          <div className={styles.dc}>
            <span className={styles.dcIcon} aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </span>
            <span className={styles.dcText}>
              <span className={styles.dcLabel}>{tournament.format === "team" ? "Макс. команд" : "Макс. учасників"}</span>
              <span className={styles.dcValue}>{tournament.max_teams || "Без обмежень"}</span>
            </span>
          </div>

          {tournament.format === "team" && (
            <div className={styles.dc}>
              <span className={styles.dcIcon} aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 14c0-2.485 2.015-4 4.5-4s4.5 1.515 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10.5 10.5c1.5-.1 4 .7 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </span>
              <span className={styles.dcText}>
                <span className={styles.dcLabel}>Розмір команди</span>
                <span className={styles.dcValue}>
                  {tournament.min_team_size && tournament.max_team_size
                    ? `${tournament.min_team_size}–${tournament.max_team_size} гравців`
                    : tournament.max_team_size
                      ? `до ${tournament.max_team_size} гравців`
                      : "—"}
                </span>
              </span>
            </div>
          )}

          <div className={styles.dc}>
            <span className={styles.dcIcon} aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.4"/></svg>
            </span>
            <span className={styles.dcText}>
              <span className={styles.dcLabel}>Початок турніру</span>
              <span className={styles.dcValue}>{formatDate(tournament.start_date) || "—"}</span>
            </span>
          </div>

          <div className={styles.dc}>
            <span className={styles.dcIcon} aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 10l2 2 4-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className={styles.dcText}>
              <span className={styles.dcLabel}>Кінець турніру</span>
              <span className={styles.dcValue}>{formatDate(tournament.end_date) || "—"}</span>
            </span>
          </div>

          {(tournament.open_registration || (!tournament.registration_start && !tournament.registration_end)) ? (
            <div className={styles.dc}>
              <span className={styles.dcIcon} aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6v1H2.5A1.5 1.5 0 0 0 1 8.5v5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 13.5 7H12.5V6c0-2.485-2.015-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="11" r="1.25" fill="currentColor"/></svg>
              </span>
              <span className={styles.dcText}>
                <span className={styles.dcLabel}>Реєстрація</span>
                <span className={styles.dcValue}>
                  Вільна
                </span>
              </span>
            </div>
          ) : (
            <>
              <div className={styles.dc}>
                <span className={styles.dcIcon} aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none"><path d="M10.5 2H12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="5.5" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M5 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className={styles.dcText}>
                  <span className={styles.dcLabel}>Початок реєстрації</span>
                  <span className={styles.dcValue}>{formatDate(tournament.registration_start) || "—"}</span>
                </span>
              </div>

              <div className={styles.dc}>
                <span className={styles.dcIcon} aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none"><path d="M10.5 2H12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="5.5" y="1" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M8 8v4M6 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </span>
                <span className={styles.dcText}>
                  <span className={styles.dcLabel}>Кінець реєстрації</span>
                  <span className={styles.dcValue}>{formatDate(tournament.registration_end) || "—"}</span>
                </span>
              </div>
            </>
          )}

        </ScrollRow>
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

      {(!readOnly || canDelete) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Дії</h2>
          <div className={styles.actionsRow}>
            {!readOnly && (
              <button className={styles.actionEdit} onClick={() => setEditing(true)}>
                Редагувати
              </button>
            )}
            {canDelete && (
              <button className={styles.actionDelete} onClick={() => onDeleteRequest?.()}>
                Видалити турнір
              </button>
            )}
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
                <button className="btn-secondary btn-sm" onClick={() => setShowLeaveConfirm(false)}>
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
    description:        tournament.description        || "",
    start_date:         toInputDatetime(tournament.start_date),
    end_date:           toInputDatetime(tournament.end_date),
    registration_start: toInputDatetime(tournament.registration_start),
    registration_end:   toInputDatetime(tournament.registration_end),
    open_registration:  !!(tournament.open_registration || (!tournament.registration_start && !tournament.registration_end)),
    max_teams:          tournament.max_teams          ?? "",
    min_team_size:      tournament.min_team_size      ?? "",
    max_team_size:      tournament.max_team_size      ?? "",
    rules:              tournament.rules              || "",
    is_public:          !!tournament.is_public,
  };
}