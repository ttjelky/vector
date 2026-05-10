import { useState, useEffect } from "react";
import styles from "./styles/RoundsTab.module.css";
import API from "../../api";
import { ConfirmDeleteModal, Toast } from "./TournamentShared";
import { RoundCard } from "./RoundCard";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";
import {
  formatRoundDateRange,
  roundStatus,
  getRoundStatusStyle,
} from "./tournamentHelpers";
import { RichTextArea } from "./RichTextArea";
import "./styles/richContent.css";

const EMPTY_FORM = { title: "", description: "", start_date: "", end_date: "" };

// ─── Єдина функція кольорів статусу ───────────────────────────────────────────
function getStatusColors(status) {
  const isUpcoming  = /очікує|upcoming|pending|scheduled/i.test(status);
  const isCompleted = /завершен|completed|finished|ended|closed/i.test(status);
  if (isUpcoming)  return { color: "#b45309", background: "#fffbeb", border: "#fde68a" };
  if (isCompleted) return { color: "#991b1b", background: "#fff1f2", border: "#fecdd3" };
  return { color: "#15803d", background: "#f0fdf4", border: "#bbf7d0" };
}

// ─── Icon helpers ──────────────────────────────────────────────────────────────

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 4 14 4"/>
      <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
      <path d="M6 7v5M10 7v5"/>
      <rect x="3" y="4" width="10" height="9" rx="1"/>
    </svg>
  );
}

// ─── RoundsTab ─────────────────────────────────────────────────────────────────

export default function RoundsTab({
  rounds: initialRounds,
  loading,
  tournamentId,
  onRoundCreated,
  readOnly = false,
  myRole,
  tournamentStatus,
  isTeamTournament = false,
  isTeamCaptain = true,
  teamName = null,
}) {
  const [rounds,         setRounds]         = useState(initialRounds);
  const [activeRoundId,  setActiveRoundId]  = useState(null);
  const [editingRound,   setEditingRound]   = useState(null);
  const [taskForms,      setTaskForms]      = useState(new Set());
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [saving,         setSaving]         = useState(false);
  const [formError,      setFormError]      = useState("");
  const [deleteRound,    setDeleteRound]    = useState(null);
  const [deletingRound,  setDeletingRound]  = useState(false);
  const [toast,          setToast]          = useState(null);

  // Синхронізуємо список і ставимо перший раунд активним
  useEffect(() => {
    setRounds(initialRounds);
    if (initialRounds.length > 0) {
      setActiveRoundId((prev) =>
        initialRounds.find((r) => r.id === prev) ? prev : initialRounds[0].id
      );
    }
  }, [initialRounds]);

  const activeRound = rounds.find((r) => r.id === activeRoundId) ?? null;

  // ── Права доступу ─────────────────────────────────────────────────────────
  // Власник, адмін, журі — завжди бачать усе
  const isPrivileged = !readOnly || myRole === "jury" || myRole === "admin";

  // Учасники бачать раунди лише коли турнір "ongoing" або "finished"
  const canSeeRounds = isPrivileged
    || tournamentStatus === "ongoing"
    || tournamentStatus === "finished";

  const getParticipantAccess = (round) => {
    if (isPrivileged) return { showTasks: true, canSubmit: true };
    if (!round.start_date && !round.end_date) return { showTasks: true, canSubmit: true };
    const status = roundStatus(round);
    const isUpcoming  = /очікує|upcoming|pending|scheduled/i.test(status);
    const isCompleted = /завершен|completed|finished|ended|closed/i.test(status);
    // Якщо турнір завершено — здавати не можна навіть у активному раунді
    if (tournamentStatus === "finished") return { showTasks: true, canSubmit: false };
    if (isUpcoming)  return { showTasks: false, canSubmit: false };
    if (isCompleted) return { showTasks: true,  canSubmit: false };
    return { showTasks: true, canSubmit: true };
  };

  // ── Форма завдання ─────────────────────────────────────────────────────────

  const openTaskForm = () => {
    if (!activeRoundId) return;
    setTaskForms((prev) => new Set(prev).add(activeRoundId));
  };

  const closeTaskForm = (roundId) => {
    setTaskForms((prev) => {
      const next = new Set(prev);
      next.delete(roundId);
      return next;
    });
  };

  // ── Створення раунду ───────────────────────────────────────────────────────

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
      const created = r.data;
      setRounds((prev) => [...prev, created]);
      setActiveRoundId(created.id);
      onRoundCreated?.(created);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setFormError("Помилка при створенні раунду. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  // ── Збереження / видалення раунду ─────────────────────────────────────────

  const handleRoundSaved = (updatedRound) => {
    setRounds((prev) => prev.map((r) => r.id === updatedRound.id ? updatedRound : r));
    setEditingRound(null);
  };

  const handleDeleteRound = async () => {
    if (!deleteRound) return;
    setDeletingRound(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/rounds/${deleteRound.id}/`);
      const remaining = rounds.filter((r) => r.id !== deleteRound.id);
      setRounds(remaining);
      if (activeRoundId === deleteRound.id) {
        setActiveRoundId(remaining[0]?.id ?? null);
      }
      setToast({ message: `Раунд «${deleteRound.title}» видалено`, type: "success" });
      setDeleteRound(null);
    } catch (err) {
      console.error(err);
      setToast({ message: "Помилка при видаленні раунду", type: "error" });
    } finally {
      setDeletingRound(false);
    }
  };

  // ── Завдання ───────────────────────────────────────────────────────────────

  const handleTaskCreated = (roundId, task) => {
    setRounds((prev) => prev.map((r) =>
      r.id !== roundId ? r : { ...r, tasks: [...(r.tasks || []), task] }
    ));
    closeTaskForm(roundId);
  };

  const handleTaskDeleted = (roundId, taskId) =>
    setRounds((prev) => prev.map((r) =>
      r.id !== roundId ? r : { ...r, tasks: (r.tasks || []).filter((t) => t.id !== taskId) }
    ));

  // ── Скелет завантаження ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeader}>
          <span className={styles.tabTitle}>Раунди</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton} style={{ width: 90, height: 36 }} />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeleton} style={{ opacity: 1 - i * 0.25 }} />
        ))}
      </div>
    );
  }

  // ── Блокуючий банер для учасників (upcoming / registration) ───────────────

  if (!canSeeRounds) {
    const isRegistration = tournamentStatus === "registration";
    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeader}>
          <span className={styles.tabTitle}>Раунди</span>
        </div>
        <div className={styles.upcomingNotice}>
          <span className={styles.upcomingNoticeIcon}>
            {isRegistration ? "📋" : "🔒"}
          </span>
          <p>
            {isRegistration
              ? "Раунди стануть доступні після завершення реєстрації команд."
              : "Раунди стануть доступні після початку турніру."}
          </p>
        </div>
      </div>
    );
  }

  // ── Рендер ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.tabContent}>

      {/* ── Шапка ── */}
      <div className={styles.tabHeader}>
        <span className={styles.tabTitle}>
          Раунди
          {rounds.length > 0 && (
            <span className={styles.tabCount}>{rounds.length}</span>
          )}
        </span>
        {!readOnly && !showForm && (
          <button className={styles.createRoundBtn} onClick={() => setShowForm(true)}>
            + Новий раунд
          </button>
        )}
      </div>

      {/* ── Форма нового раунду ── */}
      {showForm && (
        <div className={styles.roundFormCard}>
          <div className={styles.roundFormHeader}>
            <h3 className={styles.roundFormTitle}>Новий раунд</h3>
            <button
              className={styles.cancelBtn}
              onClick={() => { setForm(EMPTY_FORM); setFormError(""); setShowForm(false); }}
              disabled={saving}
            >
              Скасувати
            </button>
          </div>
          <div className={styles.editForm}>
            <label className={styles.editLabel}>
              Назва
              <input
                className={styles.editInput}
                name="title"
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormError(""); }}
                placeholder="Наприклад: Кваліфікація"
                autoFocus
              />
            </label>
            <div className={styles.editLabel}>
              <label>Опис</label>
              <RichTextArea
                id="new-round-description"
                rows={2}
                placeholder="Короткий опис раунду…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className={styles.editRow}>
              <label className={styles.editLabel}>
                Початок
                <input
                  className={styles.editInput}
                  type="datetime-local"
                  name="start_date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </label>
              <label className={styles.editLabel}>
                Кінець
                <input
                  className={styles.editInput}
                  type="datetime-local"
                  name="end_date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </label>
            </div>
            {formError && <p className={styles.formError}>{formError}</p>}
          </div>
          <div className={styles.editActions}>
            <button className={styles.saveBtn} onClick={handleCreate} disabled={saving}>
              {saving ? "Створення…" : "Створити раунд"}
            </button>
          </div>
        </div>
      )}

      {/* ── Порожній стан ── */}
      {rounds.length === 0 ? (
        <div className={styles.emptyBlock}>
          <div className={styles.emptyBlockIcon}>🏁</div>
          <p>Раунди ще не створені</p>
          {!readOnly && (
            <p style={{ fontSize: 13, marginTop: -4, color: "#aeaeb2" }}>
              Натисніть «+ Новий раунд», щоб розпочати
            </p>
          )}
        </div>
      ) : (
        <>
          {/* ── Pill-tabs раундів ── */}
          <div className={styles.pillTabsWrapper}>
            {rounds.map((round) => {
              const rstatus  = roundStatus(round);
              const noDates  = !round.start_date && !round.end_date;
              const sc       = getStatusColors(noDates ? "active" : rstatus);
              const isActive = round.id === activeRoundId;
              return (
                <button
                  key={round.id}
                  className={`${styles.pillTab} ${isActive ? styles.pillTabActive : ""}`}
                  onClick={() => setActiveRoundId(round.id)}
                >
                  <span
                    className={styles.pillTabDot}
                    style={{ background: isActive ? "rgba(255,255,255,0.7)" : sc.color }}
                  />
                  {round.title}
                </button>
              );
            })}
          </div>

          {/* ── Контент активного раунду ── */}
          {activeRound && (
            <div className={styles.roundContent} key={activeRound.id}>

              {/* Інформаційний банер раунду */}
              <div className={styles.roundInfoBanner}>
                <div className={styles.roundInfoRow}>
                  <div className={styles.roundInfoMeta}>
                    <span className={styles.roundInfoTitle}>{activeRound.title}</span>
                    {(activeRound.start_date || activeRound.end_date) && (
                      <span className={styles.roundInfoDate}>
                        {formatRoundDateRange(activeRound.start_date, activeRound.end_date)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Статус бейдж */}
                    {(() => {
                      const rstatus = roundStatus(activeRound);
                      const noDates = !activeRound.start_date && !activeRound.end_date;
                      const sc      = getStatusColors(noDates ? "active" : rstatus);
                      const label   = noDates ? "Завжди активний" : rstatus;
                      return (
                        <span
                          className={styles.roundStatus}
                          style={{ color: sc.color, background: sc.background, border: `1px solid ${sc.border}` }}
                        >
                          <span className={styles.statusDot} style={{ background: sc.color }} />
                          {label}
                        </span>
                      );
                    })()}
                    {/* Кнопки дій (тільки адміну) */}
                    {!readOnly && (
                      <div className={styles.roundInfoActions}>
                        <button
                          className={styles.roundIconBtn}
                          onClick={() => setEditingRound(activeRound.id)}
                          title="Редагувати раунд"
                        >
                          <EditIcon />
                        </button>
                        <button
                          className={`${styles.roundIconBtn} ${styles.roundIconBtnDanger}`}
                          onClick={() => setDeleteRound(activeRound)}
                          title="Видалити раунд"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {activeRound.description && (
                <div className={`${styles.roundInfoDesc} richContent`} dangerouslySetInnerHTML={{ __html: activeRound.description }} />
              )}

              {activeRound.tech_requirements?.length > 0 && (
                <div className={styles.roundInfoSection}>
                  <span className={styles.roundInfoSectionLabel}>Вимоги до технологій</span>
                  <div className={styles.roundTechReqGrid}>
                    {activeRound.tech_requirements.map((req, i) => (
                      <div key={i} className={styles.roundTechReqCard}>
                        <span className={styles.roundTechReqCategory}>{req.category}</span>
                        <span className={styles.roundTechReqValue}>{req.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeRound.must_have?.length > 0 && (
                <div className={styles.roundInfoSection}>
                  <span className={styles.roundInfoSectionLabel}>Must have</span>
                  <ul className={styles.roundMustHaveList}>
                    {activeRound.must_have.map((item, i) => (
                      <li key={i} className={styles.roundMustHaveItem}>
                        <span className={styles.roundMustHaveCheck}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Посилання та файли раунду */}
              {(activeRound.links?.length > 0 || activeRound.attachments?.length > 0) && (
                <div className={styles.roundMetaRow}>
                  {activeRound.links?.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.roundLink}
                    >
                      🔗 {link.label || link.url}
                    </a>
                  ))}
                  {activeRound.attachments?.map((att) => (
                    <a
                      key={att.id}
                      href={att.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.roundFile}
                    >
                      📎 {att.name}
                    </a>
                  ))}
                </div>
              )}

              {/* ── Список завдань ── */}
              {(() => {
                const { showTasks, canSubmit } = getParticipantAccess(activeRound);

                if (!showTasks) {
                  return (
                    <div className={styles.upcomingNotice}>
                      <span className={styles.upcomingNoticeIcon}>🔒</span>
                      <p>Завдання стануть доступні після початку раунду.</p>
                    </div>
                  );
                }

                return (
                  <div className={styles.taskListSection}>
                    <div className={styles.taskListHeader}>
                      <span className={styles.taskListTitle}>
                        Завдання
                        {(activeRound.tasks?.length ?? 0) > 0 && ` (${activeRound.tasks.length})`}
                      </span>
                      {!readOnly && !taskForms.has(activeRound.id) && (
                        <button className={styles.addTaskInlineBtn} onClick={openTaskForm}>
                          + Завдання
                        </button>
                      )}
                    </div>

                    {/* Банер «здача закрита» для завершеного раунду або завершеного турніру */}
                    {!canSubmit && !isPrivileged && (
                      <div className={styles.submissionClosedBanner}>
                        <span>🏁</span>
                        {tournamentStatus === "finished"
                          ? "Турнір завершено — здача робіт закрита."
                          : "Раунд завершено — здача робіт закрита."}
                      </div>
                    )}

                    {/* Інфо-банер для адміна/журі про поточний стан для учасників */}
                    {isPrivileged && (() => {
                      const noDates = !activeRound.start_date && !activeRound.end_date;
                      const status = roundStatus(activeRound);
                      const isUpcoming  = /очікує|upcoming|pending|scheduled/i.test(status);
                      const isCompleted = /завершен|completed|finished|ended|closed/i.test(status);
                      const sc = getStatusColors(noDates ? "active" : status);
                      const bannerStyle = { color: sc.color, background: sc.background, borderColor: sc.border };

                      // Якщо турнір завершено — повідомляємо про це
                      if (tournamentStatus === "finished") return (
                        <div className={styles.privilegedNoticeBanner} style={{ color: "#6b7280", background: "#f9fafb", borderColor: "#e5e7eb" }}>
                          <span>🏁</span>
                          <span>Турнір завершено — учасники бачать завдання, але <strong>не можуть здавати роботи</strong>.</span>
                        </div>
                      );
                      if (noDates) return (
                        <div className={styles.privilegedNoticeBanner} style={bannerStyle}>
                          <span>✅</span>
                          <span>Дати не вказані — учасники <strong>завжди бачать завдання і можуть здавати роботи</strong>.</span>
                        </div>
                      );
                      if (isUpcoming) return (
                        <div className={styles.privilegedNoticeBanner} style={bannerStyle}>
                          <span>👁</span>
                          <span>Учасники бачать цей раунд, але <strong>не бачать завдань</strong> — раунд ще не розпочався.</span>
                        </div>
                      );
                      if (isCompleted) return (
                        <div className={styles.privilegedNoticeBanner} style={bannerStyle}>
                          <span>🔒</span>
                          <span>Учасники бачать завдання, але <strong>не можуть здавати роботи</strong> — раунд завершено.</span>
                        </div>
                      );
                      return (
                        <div className={styles.privilegedNoticeBanner} style={bannerStyle}>
                          <span>✅</span>
                          <span>Учасники <strong>можуть здавати роботи</strong> — раунд активний.</span>
                        </div>
                      );
                    })()}

                    {(activeRound.tasks?.length ?? 0) === 0 && !taskForms.has(activeRound.id) && (
                      <p className={styles.empty}>Завдань у цьому раунді ще немає.</p>
                    )}

                    {(activeRound.tasks || []).map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        tournamentId={tournamentId}
                        roundId={activeRound.id}
                        readOnly={readOnly || !canSubmit}
                        myRole={myRole}
                        roundEndDate={activeRound.end_date}
                        canSubmit={canSubmit}
                        isTeamCaptain={isTeamCaptain}
                        teamName={isTeamTournament ? teamName : null}
                        onDeleted={(taskId) => handleTaskDeleted(activeRound.id, taskId)}
                      />
                    ))}

                    {!readOnly && taskForms.has(activeRound.id) && (
                      <TaskForm
                        roundId={activeRound.id}
                        tournamentId={tournamentId}
                        onCreated={(task) => handleTaskCreated(activeRound.id, task)}
                        onCancel={() => closeTaskForm(activeRound.id)}
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── Drawer редагування раунду ── */}
      {editingRound && (
        <RoundCard
          round={rounds.find((r) => r.id === editingRound)}
          tournamentId={tournamentId}
          onRoundSaved={handleRoundSaved}
          onEditToggle={() => setEditingRound(null)}
        />
      )}

      {/* ── Модалки / Toast ── */}
      {deleteRound && (
        <ConfirmDeleteModal
          icon="🏁"
          title="Видалити раунд?"
          description={
            <>
              Раунд <strong>«{deleteRound.title}»</strong> та всі його завдання будуть
              видалені назавжди. Цю дію не можна скасувати.
            </>
          }
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
