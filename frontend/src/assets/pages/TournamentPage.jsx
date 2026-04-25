import { useState, useEffect } from "react";
import styles from "../components/styles/TournamentPage.module.css";
import NavBar from "../components/NavBar";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";
import { STOCK_IMAGES } from "../components/TournamentCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return "Не вказано";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const toInputDatetime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
};

const computeStatus = (t) => {
  const now      = new Date();
  const regStart = t.registration_start ? new Date(t.registration_start) : null;
  const regEnd   = t.registration_end   ? new Date(t.registration_end)   : null;
  const start    = t.start_date         ? new Date(t.start_date)         : null;
  if (start    && now > start)     return "Триває";
  if (regEnd   && now > regEnd)    return "Реєстрація закрита";
  if (regStart && now >= regStart) return "Реєстрація відкрита";
  return "Очікується";
};

const formatRoundDateRange = (start, end) => {
  const s = start ? formatDate(start) : null;
  const e = end   ? formatDate(end)   : null;
  if (s && e) return `${s} — ${e}`;
  if (s)      return `З ${s}`;
  if (e)      return `До ${e}`;
  return "Дати не вказані";
};

const roundStatus = (round) => {
  const now   = new Date();
  const start = round.start_date ? new Date(round.start_date) : null;
  const end   = round.end_date   ? new Date(round.end_date)   : null;
  if (end   && now > end)    return "Завершено";
  if (start && now >= start) return "Триває";
  return "Очікується";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return <span className={styles.badge}>{status}</span>;
}

function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel, loading }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>🗑️</div>
        <h2 className={styles.modalTitle}>Видалити турнір?</h2>
        <p className={styles.modalText}>
          Ця дія незворотна. Турнір <strong>«{name}»</strong> та всі пов'язані
          дані будуть видалені назавжди.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={onCancel} disabled={loading}>Ні, не видаляти</button>
          <button className={styles.modalConfirm} onClick={onConfirm} disabled={loading}>
            {loading ? "Видалення…" : "Так, видалити"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ tournament, status, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({
    name:               tournament.name               || "",
    description:        tournament.description        || "",
    format:             tournament.format             || "",
    start_date:         toInputDatetime(tournament.start_date),
    registration_start: toInputDatetime(tournament.registration_start),
    registration_end:   toInputDatetime(tournament.registration_end),
    max_teams:          tournament.max_teams          || "",
    rules:              tournament.rules              || "",
  });

  useEffect(() => {
    setForm({
      name:               tournament.name               || "",
      description:        tournament.description        || "",
      format:             tournament.format             || "",
      start_date:         toInputDatetime(tournament.start_date),
      registration_start: toInputDatetime(tournament.registration_start),
      registration_end:   toInputDatetime(tournament.registration_end),
      max_teams:          tournament.max_teams          || "",
      rules:              tournament.rules              || "",
    });
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
      // Очищаємо порожні рядки → null для необов'язкових полів
      const payload = {
        name:               form.name.trim(),
        description:        form.description.trim(),
        format:             form.format.trim()             || null,
        start_date:         form.start_date               || null,
        registration_start: form.registration_start       || null,
        registration_end:   form.registration_end         || null,
        max_teams:          form.max_teams !== "" ? Number(form.max_teams) : null,
        rules:              form.rules.trim()              || null,
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
              Назва <span className={styles.editRequired}>*</span>
              <input className={styles.editInput} name="name" value={form.name} onChange={handleChange} />
            </label>
            <label className={styles.editLabel}>
              Опис
              <textarea className={styles.editTextarea} name="description" value={form.description} onChange={handleChange} rows={4} />
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
              Правила <span className={styles.editHint}>(кожне правило з нового рядка)</span>
              <textarea className={styles.editTextarea} name="rules" value={form.rules} onChange={handleChange} rows={5} />
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
          <button className={styles.editBtn} onClick={() => setEditing(true)}>✏️ Редагувати</button>
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

// ─── Participants Tab ─────────────────────────────────────────────────────────

function ParticipantsTab({ teams, loading }) {
  const [copied, setCopied] = useState(false);
  const handleInvite = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (loading) return <div className={styles.tabContent}><p className={styles.empty}>Завантаження...</p></div>;
  return (
    <div className={styles.tabContent}>
      <div className={styles.participantsHeader}>
        <span className={styles.teamCount}>{teams.length} команд</span>
        <button className={styles.inviteBtn} onClick={handleInvite}>
          {copied ? "✓ Скопійовано!" : "+ Запросити команду"}
        </button>
      </div>
      <div className={styles.teamList}>
        {teams.length === 0 ? (
          <p className={styles.empty}>Команд ще немає.</p>
        ) : (
          teams.map((team, idx) => (
            <div key={team.id} className={styles.teamCard}>
              <div className={styles.teamIndex}>{idx + 1}</div>
              <div className={styles.teamInfo}>
                <span className={styles.teamName}>{team.name}</span>
                {team.members != null && (
                  <span className={styles.teamMeta}>
                    {team.members} учасник{team.members === 1 ? "" : team.members < 5 ? "и" : "ів"}
                  </span>
                )}
              </div>
              {team.joinedAt && <div className={styles.teamDate}>{team.joinedAt}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Rounds Tab ───────────────────────────────────────────────────────────────

const EMPTY_ROUND_FORM = { title: "", description: "", start_date: "", end_date: "" };

function RoundsTab({ rounds, loading, tournamentId, onRoundCreated }) {
  const [openRound,     setOpenRound]     = useState(null);
  const [activeSection, setActiveSection] = useState({});
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(EMPTY_ROUND_FORM);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState("");

  const toggleRound = (id) => {
    setOpenRound(openRound === id ? null : id);
    setActiveSection((s) => ({ ...s, [id]: s[id] || "tasks" }));
  };
  const setSection = (roundId, section) =>
    setActiveSection((s) => ({ ...s, [roundId]: section }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFormError("");
  };

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
      onRoundCreated(r.data);
      setForm(EMPTY_ROUND_FORM);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setFormError("Помилка при створенні раунду. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.tabContent}><p className={styles.empty}>Завантаження...</p></div>;

  return (
    <div className={styles.tabContent}>
      {!showForm ? (
        <button className={styles.createRoundBtn} onClick={() => setShowForm(true)}>
          + Новий раунд
        </button>
      ) : (
        <div className={styles.roundFormCard}>
          <h3 className={styles.roundFormTitle}>Новий раунд</h3>
          <div className={styles.editForm}>
            <label className={styles.editLabel}>
              Назва <span className={styles.editRequired}>*</span>
              <input
                className={styles.editInput}
                name="title"
                value={form.title}
                onChange={handleChange}
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
                onChange={handleChange}
                rows={3}
                placeholder="Короткий опис раунду…"
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
            {formError && <p className={styles.formError}>{formError}</p>}
          </div>
          <div className={styles.editActions}>
            <button className={styles.cancelBtn} onClick={() => { setForm(EMPTY_ROUND_FORM); setFormError(""); setShowForm(false); }} disabled={saving}>
              Скасувати
            </button>
            <button className={styles.saveBtn} onClick={handleCreate} disabled={saving}>
              {saving ? "Створення…" : "Створити раунд"}
            </button>
          </div>
        </div>
      )}

      {rounds.length === 0 ? (
        <p className={styles.empty}>Раунди ще не створені.</p>
      ) : (
        <div className={styles.roundList}>
          {rounds.map((round) => {
            const isOpen  = openRound === round.id;
            const section = activeSection[round.id] || "tasks";
            return (
              <div key={round.id} className={`${styles.roundCard} ${isOpen ? styles.roundCardOpen : ""}`}>
                <button className={styles.roundHeader} onClick={() => toggleRound(round.id)}>
                  <div className={styles.roundHeaderLeft}>
                    <span className={styles.roundTitle}>{round.title}</span>
                    <span className={styles.roundDate}>{formatRoundDateRange(round.start_date, round.end_date)}</span>
                  </div>
                  <div className={styles.roundHeaderRight}>
                    <span className={styles.roundStatus}>{roundStatus(round)}</span>
                    <span className={styles.roundChevron}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className={styles.roundBody}>
                    <p className={styles.roundDescription}>{round.description || "Опис відсутній."}</p>
                    <div className={styles.roundTabs}>
                      {["tasks", "submissions"].map((s) => (
                        <button
                          key={s}
                          className={`${styles.roundTab} ${section === s ? styles.roundTabActive : ""}`}
                          onClick={() => setSection(round.id, s)}
                        >
                          {s === "tasks" ? "Завдання" : "Здані роботи"}
                        </button>
                      ))}
                    </div>
                    {section === "tasks" && (
                      <div className={styles.taskList}>
                        {(round.tasks || []).length === 0
                          ? <p className={styles.empty}>Завдання ще не додані.</p>
                          : round.tasks.map((task) => (
                            <div key={task.id} className={styles.taskCard}>
                              <span className={styles.taskTitle}>{task.title}</span>
                              <p className={styles.taskDesc}>{task.description}</p>
                            </div>
                          ))
                        }
                      </div>
                    )}
                    {section === "submissions" && (
                      <div className={styles.submissionList}>
                        {(round.submissions || []).length === 0
                          ? <p className={styles.empty}>Жодних здач ще немає.</p>
                          : round.submissions.map((sub, i) => (
                            <div key={i} className={styles.submissionCard}>
                              <div className={styles.submissionInfo}>
                                <span className={styles.submissionTeam}>{sub.team}</span>
                                <span className={styles.submissionFile}>📎 {sub.file}</span>
                                <span className={styles.submissionDate}>{sub.submittedAt}</span>
                              </div>
                              <span className={`${styles.submissionStatus} ${sub.status === "Перевірено" ? styles.submissionStatusDone : ""}`}>
                                {sub.status}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TournamentPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [tournament,    setTournament]    = useState(null);
  const [teams,         setTeams]         = useState([]);
  const [rounds,        setRounds]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [teamsLoading,  setTeamsLoading]  = useState(true);
  const [roundsLoading, setRoundsLoading] = useState(true);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    API.get(`/tournaments/${id}/`)
      .then(r => setTournament(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    API.get(`/tournaments/${id}/rounds/`)
      .then(r => setRounds(r.data))
      .catch(err => console.error(err))
      .finally(() => setRoundsLoading(false));

    // Підключи коли буде готовий ендпоінт teams:
    // API.get(`/tournaments/${id}/teams/`).then(r => setTeams(r.data)).finally(() => setTeamsLoading(false));
    setTeamsLoading(false);
  }, [id]);

  const handleSave = async (formData) => {
    const r = await API.patch(`/tournaments/${id}/`, formData);
    setTournament(r.data);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/tournaments/${id}/`);
      navigate("/tournaments");
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleRoundCreated = (newRound) => setRounds((prev) => [...prev, newRound]);

  if (loading)     return <div>Завантаження...</div>;
  if (!tournament) return <div>Турнір не знайдено</div>;

  const status = computeStatus(tournament);

  const coverStyle = (() => {
    if (tournament.image_mode === "stock")
      return { background: STOCK_IMAGES.find(i => i.id === tournament.stock_image)?.gradient ?? "#e0e0e0" };
    if (tournament.image_mode === "custom" && tournament.custom_image)
      return { background: "#111" };
    return { background: "#e8e8e8" };
  })();

  const tabs = [
    { id: "overview",     label: "Основна сторінка" },
    { id: "rounds",       label: "Раунди" },
    { id: "participants", label: "Учасники" },
  ];

  return (
    <NavBar>
      <div className={styles.page}>
        <div className={styles.cover} style={coverStyle}>
          {tournament.image_mode === "custom" && tournament.custom_image && (
            <img src={tournament.custom_image} alt={tournament.name} className={styles.coverImg} />
          )}
        </div>

        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.title}>{tournament.name}</h1>
              {tournament.description && (
                <p className={styles.subtitle}>
                  {tournament.description.length > 80
                    ? tournament.description.slice(0, 80) + "…"
                    : tournament.description}
                </p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        <div className={styles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {activeTab === "overview" && (
            <OverviewTab tournament={tournament} status={status} onSave={handleSave} />
          )}
          {activeTab === "rounds" && (
            <RoundsTab
              rounds={rounds}
              loading={roundsLoading}
              tournamentId={id}
              onRoundCreated={handleRoundCreated}
            />
          )}
          {activeTab === "participants" && (
            <ParticipantsTab teams={teams} loading={teamsLoading} />
          )}

          <div className={styles.dangerZone}>
            <div className={styles.dangerInfo}>
              <span className={styles.dangerTitle}>Небезпечна зона</span>
              <span className={styles.dangerHint}>Видалення турніру незворотне</span>
            </div>
            <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
              Видалити турнір
            </button>
          </div>
        </div>

        {showDelete && (
          <DeleteModal
            name={tournament.name}
            onConfirm={handleDelete}
            onCancel={() => setShowDelete(false)}
            loading={deleting}
          />
        )}
      </div>
    </NavBar>
  );
}
