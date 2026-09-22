import { useState, useEffect, useCallback, useRef } from "react";
import { API, mediaUrl } from '@api';
import styles from "../styles/TeamsTab.module.css";
import { X } from "lucide-react";
import { usePolling } from "@shared/hooks/usePolling";

const POLL_INTERVAL = 5000;

// ── Avatar helper ──────────────────────────────────────────────────────────
function Avatar({ name, avatar, size = 28 }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name ?? "?").charAt(0).toUpperCase();

  const baseStyle = {
    width:          size,
    height:         size,
    borderRadius:   "50%",
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       size * 0.42,
    fontWeight:     600,
    overflow:       "hidden",
  };

  if (avatar && !imgError) {
    const src = mediaUrl(avatar);
    if (!src) return (
      <div style={{ ...baseStyle, background: "#f0f0f0", color: "#555" }}>
        {initials}
      </div>
    );
    return (
      <div style={baseStyle}>
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, background: "#f0f0f0", color: "#555" }}>
      {initials}
    </div>
  );
}

// ── Team card ──────────────────────────────────────────────────────────────

function TeamCard({ team, tournamentId, isPrivileged, onLockToggled, onDeleted }) {
  const [expanded,      setExpanded]      = useState(false);
  const [locking,       setLocking]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const memberTotal     = 1 + (team.members ?? []).filter(m => m.status === "accepted").length;
  const acceptedMembers = (team.members ?? []).filter(m => m.status === "accepted");

  const handleLockToggle = async (e) => {
    e.stopPropagation();
    setLocking(true);
    try {
      const { data } = await API.post(
        `/tournaments/${tournamentId}/teams/${team.id}/lock/`,
        { locked: !team.roster_locked }
      );
      onLockToggled(team.id, data.roster_locked);
    } catch (err) {
      console.error("Lock toggle:", err);
    } finally {
      setLocking(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/`);
      onDeleted(team.id);
    } catch (err) {
      console.error("Delete team:", err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const toggleExpanded = () => setExpanded(v => !v);

  return (
    <div className={`${styles.teamCard} ${expanded ? styles.teamCardExpanded : ""}`}>
      <div
        className={styles.teamCardHeader}
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && toggleExpanded()}
        aria-expanded={expanded}
      >
        <div className={styles.teamCardLeft}>
          <span className={styles.teamCardChevron}>{expanded ? "▾" : "▸"}</span>
          <div>
            <span className={styles.teamCardName}>{team.name}</span>
            {team.city && <span className={styles.teamCardCity}>📍 {team.city}</span>}
          </div>
        </div>
        <div className={styles.teamCardRight}>
          <span className={styles.memberCountBadge}>👥 {memberTotal}</span>
          <span className={styles.lockIndicator}>{team.roster_locked ? "🔒" : "✏️"}</span>
        </div>
      </div>

      {expanded && (
        <div className={styles.teamCardBody}>
          {/* Капітан */}
          <div className={styles.captainRow}>
            <span className={styles.captainLabel}>Капітан</span>
            <Avatar
              name={team.captain?.full_name ?? team.captain_name}
              avatar={team.captain?.avatar}
              size={24}
            />
            <span className={styles.captainName}>
              {team.captain?.full_name ?? team.captain_name}
            </span>
            {(team.captain?.email ?? team.captain_email) && (
              <span className={styles.captainEmail}>
                {team.captain?.email ?? team.captain_email}
              </span>
            )}
          </div>

          {/* Учасники */}
          {acceptedMembers.length > 0 && (
            <div className={styles.membersList}>
              {acceptedMembers.map(m => {
                // TeamAdminSerializer повертає flat-об'єкт, TeamSerializer — m.user
                const name   = m.full_name ?? m.user?.full_name ?? "?";
                const email  = m.email     ?? m.user?.email;
                const avatar = m.avatar    ?? m.user?.avatar;
                return (
                  <div key={m.id} className={styles.memberChip}>
                    <Avatar name={name} avatar={avatar} size={26} />
                    <span className={styles.memberChipName}>{name}</span>
                    {email && <span className={styles.memberChipEmail}>{email}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {isPrivileged && (
            <div className={styles.adminActions}>
              <button
                className={`${styles.adminBtn} ${styles.lockBtn}`}
                onClick={handleLockToggle}
                disabled={locking}
              >
                {locking ? "…" : team.roster_locked ? "🔓 Розблокувати" : "🔒 Зафіксувати склад"}
              </button>

              {!confirmDelete ? (
                <button
                  className={`${styles.adminBtn} ${styles.deleteBtn}`}
                  onClick={() => setConfirmDelete(true)}
                >
                  Видалити
                </button>
              ) : (
                <div className={styles.confirmRow}>
                  <span>Видалити «{team.name}»?</span>
                  <button className={`${styles.adminBtn} ${styles.confirmDeleteBtn}`} onClick={handleDelete} disabled={deleting}>
                    {deleting ? "…" : "Так"}
                  </button>
                  <button className={`${styles.adminBtn} ${styles.cancelBtn}`} onClick={() => setConfirmDelete(false)}>
                    Ні
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export function TeamsTab({ tournamentId, myRole, tournament, tournamentStatus }) {
  const [teams,         setTeams]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [invite,        setInvite]        = useState({ url: null, pin: null });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [showPin,       setShowPin]       = useState(false);
  const [regenConfirm,  setRegenConfirm]  = useState(false);
  const [regenLoading,  setRegenLoading]  = useState(false);

  const mutatingTeamIds = useRef(new Set());

  const [exceptionUntil,   setExceptionUntilState] = useState(null);
  const [exceptionLoading, setExceptionLoading]    = useState(false);
  const [exceptionMinutes, setExceptionMinutes]    = useState(30);
  const [showException,    setShowException]       = useState(false);

  const isOwner      = myRole === "owner";
  const isPrivileged = myRole === "owner" || myRole === "admin";

  const exceptionActive = exceptionUntil && new Date() < new Date(exceptionUntil);
  // Вільна реєстрація: якщо дати не вказані — реєстрація завжди відкрита
  const noRegDates    = !tournament?.registration_start && !tournament?.registration_end;
  const canRegisterNow = tournamentStatus === "registration" || exceptionActive || noRegDates;
  const canInvite    = isOwner && canRegisterNow;

  const mergeTeams = useCallback((fresh) => {
    setTeams(prev => {
      const prevMap  = new Map(prev.map(t => [t.id, t]));
      const freshMap = new Map(fresh.map(t => [t.id, t]));

      const merged = fresh.map(freshTeam => {
        if (mutatingTeamIds.current.has(freshTeam.id)) {
          return prevMap.get(freshTeam.id) ?? freshTeam;
        }
        return freshTeam;
      });

      prev.forEach(t => {
        if (!freshMap.has(t.id) && mutatingTeamIds.current.has(t.id)) {
          merged.push(t);
        }
      });

      return merged;
    });
  }, []);

  useEffect(() => {
    API.get(`/tournaments/${tournamentId}/teams/`)
      .then(r => { setTeams(r.data); setLoading(false); })
      .catch(err => { console.error("Fetch teams:", err); setLoading(false); });
  }, [tournamentId]);

  const pollTeams = useCallback(async () => {
    try {
      const { data } = await API.get(`/tournaments/${tournamentId}/teams/`);
      mergeTeams(data);
    } catch (err) {
      console.error("Poll teams:", err);
    }
  }, [tournamentId, mergeTeams]);

  usePolling(pollTeams, POLL_INTERVAL, !loading);

  // ── Exception state fetch ────────────────────────────────────────────────

  useEffect(() => {
    if (!isOwner) return;
    API.get(`/tournaments/${tournamentId}/registration-exception/`)
      .then(r => { if (r.data.is_active) setExceptionUntilState(r.data.until); })
      .catch(() => {});
  }, [tournamentId, isOwner]);

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
      console.error("Exception:", err);
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
      console.error("Cancel exception:", err);
    } finally {
      setExceptionLoading(false);
    }
  };

  // ── Invite link ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOwner) return;
    setInviteLoading(true);
    API.get(`/tournaments/${tournamentId}/invite-link/?role=participant`)
      .then(r => setInvite({ url: r.data.invite_url, pin: r.data.invite_pin }))
      .catch(err => console.error("Fetch invite:", err))
      .finally(() => setInviteLoading(false));
  }, [tournamentId, isOwner]);

  const handleInvite = useCallback(() => {
    const { url } = invite;
    if (!url) return;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setShowPin(true);
    setTimeout(() => setCopied(false), 2500);
  }, [invite]);

  const handleRegenerate = useCallback(async () => {
    if (!regenConfirm) {
      setRegenConfirm(true);
      setTimeout(() => setRegenConfirm(false), 4000);
      return;
    }
    setRegenLoading(true);
    setRegenConfirm(false);
    try {
      const { data } = await API.post(`/tournaments/${tournamentId}/regenerate-pin/?role=participant`);
      setInvite(prev => ({ ...prev, pin: data.invite_pin }));
      setShowPin(true);
    } catch (err) {
      console.error("Regen PIN:", err);
    } finally {
      setRegenLoading(false);
    }
  }, [regenConfirm, tournamentId]);

  const handleLockToggled = useCallback((teamId, locked) => {
    mutatingTeamIds.current.add(teamId);
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, roster_locked: locked } : t));
    setTimeout(() => mutatingTeamIds.current.delete(teamId), 2000);
  }, []);

  const handleDeleted = useCallback((teamId) => {
    mutatingTeamIds.current.add(teamId);
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setTimeout(() => mutatingTeamIds.current.delete(teamId), 3000);
  }, []);

  const registered = teams.filter(t => t.status === "registered");
  const drafts     = teams.filter(t => t.status === "draft");

  const applySearch = (list) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.captain_name  ?? "").toLowerCase().includes(q) ||
      (t.captain_email ?? "").toLowerCase().includes(q)
    );
  };

  const filteredRegistered = applySearch(registered);
  const filteredDrafts     = applySearch(drafts);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        {[0, 1, 2].map(i => (
          <div key={i} className={styles.skeleton} style={{ height: 60, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{registered.length}</span>
          <span className={styles.statLabel}>зареєстровано</span>
        </div>
        {tournament?.max_teams && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{tournament.max_teams}</span>
            <span className={styles.statLabel}>ліміт</span>
          </div>
        )}
        <div className={styles.stat}>
          <span className={styles.statValue}>{teams.filter(t => t.roster_locked).length}</span>
          <span className={styles.statLabel}>зафіксовано</span>
        </div>
        {isPrivileged && drafts.length > 0 && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{drafts.length}</span>
            <span className={styles.statLabel}>чернеток</span>
          </div>
        )}
      </div>

      <div className={styles.listHeader}>
        <span className={styles.listCount}>
          {registered.length}{tournament?.max_teams ? ` / ${tournament.max_teams}` : ""} команд
        </span>
        <div className={styles.headerActions}>
          {/* Кнопка винятку — тільки коли є дати реєстрації і статус ongoing/finished */}
          {isOwner && !noRegDates && (tournamentStatus === "ongoing" || tournamentStatus === "finished") && (
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

          {isOwner && (
            <button
              className={styles.inviteBtn}
              onClick={canInvite ? handleInvite : undefined}
              disabled={inviteLoading || !invite.url || !canInvite}
              title={!canInvite
                ? tournamentStatus === "upcoming" ? "Реєстрація ще не відкрита" : "Реєстрація закрита"
                : undefined}
            >
              {inviteLoading ? "Завантаження…" : copied ? "✓ Скопійовано!" : "+ Запросити команду"}
            </button>
          )}
        </div>
      </div>

      {/* Exception panel */}
      {showException && isOwner && (
        <div className={styles.exceptionPanel}>
          <span className={styles.exceptionPanelTitle}>Тимчасово відкрити реєстрацію команд</span>
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

      {/* PIN */}
      {isOwner && showPin && invite.pin && (
        <div className={styles.pinSection}>
          <div className={styles.pinInfo}>
            <span className={styles.pinText}>PIN для команди:</span>
            <div className={styles.pinCode}>{invite.pin}</div>
          </div>
          <button
            className={`${styles.regenBtn} ${regenConfirm ? styles.regenConfirm : ""}`}
            onClick={handleRegenerate}
            disabled={regenLoading}
          >
            {regenLoading ? "Оновлення…" : regenConfirm ? "Підтвердити?" : "Змінити PIN"}
          </button>
          <button className={styles.pinClose} onClick={() => setShowPin(false)} aria-label="Закрити">
            <X size={14} />
          </button>
        </div>
      )}

      {teams.length > 4 && (
        <input
          className={styles.searchInput}
          placeholder="Пошук команди або капітана…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      )}

      {filteredRegistered.length === 0 ? (
        <div className={styles.empty}>
          {registered.length === 0
            ? "Жодної зареєстрованої команди ще немає."
            : "Команд за вашим запитом не знайдено."}
        </div>
      ) : (
        <div className={styles.teamList}>
          {filteredRegistered.map(team => (
            <TeamCard key={team.id} team={team} tournamentId={tournamentId}
              isPrivileged={isPrivileged} onLockToggled={handleLockToggled} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {isPrivileged && filteredDrafts.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ccc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Чернетки ({filteredDrafts.length})
          </div>
          <div className={styles.teamList} style={{ opacity: 0.6 }}>
            {filteredDrafts.map(team => (
              <TeamCard key={team.id} team={team} tournamentId={tournamentId}
                isPrivileged={isPrivileged} onLockToggled={handleLockToggled} onDeleted={handleDeleted} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}