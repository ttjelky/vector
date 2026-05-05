import { useState, useEffect } from "react";
import styles from "./styles/RoundsTab.module.css";
import API from "../../api";
import { ConfirmDeleteModal, Toast } from "./TournamentShared";
import { RoundCard } from "./RoundCard";

const EMPTY_FORM = { title: "", description: "", start_date: "", end_date: "" };

// ─── RoundsTab ────────────────────────────────────────────────────────────────

export default function RoundsTab({
  rounds: initialRounds,
  loading,
  tournamentId,
  onRoundCreated,
  readOnly = false,
  myRole,
}) {
  const [rounds,        setRounds]        = useState(initialRounds);
  const [openRound,     setOpenRound]     = useState(null);
  const [editingRound,  setEditingRound]  = useState(null);
  const [activeSection, setActiveSection] = useState({});
  const [openTask,      setOpenTask]      = useState({});
  const [taskForms,     setTaskForms]     = useState(new Set());
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState("");
  const [deleteRound,   setDeleteRound]   = useState(null);
  const [deletingRound, setDeletingRound] = useState(false);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { setRounds(initialRounds); }, [initialRounds]);

  // ── Навігація ──────────────────────────────────────────────────────────────

  const toggleRound = (id) => {
    if (editingRound === id) return;
    setOpenRound((prev) => prev === id ? null : id);
    setActiveSection((s) => ({ ...s, [id]: s[id] || "tasks" }));
  };

  const toggleEdit = (id) => {
    setEditingRound((prev) => prev === id ? null : id);
    setOpenRound(null);
  };

  const toggleTask = (roundId, taskId) =>
    setOpenTask((s) => ({ ...s, [roundId]: s[roundId] === taskId ? null : taskId }));

  const setSection = (roundId, section) =>
    setActiveSection((s) => ({ ...s, [roundId]: section }));

  // ── Форма завдання ─────────────────────────────────────────────────────────

  const openTaskForm = (roundId) => {
    setOpenRound(roundId);
    setActiveSection((s) => ({ ...s, [roundId]: "tasks" }));
    setTaskForms((prev) => new Set(prev).add(roundId));
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
      setRounds((prev) => [...prev, r.data]);
      onRoundCreated?.(r.data);
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
      setRounds((prev) => prev.filter((r) => r.id !== deleteRound.id));
      if (openRound === deleteRound.id) setOpenRound(null);
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

  // ── Рендер ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.tabContent}>
        {/* Skeleton-плейсхолдери замість тексту */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 68,
              background: "#f3f4f6",
              borderRadius: 18,
              border: "1.5px solid #e5e7eb",
              animation: "pulse 1.5s ease-in-out infinite",
              opacity: 1 - i * 0.2,
            }}
          />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>

      {/* ── Шапка вкладки ── */}
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
              Назва <span className={styles.editRequired}>*</span>
              <input
                className={styles.editInput}
                name="title"
                value={form.title}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  setFormError("");
                }}
                placeholder="Наприклад: Кваліфікація"
                autoFocus
              />
            </label>
            <label className={styles.editLabel}>
              Опис
              <textarea
                className={styles.editTextarea}
                name="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Короткий опис раунду…"
              />
            </label>
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

      {/* ── Список раундів або порожній стан ── */}
      {rounds.length === 0 ? (
        <div className={styles.emptyBlock}>
          <div className={styles.emptyBlockIcon}>🏁</div>
          <p>Раунди ще не створені</p>
          {!readOnly && (
            <p style={{ fontSize: 13, marginTop: -4, color: "#9ca3af" }}>
              Натисніть «+ Новий раунд», щоб розпочати
            </p>
          )}
        </div>
      ) : (
        <div className={styles.roundList}>
          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              tournamentId={tournamentId}
              readOnly={readOnly}
              myRole={myRole}
              isOpen={openRound === round.id}
              isEditing={editingRound === round.id}
              onToggle={() => toggleRound(round.id)}
              onEditToggle={() => toggleEdit(round.id)}
              onDeleteRequest={setDeleteRound}
              onRoundSaved={handleRoundSaved}
              onTaskCreated={handleTaskCreated}
              onTaskDeleted={handleTaskDeleted}
              openTaskId={openTask[round.id] ?? null}
              onTaskToggle={(taskId) => toggleTask(round.id, taskId)}
              activeSection={activeSection[round.id]}
              onSectionChange={(section) => setSection(round.id, section)}
              showTaskForm={taskForms.has(round.id)}
              onAddTask={() => openTaskForm(round.id)}
              onCloseTaskForm={() => closeTaskForm(round.id)}
            />
          ))}
        </div>
      )}

      {/* ── Модалки ── */}
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
