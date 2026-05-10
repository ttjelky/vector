// src/tournament/components/TeamsTab.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import API from "../../api";
import styles from "./styles/TeamsTab.module.css";
import { X } from "lucide-react";
import { usePolling } from "../../usePolling";

const POLL_INTERVAL = 5000; // мс

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
          <div className={styles.captainRow}>
            <span className={styles.captainLabel}>Капітан</span>
            <span className={styles.captainName}>{team.captain_name}</span>
            {team.captain_email && (
              <span className={styles.captainEmail}>{team.captain_email}</span>
            )}
          </div>

          {acceptedMembers.length > 0 && (
            <div className={styles.membersList}>
              {acceptedMembers.map(m => (
                <div key={m.id} className={styles.memberChip}>
                  <span className={styles.memberChipAvatar}>{(m.full_name || "?").charAt(0)}</span>
                  <span className={styles.memberChipName}>{m.full_name}</span>
                  {m.email && <span className={styles.memberChipEmail}>{m.email}</span>}
                </div>
              ))}
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

export default function TeamsTab({ tournamentId, myRole, tournament, tournamentStatus }) {
  const [teams,         setTeams]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [invite,        setInvite]        = useState({ url: null, pin: null });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [showPin,       setShowPin]       = useState(false);
  const [regenConfirm,  setRegenConfirm]  = useState(false);
  const [regenLoading,  setRegenLoading]  = useState(false);

  // Зберігаємо id команд, що зараз редагуються — не перезаписуємо їх під час polling
  const mutatingTeamIds = useRef(new Set());

  const isOwner      = myRole === "owner";
  const isPrivileged = myRole === "owner" || myRole === "admin";
  const canInvite    = isOwner && tournamentStatus === "registration";

  // ── Merge свіжих даних з сервера з локальним станом ──────────────────────
  //
  // Правила злиття:
  //  • Нові команди (яких ще нема локально) — додаємо.
  //  • Видалені на сервері команди — прибираємо (якщо не у mutatingTeamIds).
  //  • Існуючі команди — оновлюємо поля, але:
  //      – якщо команда зараз мутується (lock / delete) — пропускаємо,
  //        щоб не скидати оптимістичний UI.

  const mergeTeams = useCallback((fresh) => {
    setTeams(prev => {
      const prevMap = new Map(prev.map(t => [t.id, t]));
      const freshMap = new Map(fresh.map(t => [t.id, t]));

      // Оновлення + нові
      const merged = fresh.map(freshTeam => {
        if (mutatingTeamIds.current.has(freshTeam.id)) {
          // Не перезаписуємо команду, яку зараз змінює користувач
          return prevMap.get(freshTeam.id) ?? freshTeam;
        }
        return freshTeam;
      });

      // Команди, що є локально але відсутні на сервері — видалені
      // (і не в процесі мутації)
      // merged вже не містить видалених — це правильно.
      // Але якщо команда мутується (наприклад, видаляється) — лишаємо її тимчасово
      prev.forEach(t => {
        if (!freshMap.has(t.id) && mutatingTeamIds.current.has(t.id)) {
          merged.push(t);
        }
      });

      return merged;
    });
  }, []);

  // ── Початкове завантаження ────────────────────────────────────────────────

  useEffect(() => {
    API.get(`/tournaments/${tournamentId}/teams/`)
      .then(r => { setTeams(r.data); setLoading(false); })
      .catch(err => { console.error("Fetch teams:", err); setLoading(false); });
  }, [tournamentId]);

  // ── Polling ───────────────────────────────────────────────────────────────

  const pollTeams = useCallback(async () => {
    try {
      const { data } = await API.get(`/tournaments/${tournamentId}/teams/`);
      mergeTeams(data);
    } catch (err) {
      console.error("Poll teams:", err);
    }
  }, [tournamentId, mergeTeams]);

  // Polling активний тільки після першого завантаження
  usePolling(pollTeams, POLL_INTERVAL, !loading);

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

  // ── Callbacks з захистом від polling-перезапису ───────────────────────────

  const handleLockToggled = useCallback((teamId, locked) => {
    mutatingTeamIds.current.add(teamId);
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, roster_locked: locked } : t));
    // Через 2 секунди дозволяємо polling знову оновлювати цю команду
    setTimeout(() => mutatingTeamIds.current.delete(teamId), 2000);
  }, []);

  const handleDeleted = useCallback((teamId) => {
    mutatingTeamIds.current.add(teamId);
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setTimeout(() => mutatingTeamIds.current.delete(teamId), 3000);
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────

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

      {/* Stats */}
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

      {/* Header */}
      <div className={styles.listHeader}>
        <span className={styles.listCount}>
          {registered.length}{tournament?.max_teams ? ` / ${tournament.max_teams}` : ""} команд
        </span>
        <div className={styles.headerActions}>
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

      {/* Search */}
      {teams.length > 4 && (
        <input
          className={styles.searchInput}
          placeholder="Пошук команди або капітана…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      )}

      {/* Registered */}
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

      {/* Drafts */}
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
