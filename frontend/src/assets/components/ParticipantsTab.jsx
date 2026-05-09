
import { useState, useEffect, useCallback } from "react";
import styles from "./styles/ParticipantsTab.module.css";
import API from "../../api";
import { X, Shield, Users, Crown, Upload, UserPlus } from "lucide-react";
import { ConfirmDeleteModal } from "./TournamentShared";

const TABS = [
  { key: "participant", label: "Учасники" },
  { key: "jury",        label: "Журі" },
  { key: "admin",       label: "Адміністратори" },
];

const ROLE_LABELS = {
  owner: "Власник", participant: "Учасник",
  jury: "Журі",     admin: "Адмін",
};

const INVITE_LABELS = {
  participant: "Запросити учасника",
  jury:        "Запросити журі",
  admin:       "Запросити адміна",
};

// ─── Повідомлення про статус реєстрації для учасників ─────────────────────────
const REGISTRATION_STATUS_BANNERS = {
  upcoming: {
    icon: "🔒",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    text: "Реєстрація ще не відкрита. Команди зможуть приєднатися після початку турніру.",
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
  finished: {
    icon: "🏁",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    text: "Турнір завершено. Реєстрація закрита.",
  },
};

// ── Аватарка учасника ─────────────────────────────────────────────────────────
function MemberAvatar({ member }) {
  const src = member.avatar
    ? (member.avatar.startsWith("http") ? member.avatar : `http://127.0.0.1:8000${member.avatar}`)
    : null;
  const initials = (member.full_name || member.username || "?")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (src) return <img src={src} alt={initials} className={styles.memberAvatar} />;
  return <div className={styles.memberAvatarPlaceholder}>{initials}</div>;
}

function getDisplayName(member) {
  const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
  return fullName || member.username || member.email || "Анонімний";
}

// ── Картка команди ────────────────────────────────────────────────────────────

function TeamCard({ team, members, myRole, myUserId, tournamentId, onTeamUpdated, onTeamDeleted }) {
  const [expanded,       setExpanded]       = useState(false);
  const [renaming,       setRenaming]       = useState(false);
  const [newName,        setNewName]        = useState(team.name);
  const [saving,         setSaving]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [addUserId,      setAddUserId]      = useState("");
  const [addError,       setAddError]       = useState("");
  const [adding,         setAdding]         = useState(false);

  const isCaptain   = team.captain_id === myUserId;
  const isPrivileged = myRole === "owner" || myRole === "admin";

  // Учасники без капітана
  const nonCaptainMembers = (team.members || []).filter(m => m.id !== team.captain_id);
  // Список вільних учасників турніру (не в жодній команді)
  const freeMembers = members.filter(m =>
    m.role === "participant" &&
    !team.members?.find(tm => tm.id === m.user)
  );

  const handleRename = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await API.patch(`/tournaments/${tournamentId}/teams/${team.id}/`, { name: newName.trim() });
      onTeamUpdated({ ...team, name: newName.trim() });
      setRenaming(false);
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/`);
      onTeamDeleted(team.id);
    } catch { } finally { setDeleting(false); }
  };

  const [asCaptain, setAsCaptain] = useState(false);

  const handleAddMember = async () => {
    if (!addUserId) return;
    setAdding(true); setAddError("");
    try {
      if (isPrivileged && asCaptain) {
        // Адмін призначає капітана через assign-member
        await API.post(`/tournaments/${tournamentId}/teams/${team.id}/assign-member/`, {
          user_id: Number(addUserId),
          as_captain: true,
        });
      } else {
        await API.post(`/tournaments/${tournamentId}/teams/${team.id}/members/`, {
          user_id: Number(addUserId),
        });
      }
      const res = await API.get(`/tournaments/${tournamentId}/teams/${team.id}/`);
      onTeamUpdated(res.data);
      setAddUserId(""); setAsCaptain(false);
    } catch (e) {
      setAddError(e?.response?.data?.detail || "Помилка додавання");
    } finally { setAdding(false); }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/members/${userId}/`);
      const res = await API.get(`/tournaments/${tournamentId}/teams/${team.id}/`);
      onTeamUpdated(res.data);
    } catch { }
  };

  const handleToggleUploadPerm = async (member) => {
    try {
      if (member.can_upload) {
        await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/upload-permission/${member.id}/`);
      } else {
        await API.post(`/tournaments/${tournamentId}/teams/${team.id}/upload-permission/`, { user_id: member.id });
      }
      const res = await API.get(`/tournaments/${tournamentId}/teams/${team.id}/`);
      onTeamUpdated(res.data);
    } catch { }
  };

  return (
    <div className={styles.teamCard}>
      {/* Заголовок команди */}
      <div className={styles.teamCardHeader} onClick={() => setExpanded(e => !e)}>
        <div className={styles.teamCardLeft}>
          <span className={styles.teamCardIcon}><Users size={15} /></span>
          {renaming ? (
            <input
              className={styles.renameInput}
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
            <button className={styles.teamActionBtn} onClick={() => setRenaming(true)} title="Перейменувати">✏️</button>
          )}
          {renaming && (
            <>
              <button className={styles.teamActionBtnSave} onClick={handleRename} disabled={saving}>
                {saving ? "…" : "✓"}
              </button>
              <button className={styles.teamActionBtn} onClick={() => { setRenaming(false); setNewName(team.name); }}>✕</button>
            </>
          )}
          {(isCaptain || isPrivileged) && !renaming && (
            <button className={styles.teamActionBtnDanger} onClick={() => setConfirmDelete(true)} title="Видалити команду">🗑</button>
          )}
          <span className={styles.expandArrow}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Розгорнутий вміст */}
      {expanded && (
        <div className={styles.teamCardBody}>
          {/* Капітан */}
          <div className={styles.teamMemberRow}>
            <Crown size={13} className={styles.captainIcon} />
            <span className={styles.teamMemberName}>{team.captain?.first_name} {team.captain?.last_name || team.captain?.username}</span>
            <span className={styles.uploadTag} title="Капітан завжди може завантажувати">
              <Upload size={11} /> Завантаження
            </span>
          </div>

          {/* Інші учасники */}
          {nonCaptainMembers.map(m => (
            <div key={m.id} className={styles.teamMemberRow}>
              <span className={styles.teamMemberName}>{m.first_name} {m.last_name || m.username}</span>

              {/* Дозвіл на завантаження — тільки капітан керує */}
              {isCaptain && (
                <button
                  className={`${styles.uploadToggle} ${m.can_upload ? styles.uploadToggleOn : ""}`}
                  onClick={() => handleToggleUploadPerm(m)}
                  title={m.can_upload ? "Забрати право завантаження" : "Дати право завантаження"}
                >
                  <Upload size={11} />
                  {m.can_upload ? "Дозвіл є" : "Дати дозвіл"}
                </button>
              )}
              {!isCaptain && m.can_upload && (
                <span className={styles.uploadTag}><Upload size={11} /> Завантаження</span>
              )}

              {/* Видалити учасника */}
              {(isCaptain || isPrivileged) && (
                <button className={styles.removeMemberBtn} onClick={() => handleRemoveMember(m.id)} title="Видалити з команди">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {/* Додати учасника (капітан або адмін/власник) */}
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

              {/* Чекбокс "Зробити капітаном" — тільки для адміна/власника */}
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
                className={styles.addMemberBtn}
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

// ── Вкладка "Команди" ─────────────────────────────────────────────────────────

function TeamsSubTab({ tournamentId, myRole, members, myUserId }) {
  const [teams,        setTeams]        = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [newTeamName,  setNewTeamName]  = useState("");
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState("");
  const [showCreate,   setShowCreate]   = useState(false);

  const isParticipant = myRole === "participant";
  const isPrivileged  = myRole === "owner" || myRole === "admin";

  // Чи юзер вже капітан
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
    setCreating(true); setCreateError("");
    try {
      const res = await API.post(`/tournaments/${tournamentId}/teams/`, { name: newTeamName.trim() });
      setTeams(prev => [...prev, res.data]);
      setNewTeamName(""); setShowCreate(false);
    } catch (e) {
      setCreateError(e?.response?.data?.detail || "Помилка створення команди");
    } finally { setCreating(false); }
  };

  if (teamsLoading) return <p className={styles.empty}>Завантаження команд…</p>;

  return (
    <div>
      {/* Кнопка "Створити команду" */}
      {(isParticipant && !alreadyCaptain) || isPrivileged ? (
        <div className={styles.createTeamBar}>
          {showCreate ? (
            <div className={styles.createTeamForm}>
              <input
                className={styles.createTeamInput}
                placeholder="Назва команди"
                value={newTeamName}
                onChange={e => { setNewTeamName(e.target.value); setCreateError(""); }}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <button className={styles.createTeamBtn} onClick={handleCreate} disabled={creating || !newTeamName.trim()}>
                {creating ? "Створення…" : "Створити"}
              </button>
              <button className={styles.cancelCreateBtn} onClick={() => { setShowCreate(false); setCreateError(""); }}>
                Скасувати
              </button>
              {createError && <span className={styles.addError}>{createError}</span>}
            </div>
          ) : (
            <button className={styles.inviteBtn} onClick={() => setShowCreate(true)}>
              + Зареєструвати команду
            </button>
          )}
        </div>
      ) : null}

      {/* Список команд */}
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

// ── Головний компонент ────────────────────────────────────────────────────────

export default function ParticipantsTab({ tournamentId, myRole, loading, tournamentType }) {
  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [activeTab,      setActiveTab]      = useState("participant");
  const [myUserId,       setMyUserId]       = useState(null);

  const [invites,      setInvites]      = useState({ participant: {}, jury: {}, admin: {} });
  const [showPin,      setShowPin]      = useState(null);
  const [copied,       setCopied]       = useState(null);
  const [regenRole,    setRegenRole]    = useState(null);
  const [regenLoading, setRegenLoading] = useState(false);

  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

  const isOwner      = myRole === "owner";
  const isTeamTourn  = tournamentType === "team";

  // Реєстрація нових учасників дозволена лише на етапі "registration"
  const canRegister = tournamentStatus === "registration";

  // ── Тимчасовий виняток реєстрації (через API) ────────────────────────────
  const [exceptionUntil,   setExceptionUntilState] = useState(null); // ISO string | null
  const [exceptionLoading, setExceptionLoading]    = useState(false);
  const [exceptionMinutes, setExceptionMinutes]    = useState(30);
  const [showException,    setShowException]       = useState(false);

  // Завантажуємо поточний стан винятку при монтуванні
  useEffect(() => {
    if (!tournamentId || !isOwner) return;
    API.get(`/tournaments/${tournamentId}/registration-exception/`)
      .then(r => { if (r.data.is_active) setExceptionUntilState(r.data.until); })
      .catch(() => {});
  }, [tournamentId, isOwner]);

  const exceptionActive = exceptionUntil && new Date() < new Date(exceptionUntil);
  const canRegisterNow  = canRegister || exceptionActive;

  // Автоматично очищаємо локально коли час вийшов
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

  const getDisplayName = (member) => {
    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
    return fullName || member.username || member.email || "Анонімний користувач";
  };

  useEffect(() => {
    if (!tournamentId) return;
    setMembersLoading(true);
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error(err))
      .finally(() => setMembersLoading(false));
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId || !isOwner) return;
    ["participant", "jury", "admin"].forEach(role => {
      API.get(`/tournaments/${tournamentId}/invite-link/?role=${role}`)
        .then(r => setInvites(prev => ({
          ...prev,
          [role]: { url: r.data.invite_url, pin: r.data.invite_pin },
        })))
        .catch(() => {});
    });
  }, [tournamentId, isOwner]);

  const handleInvite = useCallback((role) => {
    const url = invites[role]?.url;
    if (!url) return;
    const doCopy = () => {
      const el = document.createElement("textarea");
      el.value = url; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.focus(); el.select();
      try { document.execCommand("copy"); } catch { window.prompt("Скопіюйте вручну:", url); }
      document.body.removeChild(el);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).catch(doCopy);
    } else { doCopy(); }
    setCopied(role); setShowPin(role);
    setTimeout(() => setCopied(null), 2500);
  }, [invites]);

  const handleRegenerate = useCallback(async (role) => {
    if (regenRole !== role) {
      setRegenRole(role);
      setTimeout(() => setRegenRole(r => r === role ? null : r), 4000);
      return;
    }
    setRegenLoading(true); setRegenRole(null);
    try {
      const res = await API.post(`/tournaments/${tournamentId}/regenerate-pin/?role=${role}`);
      setInvites(prev => ({ ...prev, [role]: { ...prev[role], pin: res.data.invite_pin } }));
      setShowPin(role);
    } catch { } finally { setRegenLoading(false); }
  }, [regenRole, tournamentId]);

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;
    setDeletingMember(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/members/${memberToDelete.id}/`);
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch { } finally { setDeletingMember(false); }
  };

  const visibleMembers = members.filter(m =>
    m.role === activeTab || (activeTab === "participant" && m.role === "owner")
  );

  const invite     = invites[activeTab];
  const pinVisible = showPin === activeTab;
  const isCopied   = copied  === activeTab;
  const isRegen    = regenRole === activeTab;

  // Вкладки: для командного — додаємо "Команди"
  const subTabs = [
    ...TABS,
    ...(isTeamTourn ? [{ key: "teams", label: "Команди" }] : []),
  ];

  if (loading || membersLoading) return (
    <div className={styles.tabContent}><p className={styles.empty}>Завантаження...</p></div>
  // Показуємо статусний банер лише на вкладці учасників і лише для власника
  const statusBanner = isOwner && activeTab === "participant"
    ? REGISTRATION_STATUS_BANNERS[tournamentStatus]
    : null;

  // Кнопка запрошення: власник може копіювати посилання завжди,
  // але для учасників — тільки коли реєстрація відкрита
  const showInviteBtn = isOwner && (
    activeTab !== "participant" || canRegisterNow
  );

  return (
    <div className={styles.tabContent}>

      {/* Підвкладки */}
      <div className={styles.subTabs}>
        {subTabs.map(tab => {
          const count = tab.key === "teams"
            ? undefined
            : members.filter(m => m.role === tab.key || (tab.key === "participant" && m.role === "owner")).length;
          return (
            <button
              key={tab.key}
              className={`${styles.subTab} ${activeTab === tab.key ? styles.subTabActive : ""}`}
              onClick={() => { setActiveTab(tab.key); setShowPin(null); setRegenRole(null); }}
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
          {/* Заголовок + кнопка запрошення */}
          <div className={styles.participantsHeader}>
            <span className={styles.teamCount}>
              {subTabs.find(t => t.key === activeTab)?.label}: {visibleMembers.length}
            </span>
            {isOwner && activeTab !== "teams" && (
              <button
                className={styles.inviteBtn}
                onClick={() => handleInvite(activeTab)}
                disabled={!invite?.url}
              >
                {!invite?.url ? "Завантаження…" : isCopied ? "✓ Скопійовано!" : `+ ${INVITE_LABELS[activeTab]}`}
              </button>
            )}
      {/* ── Статусний банер реєстрації (тільки власнику, тільки для учасників) ── */}
      {statusBanner && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          marginBottom: 16,
          borderRadius: 12,
          fontSize: 13,
          color: statusBanner.color,
          background: statusBanner.bg,
          border: `1px solid ${statusBanner.border}`,
        }}>
          <span style={{ fontSize: 16 }}>{statusBanner.icon}</span>
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* ── Заголовок + кнопки ── */}
      <div className={styles.participantsHeader}>
        <span className={styles.teamCount}>
          {TABS.find(t => t.key === activeTab)?.label}: {visibleMembers.length}
          {activeTab === "participant" && maxParticipants
            ? ` / ${maxParticipants}`
            : ""}
        </span>

        <div className={styles.headerActions}>
          {/* Кнопка винятку — тільки ongoing/finished */}
          {isOwner && activeTab === "participant" && (tournamentStatus === "ongoing" || tournamentStatus === "finished") && (
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

          {/* Кнопка запрошення */}
          {showInviteBtn && (
            <button
              className={styles.inviteBtn}
              onClick={() => handleInvite(activeTab)}
              disabled={!invite?.url}
            >
              {!invite?.url
                ? "Завантаження…"
                : isCopied
                ? "✓ Скопійовано!"
                : `+ ${INVITE_LABELS[activeTab]}`}
            </button>
          )}

          {/* Заблокована кнопка запрошення коли реєстрація закрита */}
          {isOwner && activeTab === "participant" && !canRegisterNow && (
            <button
              className={styles.inviteBtn}
              disabled
              title={
                tournamentStatus === "upcoming"   ? "Реєстрація ще не відкрита" :
                tournamentStatus === "ongoing"    ? "Турнір розпочато — реєстрація закрита" :
                tournamentStatus === "finished"   ? "Турнір завершено" :
                "Реєстрація закрита"
              }
              style={{ opacity: 0.45, cursor: "not-allowed" }}
            >
              + {INVITE_LABELS[activeTab]}
            </button>
          )}
        </div>
      </div>

      {/* ── Панель налаштування винятку ── */}
      {showException && isOwner && activeTab === "participant" && (
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
              className={styles.exceptionConfirmBtn}
              onClick={handleActivateException}
              disabled={exceptionLoading}
            >
              {exceptionLoading ? "Збереження…" : "Активувати"}
            </button>
            <button className={styles.exceptionCancelBtn} onClick={() => setShowException(false)}>
              Скасувати
            </button>
          </div>
          <span className={styles.exceptionPanelHint}>
            Реєстрація відкриється на {exceptionMinutes} хв для всіх адмінів і закриється автоматично
          </span>
        </div>
      )}

      {/* ── PIN ── */}
      {isOwner && pinVisible && invite?.pin && (
        <div className={styles.pinSection}>
          <div className={styles.pinInfo}>
            <span className={styles.pinText}>Надайте <strong>PIN-код:</strong></span>
            <div className={styles.pinCode}>{invite.pin}</div>
          </div>
          <button
            onClick={() => handleRegenerate(activeTab)}
            disabled={regenLoading}
            className={`${styles.regenBtn} ${isRegen ? styles.regenConfirm : ""}`}
          >
            {regenLoading ? "Оновлення…" : isRegen ? "Підтвердити?" : "Змінити PIN"}
          </button>
          <div className={styles.crossIcon} onClick={() => setShowPin(null)}>
            <X size={20} />
          </div>

          {/* PIN */}
          {isOwner && pinVisible && invite?.pin && (
            <div className={styles.pinSection}>
              <div className={styles.pinInfo}>
                <span className={styles.pinText}>PIN-код: </span>
                <div className={styles.pinCode}>{invite.pin}</div>
      {/* ── Список ── */}
      <div className={styles.teamList}>
        {visibleMembers.length === 0 ? (
          <p className={styles.empty}>Список порожній.</p>
        ) : (
          visibleMembers.map((member) => (
            <div key={member.id} className={styles.teamCard}>

              <MemberAvatar member={member} />

              <div className={styles.teamInfo}>
                <span className={styles.teamName}>{getDisplayName(member)}</span>
                <span className={styles.teamMeta}>
                  {ROLE_LABELS[member.role] ?? member.role}
                  {member.user_role && ` · ${member.user_role}`}
                </span>
              </div>
              <button
                onClick={() => handleRegenerate(activeTab)}
                disabled={regenLoading}
                className={`${styles.regenBtn} ${isRegen ? styles.regenConfirm : ""}`}
              >
                {regenLoading ? "Оновлення…" : isRegen ? "Підтвердити?" : "Змінити PIN"}
              </button>
              <div className={styles.crossIcon} onClick={() => setShowPin(null)}><X size={20} /></div>
            </div>
          )}

          {/* Список учасників */}
          <div className={styles.teamList}>
            {visibleMembers.length === 0 ? (
              <p className={styles.empty}>Список порожній.</p>
            ) : visibleMembers.map(member => (
              <div key={member.id} className={styles.teamCard}>
                <MemberAvatar member={member} />
                <div className={styles.teamInfo}>
                  <span className={styles.teamName}>{getDisplayName(member)}</span>
                  <span className={styles.teamMeta}>
                    {ROLE_LABELS[member.role] ?? member.role}
                    {member.user_role && ` · ${member.user_role}`}
                  </span>
                </div>
                {isOwner && member.role !== "owner" && (
                  <button className={styles.removeBtn} onClick={() => setMemberToDelete(member)}>✕</button>
                )}
                {member.joined_at && (
                  <div className={styles.teamDate}>
                    {new Date(member.joined_at).toLocaleDateString("uk-UA")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

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
