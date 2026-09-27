import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/ParticipantsTab.module.css";
import { API, mediaUrl } from '@api';
import { X, Shield, Users, Crown, Upload, UserPlus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { ConfirmDeleteModal } from "./TournamentShared";
import { usePolling } from "@shared/hooks/usePolling";

// ─── Константи ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "participant", label: "Учасники" },
  { key: "jury",        label: "Журі" },
  { key: "admin",       label: "Адміністратори" },
];

const ROLE_LABELS = {
  owner:       "Власник",
  participant: "Учасник",
  jury:        "Журі",
  admin:       "Адмін",
};

const INVITE_LABELS = {
  participant: "Запросити учасника",
  jury:        "Запросити журі",
  admin:       "Запросити адміна",
};

const REGISTRATION_STATUS_BANNERS = {
  upcoming: {
    icon: "🔒",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    text: "Реєстрація ще не відкрита. Команди зможуть приєднатися після початку турніру.",
  },
  upcoming_open: {
    icon: "✅",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "Вільна реєстрація — команди можуть приєднуватися будь-коли до завершення турніру.",
  },
  registration: {
    icon: "✅",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "Реєстрація відкрита. Команди можуть приєднуватися до турніру.",
  },
  ongoing: {
    icon: "🏃",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "Турнір вже розпочався. Реєстрація нових команд закрита.",
  },
  ongoing_open: {
    icon: "✅",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "Вільна реєстрація — команди можуть приєднуватися будь-коли до завершення турніру.",
  },
  finished: {
    icon: "🏁",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    text: "Турнір завершено. Реєстрація закрита.",
  },
};

// ─── Утиліти ──────────────────────────────────────────────────────────────────

function getDisplayName(member) {
  const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
  return fullName || member.username || member.email || "Анонімний";
}

// ─── Аватарка учасника ────────────────────────────────────────────────────────

function MemberAvatar({ member }) {
  const src = mediaUrl(member.avatar);
  const initials = (member.full_name || member.username || "?")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (src) return <img src={src} alt={initials} className={styles.memberAvatar} />;
  return <div className={styles.memberAvatarPlaceholder}>{initials}</div>;
}

// ─── Клікабельне ім'я → профіль ─────────────────────────────────────────────

function NameLink({ userId, className, children }) {
  const navigate = useNavigate();
  if (!userId) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      className={`${className ?? ""} ${styles.nameLink}`}
      onClick={() => navigate(`/profile/${userId}`)}
    >
      {children}
    </button>
  );
}

// ─── Картка команди ───────────────────────────────────────────────────────────

function TeamCard({ team, members, myRole, myUserId, tournamentId, onTeamUpdated, onTeamDeleted }) {
  const [expanded,      setExpanded]      = useState(false);
  const [renaming,      setRenaming]      = useState(false);
  const [newName,       setNewName]       = useState(team.name);
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [addUserId,     setAddUserId]     = useState("");
  const [addError,      setAddError]      = useState("");
  const [adding,        setAdding]        = useState(false);
  const [asCaptain,     setAsCaptain]     = useState(false);

  const isCaptain    = team.captain_id === myUserId;
  // Власник і адмін можуть керувати командами
  const isPrivileged = myRole === "owner" || myRole === "admin";

  const nonCaptainMembers = (team.members || []).filter(m => m.id !== team.captain_id);
  const freeMembers = members.filter(m =>
    m.role === "participant" &&
    !team.members?.find(tm => tm.id === m.user)
  );

  const refreshTeam = async () => {
    const res = await API.get(`/tournaments/${tournamentId}/teams/${team.id}/`);
    onTeamUpdated(res.data);
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await API.patch(`/tournaments/${tournamentId}/teams/${team.id}/`, { name: newName.trim() });
      onTeamUpdated({ ...team, name: newName.trim() });
      setRenaming(false);
    } catch {
      // помилка перейменування
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/`);
      onTeamDeleted(team.id);
    } catch {
      // помилка видалення
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    setAdding(true);
    setAddError("");
    try {
      if (isPrivileged && asCaptain) {
        await API.post(`/tournaments/${tournamentId}/teams/${team.id}/assign-member/`, {
          user_id: Number(addUserId),
          as_captain: true,
        });
      } else {
        await API.post(`/tournaments/${tournamentId}/teams/${team.id}/members/`, {
          user_id: Number(addUserId),
        });
      }
      await refreshTeam();
      setAddUserId("");
      setAsCaptain(false);
    } catch (e) {
      setAddError(e?.response?.data?.detail || "Помилка додавання");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/members/${userId}/`);
      await refreshTeam();
    } catch {
      // помилка видалення учасника
    }
  };

  const handleToggleUploadPerm = async (member) => {
    try {
      if (member.can_upload) {
        await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/upload-permission/${member.id}/`);
      } else {
        await API.post(`/tournaments/${tournamentId}/teams/${team.id}/upload-permission/`, { user_id: member.id });
      }
      await refreshTeam();
    } catch {
      // помилка зміни дозволу
    }
  };

  return (
    <div className={styles.teamCard}>
      {/* Заголовок команди */}
      <div className={styles.teamCardHeader} onClick={() => setExpanded(e => !e)}>
        <div className={styles.teamCardLeft}>
          <span className={styles.teamCardIcon}><Users size={15} /></span>
          {renaming ? (
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => e.key === "Enter" && handleRename()}
              autoFocus
            />
          ) : (
            <span className={styles.teamCardName}>{team.name}</span>
          )}
          <span className={styles.teamMemberCount}>{team.members?.length || 0} уч.</span>
        </div>

        <div className={styles.teamCardRight} onClick={e => e.stopPropagation()}>
          {(isCaptain || isPrivileged) && !renaming && (
            <button className={styles.teamActionBtn} onClick={() => setRenaming(true)} title="Перейменувати"><Pencil size={14} /></button>
          )}
          {renaming && (
            <>
              <button className={styles.teamActionBtnSave} onClick={handleRename} disabled={saving}>
                {saving ? "…" : "✓"}
              </button>
              <button className={styles.teamActionBtn} onClick={() => { setRenaming(false); setNewName(team.name); }}><X size={13} /></button>
            </>
          )}
          {(isCaptain || isPrivileged) && !renaming && (
            <button className={styles.teamActionBtnDanger} onClick={() => setConfirmDelete(true)} title="Видалити команду"><Trash2 size={14} /></button>
          )}
          <span className={`${styles.expandArrow} ${expanded ? styles.expandArrowOpen : ""}`}><ChevronDown size={15} /></span>
        </div>
      </div>

      {/* Розгорнутий вміст */}
      {expanded && (
        <div className={styles.teamCardBody}>
          {/* Капітан */}
          <div className={styles.teamMemberRow}>
            <Crown size={13} className={styles.captainIcon} />
            <NameLink userId={team.captain?.id} className={styles.teamMemberName}>
              {team.captain?.first_name} {team.captain?.last_name || team.captain?.username}
            </NameLink>
            <span className={styles.uploadTag} title="Капітан завжди може завантажувати">
              <Upload size={11} /> Завантаження
            </span>
          </div>

          {/* Інші учасники */}
          {nonCaptainMembers.map(m => (
            <div key={m.id} className={styles.teamMemberRow}>
              <NameLink
                userId={typeof m.user === "object" ? m.user?.id : m.user}
                className={styles.teamMemberName}
              >
                {m.first_name} {m.last_name || m.username}
              </NameLink>

              {isCaptain ? (
                <button
                  className={`${styles.uploadToggle} ${m.can_upload ? styles.uploadToggleOn : ""}`}
                  onClick={() => handleToggleUploadPerm(m)}
                  title={m.can_upload ? "Забрати право завантаження" : "Дати право завантаження"}
                >
                  <Upload size={11} />
                  {m.can_upload ? "Дозвіл є" : "Дати дозвіл"}
                </button>
              ) : (
                m.can_upload && (
                  <span className={styles.uploadTag}><Upload size={11} /> Завантаження</span>
                )
              )}

              {(isCaptain || isPrivileged) && (
                <button
                  className={styles.removeMemberBtn}
                  onClick={() => handleRemoveMember(m.id)}
                  title="Видалити з команди"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}

          {/* Додати учасника */}
          {(isCaptain || isPrivileged) && (
            <div className={styles.addMemberRow}>
              <select
                className={styles.addMemberSelect}
                value={addUserId}
                onChange={e => { setAddUserId(e.target.value); setAddError(""); }}
              >
                <option value="">— Додати учасника —</option>
                {freeMembers.map(m => (
                  <option key={m.user} value={m.user}>
                    {`${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username}
                  </option>
                ))}
              </select>

              {isPrivileged && addUserId && (
                <label className={styles.captainCheckbox}>
                  <input
                    type="checkbox"
                    checked={asCaptain}
                    onChange={e => setAsCaptain(e.target.checked)}
                  />
                  <Crown size={12} />
                  Капітан
                </label>
              )}

              <button
                className="btn-primary btn-sm"
                onClick={handleAddMember}
                disabled={!addUserId || adding}
              >
                <UserPlus size={13} />
                {adding ? "…" : "Додати"}
              </button>
              {addError && <span className={styles.addError}>{addError}</span>}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          icon="👥"
          title="Видалити команду?"
          description={<>Команда <strong>«{team.name}»</strong> та всі її дані будуть видалені.</>}
          confirmLabel="Так, видалити"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}

// ─── Вкладка "Команди" ────────────────────────────────────────────────────────

function TeamsSubTab({ tournamentId, myRole, members, myUserId }) {
  const [teams,        setTeams]        = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [newTeamName,  setNewTeamName]  = useState("");
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState("");
  const [showCreate,   setShowCreate]   = useState(false);

  const isParticipant = myRole === "participant";
  const isPrivileged  = myRole === "owner" || myRole === "admin";
  const alreadyCaptain = teams.some(t => t.captain_id === myUserId);

  useEffect(() => {
    if (!tournamentId) return;
    setTeamsLoading(true);
    API.get(`/tournaments/${tournamentId}/teams/`)
      .then(r => setTeams(r.data))
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }, [tournamentId]);

  const handleCreate = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await API.post(`/tournaments/${tournamentId}/teams/`, { name: newTeamName.trim() });
      setTeams(prev => [...prev, res.data]);
      setNewTeamName("");
      setShowCreate(false);
    } catch (e) {
      setCreateError(e?.response?.data?.detail || "Помилка створення команди");
    } finally {
      setCreating(false);
    }
  };

  if (teamsLoading) return <p className={styles.empty}>Завантаження команд…</p>;

  const canCreate = isPrivileged || (isParticipant && !alreadyCaptain);

  return (
    <div>
      {canCreate && (
        <div className={styles.createTeamBar}>
          {showCreate ? (
            <div className={styles.createTeamForm}>
              <input
                className="input"
                placeholder="Назва команди"
                value={newTeamName}
                onChange={e => { setNewTeamName(e.target.value); setCreateError(""); }}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <button
                className="btn-primary btn-sm"
                onClick={handleCreate}
                disabled={creating || !newTeamName.trim()}
              >
                {creating ? "Створення…" : "Створити"}
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => { setShowCreate(false); setCreateError(""); }}
              >
                Скасувати
              </button>
              {createError && <span className={styles.addError}>{createError}</span>}
            </div>
          ) : (
            <button className="btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              + Зареєструвати команду
            </button>
          )}
        </div>
      )}

      {teams.length === 0 ? (
        <p className={styles.empty}>Команд ще немає. Будьте першими!</p>
      ) : (
        <div className={styles.teamList}>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              members={members}
              myRole={myRole}
              myUserId={myUserId}
              tournamentId={tournamentId}
              onTeamUpdated={updated => setTeams(prev => prev.map(t => t.id === updated.id ? updated : t))}
              onTeamDeleted={id => setTeams(prev => prev.filter(t => t.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Головний компонент ───────────────────────────────────────────────────────

export function ParticipantsTab({ tournamentId, myRole, loading, tournamentType, tournamentStatus, maxParticipants, openRegistration = false, registrationOpen, registrationReason, registrationMessage }) {
  const isTeamTourn = tournamentType === "team";

  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [activeTab,      setActiveTab]      = useState(isTeamTourn ? "jury" : "participant");
  const [myUserId,       setMyUserId]       = useState(null);

  const [invites,      setInvites]      = useState({ participant: [], jury: [], admin: [] });
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [copiedId,     setCopiedId]       = useState(null);
  const [linkName,     setLinkName]       = useState("");
  const [linkCreating, setLinkCreating]   = useState(false);
  const [linkError,    setLinkError]      = useState("");
  const [showLinks,    setShowLinks]      = useState(false);

  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

  const [exceptionUntil,   setExceptionUntilState] = useState(null);
  const [exceptionLoading, setExceptionLoading]    = useState(false);
  const [exceptionMinutes, setExceptionMinutes]    = useState(30);
  const [showException,    setShowException]       = useState(false);

  const isOwner        = myRole === "owner";
  const isPrivilegedUser = myRole === "owner" || myRole === "admin"; // може запрошувати і видаляти
  const canRegister = tournamentStatus === "registration";

  // При вільній реєстрації реєстрація відкрита завжди (крім finished)
  const isOpenAndActive = openRegistration && tournamentStatus !== "finished";

  // ── Завантаження стану винятку реєстрації ────────────────────────────────
  useEffect(() => {
    if (!tournamentId || !isOwner) return;
    API.get(`/tournaments/${tournamentId}/registration-exception/`)
      .then(r => { if (r.data.is_active) setExceptionUntilState(r.data.until); })
      .catch(() => {});
  }, [tournamentId, isOwner]);

  const exceptionActive = exceptionUntil && new Date() < new Date(exceptionUntil);
  // Джерело правди про реєстрацію — бекенд (registration_open з деталей турніру).
  // Fallback на локальний розрахунок, якщо поле відсутнє.
  const backendOpen = typeof registrationOpen === "boolean" ? registrationOpen : null;
  const fallbackOpen = canRegister || isOpenAndActive;
  const baseOpen = backendOpen ?? fallbackOpen;
  const canRegisterNow  = baseOpen || exceptionActive;

  // Автоматично очищаємо виняток після закінчення часу
  useEffect(() => {
    if (!exceptionUntil) return;
    const ms = new Date(exceptionUntil) - new Date();
    if (ms <= 0) { setExceptionUntilState(null); return; }
    const t = setTimeout(() => setExceptionUntilState(null), ms);
    return () => clearTimeout(t);
  }, [exceptionUntil]);

  const handleActivateException = async () => {
    setExceptionLoading(true);
    try {
      const r = await API.post(`/tournaments/${tournamentId}/registration-exception/`, {
        minutes: exceptionMinutes,
      });
      setExceptionUntilState(r.data.until);
      setShowException(false);
    } catch (err) {
      console.error("Помилка активації винятку:", err);
    } finally {
      setExceptionLoading(false);
    }
  };

  const handleCancelException = async () => {
    setExceptionLoading(true);
    try {
      await API.post(`/tournaments/${tournamentId}/registration-exception/`, { minutes: 0 });
      setExceptionUntilState(null);
    } catch (err) {
      console.error("Помилка скасування винятку:", err);
    } finally {
      setExceptionLoading(false);
    }
  };

  // ── Завантаження учасників ────────────────────────────────────────────────
  const fetchMembers = useCallback(() => {
    if (!tournamentId) return;
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error(err));
  }, [tournamentId]);

  // Початкове завантаження зі спінером
  useEffect(() => {
    if (!tournamentId) return;
    setMembersLoading(true);
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error(err))
      .finally(() => setMembersLoading(false));
  }, [tournamentId]);

  // Автооновлення кожні 5 секунд (без спінера)
  usePolling(fetchMembers, 5000, !!tournamentId);

  // ── Завантаження посилань-запрошень (без PIN, max 3 на роль) ──────────────
  const fetchInvites = useCallback(async () => {
    if (!tournamentId || !isPrivilegedUser) return;
    setInvitesLoading(true);
    try {
      const res = await API.get(`/tournaments/${tournamentId}/invite-links/`);
      const grouped = { participant: [], jury: [], admin: [] };
      for (const l of res.data || []) {
        if (grouped[l.role]) grouped[l.role].push(l);
      }
      setInvites(grouped);
    } catch {
      // ігнор
    } finally {
      setInvitesLoading(false);
    }
  }, [tournamentId, isPrivilegedUser]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const copyText = useCallback((text, id) => {
    const fallbackCopy = () => {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      try { document.execCommand("copy"); } catch { window.prompt("Скопіюйте вручну:", text); }
      document.body.removeChild(el);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const fullInviteUrl = (token) => `${window.location.origin}/join/${token}`;

  const handleCreateLink = useCallback(async (role) => {
    setLinkCreating(true);
    setLinkError("");
    try {
      const res = await API.post(`/tournaments/${tournamentId}/invite-links/`, {
        role, name: linkName.trim(),
      });
      setInvites((prev) => ({ ...prev, [role]: [...(prev[role] || []), res.data] }));
      setLinkName("");
    } catch (err) {
      setLinkError(err.response?.data?.detail || "Не вдалось створити посилання.");
    } finally {
      setLinkCreating(false);
    }
  }, [tournamentId, linkName]);

  const handleDeleteLink = useCallback(async (role, id) => {
    if (!window.confirm("Видалити це посилання? Старі запрошення за ним перестануть працювати.")) return;
    try {
      await API.delete(`/tournaments/${tournamentId}/invite-links/${id}/`);
      setInvites((prev) => ({ ...prev, [role]: prev[role].filter((l) => l.id !== id) }));
    } catch {
      // ігнор
    }
  }, [tournamentId]);

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;
    setDeletingMember(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/members/${memberToDelete.id}/`);
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch {
      // помилка видалення
    } finally {
      setDeletingMember(false);
    }
  };

  // ── Похідні значення ──────────────────────────────────────────────────────

  const visibleMembers = members.filter(m =>
    m.role === activeTab || (activeTab === "participant" && m.role === "owner")
  );

  const activeLinks = invites[activeTab] || [];
  const canCreateLink = activeLinks.length < 3;

  const subTabs = isTeamTourn
    ? TABS.filter(t => t.key === "jury" || t.key === "admin")
    : TABS;

  const statusBanner = isPrivilegedUser && activeTab === "participant"
    ? (() => {
        if (exceptionActive) return null; // активний виняток видно окремою кнопкою
        if (baseOpen) {
          return {
            icon: "✅",
            color: "#15803d",
            bg: "#f0fdf4",
            border: "#bbf7d0",
            text: "Реєстрація відкрита. Учасники можуть приєднуватися за посиланням або через публічний каталог.",
          };
        }
        // Закрита — показуємо конкретну причину з бекенду
        return {
          icon: "🔒",
          color: "#b45309",
          bg: "#fffbeb",
          border: "#fde68a",
          text: registrationMessage || REGISTRATION_STATUS_BANNERS[tournamentStatus]?.text
            || "Реєстрація зараз закрита.",
        };
      })()
    : null;

  const showInviteBtn = isPrivilegedUser && (activeTab !== "participant" || canRegisterNow);

  // ── Рендер ────────────────────────────────────────────────────────────────

  if (loading || membersLoading) {
    return (
      <div className={styles.tabContent}>
        <p className={styles.empty}>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>

      {/* Підвкладки */}
      <div className={styles.subTabs}>
        {subTabs.map(tab => {
          const count = tab.key === "teams"
            ? undefined
            : members.filter(m =>
                m.role === tab.key || (tab.key === "participant" && m.role === "owner")
              ).length;
          return (
            <button
              key={tab.key}
              className={`${styles.subTab} ${activeTab === tab.key ? styles.subTabActive : ""}`}
              onClick={() => { setActiveTab(tab.key); setShowLinks(false); setLinkError(""); }}
            >
              {tab.label}
              {count !== undefined && <span className={styles.subTabCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Вкладка "Команди" */}
      {activeTab === "teams" && isTeamTourn ? (
        <TeamsSubTab
          tournamentId={tournamentId}
          myRole={myRole}
          members={members}
          myUserId={myUserId}
        />
      ) : (
        <>
          {/* Статусний банер */}
          {statusBanner && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 16px",
              marginBottom: 16,
              borderRadius: 14,
              fontSize: 14,
              color: statusBanner.color,
              background: statusBanner.bg,
              border: "none",
            }}>
              <span style={{ fontSize: 17 }}>{statusBanner.icon}</span>
              <span>{statusBanner.text}</span>
            </div>
          )}

          {/* Заголовок + кнопки */}
          <div className={styles.participantsHeader}>
            <span className={styles.teamCount}>
              {TABS.find(t => t.key === activeTab)?.label}: {visibleMembers.length}
              {activeTab === "participant" && maxParticipants ? ` / ${maxParticipants}` : ""}
            </span>

            <div className={styles.headerActions}>
              {/* Кнопка винятку — тільки ongoing/finished і тільки якщо є дати реєстрації */}
              {isOwner && activeTab === "participant" && !isOpenAndActive &&
                (tournamentStatus === "ongoing" || tournamentStatus === "finished") && (
                exceptionActive ? (
                  <button
                    className={styles.exceptionActiveBtn}
                    onClick={handleCancelException}
                    disabled={exceptionLoading}
                    title="Натисніть щоб скасувати"
                  >
                    <span className={styles.exceptionDot} />
                    До {new Date(exceptionUntil).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ) : (
                  <button
                    className={styles.exceptionBtn}
                    onClick={() => setShowException(v => !v)}
                    disabled={exceptionLoading}
                  >
                    Зробити виняток
                  </button>
                )
              )}

              {/* Кнопка посилань (без PIN, до 3 на роль) */}
              {showInviteBtn && (
                <button
                  className={styles.inviteBtn}
                  onClick={() => setShowLinks((v) => !v)}
                >
                  {showLinks ? "Сховати посилання" : `Показати посилання (${activeLinks.length}/3)`}
                </button>
              )}

              {/* Заблокована кнопка запрошення з конкретною причиною */}
              {isPrivilegedUser && activeTab === "participant" && !canRegisterNow && (
                <button
                  className={styles.inviteBtn}
                  disabled
                  title={registrationMessage || "Реєстрація закрита"}
                  style={{ opacity: 0.45, cursor: "not-allowed" }}
                >
                  + {INVITE_LABELS[activeTab]}
                </button>
              )}
            </div>
          </div>

          {/* Панель налаштування винятку — тільки якщо є дати реєстрації */}
          {showException && isOwner && activeTab === "participant" && !isOpenAndActive && (
            <div className={styles.exceptionPanel}>
              <span className={styles.exceptionPanelTitle}>Тимчасово відкрити реєстрацію</span>
              <div className={styles.exceptionPanelRow}>
                <span className={styles.exceptionPanelLabel}>Тривалість:</span>
                {[15, 30, 60].map(m => (
                  <button
                    key={m}
                    className={`${styles.exceptionPill} ${exceptionMinutes === m ? styles.exceptionPillActive : ""}`}
                    onClick={() => setExceptionMinutes(m)}
                  >
                    {m} хв
                  </button>
                ))}
              </div>
              <div className={styles.exceptionPanelActions}>
                <button
                  className="btn-primary btn-sm"
                  onClick={handleActivateException}
                  disabled={exceptionLoading}
                >
                  {exceptionLoading ? "Збереження…" : "Активувати"}
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setShowException(false)}>
                  Скасувати
                </button>
              </div>
              <span className={styles.exceptionPanelHint}>
                Реєстрація відкриється на {exceptionMinutes} хв для всіх адмінів і закриється автоматично
              </span>
            </div>
          )}

          {/* Панель посилань-запрошень: тільки унікальні посилання, без PIN */}
          {isPrivilegedUser && showLinks && showInviteBtn && (
            <div style={{
              border: "none", borderRadius: 18, padding: 16,
              marginBottom: 14, background: "#f5f5f7",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, letterSpacing: "-0.01em" }}>
                {INVITE_LABELS[activeTab]} — {activeLinks.length}/3
              </div>
              {invitesLoading && <p style={{ fontSize: 13, color: "#86868b" }}>Завантаження…</p>}
              {activeLinks.map((l) => {
                const url = l.invite_url?.includes("http") ? l.invite_url : fullInviteUrl(l.token);
                return (
                  <div key={l.id} style={{
                    display: "flex", gap: 8, alignItems: "center",
                    background: "#fff", border: "none", borderRadius: 12,
                    padding: "10px 12px", marginBottom: 8, fontSize: 13,
                  }}>
                    <span style={{ fontWeight: 600, minWidth: 90 }}>{l.name || "Посилання"}</span>
                    <span style={{
                      flex: 1, overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", color: "#555",
                    }} title={url}>{url}</span>
                    <button className={styles.inviteBtn}
                      style={{ padding: "7px 14px", fontSize: 13 }}
                      onClick={() => copyText(url, l.id)}>
                      {copiedId === l.id ? "✓ Скопійовано" : "Копіювати"}
                    </button>
                    <button className={styles.removeBtn}
                      onClick={() => handleDeleteLink(activeTab, l.id)} title="Видалити"><X size={14} /></button>
                  </div>
                );
              })}
              {canCreateLink ? (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    className="input"
                    placeholder="Назва посилання (необов'язково)"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    style={{ flex: 1, fontSize: 14 }}
                  />
                  <button className="btn-primary btn-sm"
                    disabled={linkCreating}
                    onClick={() => handleCreateLink(activeTab)}>
                    {linkCreating ? "…" : "+ Створити"}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#b45309" }}>
                  Досягнуто максимум (3 посилання). Видаліть старе щоб створити нове.
                </p>
              )}
              {linkError && <p style={{ fontSize: 13, color: "#c53030" }}>{linkError}</p>}
              {!canRegisterNow && activeTab === "participant" && (
                <p style={{ fontSize: 13, color: "#b45309", marginTop: 4 }}>
                  ⚠️ {registrationMessage || "Реєстрація зараз закрита — посилання спрацюють, коли вона відкриється."}
                </p>
              )}
            </div>
          )}

          {/* Список учасників з відповідями форми реєстрації */}
          <div className={styles.teamList}>
            {visibleMembers.length === 0 ? (
              <p className={styles.empty}>Список порожній.</p>
            ) : (
              visibleMembers.map(member => (
                <div key={member.id} className={styles.teamCard} style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}>
                    <MemberAvatar member={member} />
                    <div className={styles.teamInfo}>
                      <NameLink userId={member.user} className={styles.teamName}>
                        {getDisplayName(member)}
                      </NameLink>
                      {(() => {
                        const email = member.email || member.fullusername;
                        const displayName = getDisplayName(member);
                        return email && email !== displayName ? (
                          <span className={styles.teamEmail}>{email}</span>
                        ) : null;
                      })()}
                      <span className={styles.teamMeta}>
                        {ROLE_LABELS[member.role] ?? member.role}
                        {member.user_role && ` · ${member.user_role}`}
                      </span>
                    </div>
                    {isPrivilegedUser && member.role !== "owner" && (
                      <button className={styles.removeBtn} onClick={() => setMemberToDelete(member)} title="Видалити учасника">
                        <X size={14} />
                      </button>
                    )}
                    {member.joined_at && (
                      <div className={styles.teamDate}>
                        {new Date(member.joined_at).toLocaleDateString("uk-UA")}
                      </div>
                    )}
                  </div>
                  {member.registration_display?.length > 0 && (
                    <div style={{
                      marginTop: 10, background: "#fff", border: "none",
                      borderRadius: 12, padding: "10px 12px", fontSize: 13, color: "#515154",
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>📝 Відповіді при реєстрації:</div>
                      {member.registration_display.map((a) => (
                        <div key={a.field_id} style={{ marginBottom: 2 }}>
                          <span style={{ color: "#86868b" }}>{a.label}: </span>
                          <strong>{a.value || "—"}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Модалка підтвердження видалення учасника */}
      {memberToDelete && (
        <ConfirmDeleteModal
          icon="👤"
          title="Видалити учасника?"
          description={<>Учасник <strong>{getDisplayName(memberToDelete)}</strong> буде видалений з турніру.</>}
          confirmLabel="Так, видалити"
          onConfirm={confirmRemoveMember}
          onCancel={() => setMemberToDelete(null)}
          loading={deletingMember}
        />
      )}
    </div>
  );
}
