import { useState, useEffect, useCallback, useRef } from "react";
import { API, mediaUrl } from '@api';
import { CreateTeamForm } from "./CreateTeamForm";
import styles from "../styles/MyTeamTab.module.css";
import { usePolling } from "@shared/hooks/usePolling";

const POLL_INTERVAL = 5000; // мс

// ── Utilities ──────────────────────────────────────────────────────────────

function registrationStatusMeta(status) {
  const MAP = {
    open:        { text: "Реєстрація відкрита",    color: "green" },
    closed:      { text: "Реєстрацію закрито",     color: "red"   },
    not_started: { text: "Реєстрація не відкрита", color: "amber" },
  };
  return MAP[status] ?? { text: status, color: "gray" };
}

function pluralMembers(n) {
  if (n === 1) return "учасника";
  if (n >= 2 && n <= 4) return "учасники";
  return "учасників";
}

// ── Base UI ────────────────────────────────────────────────────────────────

function Avatar({ name, avatar, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name ?? "?").charAt(0).toUpperCase();

  const src = mediaUrl(avatar);
  if (src && !imgError) {
    return (
      <div className={`${styles.avatar} ${styles[`avatar_${size}`]}`} style={{ padding: 0, overflow: "hidden" }}>
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.avatar} ${styles[`avatar_${size}`]}`}>
      {initials}
    </div>
  );
}

function Badge({ children, color = "gray" }) {
  return <span className={`${styles.badge} ${styles[`badge_${color}`]}`}>{children}</span>;
}

function SectionLabel({ children }) {
  return <div className={styles.sectionLabel}>{children}</div>;
}

function Card({ children, className }) {
  return <div className={`${styles.card} ${className ?? ""}`}>{children}</div>;
}

// ── Roster progress ────────────────────────────────────────────────────────

function RosterProgress({ current, min, max }) {
  const enough = current >= (min ?? 1);
  const pct    = min ? Math.min(100, Math.round((current / min) * 100)) : 100;

  return (
    <div className={styles.rosterProgress}>
      <div className={styles.rosterProgressRow}>
        <span className={styles.rosterLabel}>Учасників у команді</span>
        <span className={`${styles.rosterCount} ${enough ? styles.rosterCountOk : ""}`}>
          {current}
          {min && <> / мін.&nbsp;{min}</>}
          {max && <span className={styles.rosterMax}>&nbsp;(макс.&nbsp;{max})</span>}
        </span>
      </div>
      {min && (
        <div className={styles.rosterBar}>
          <div
            className={`${styles.rosterFill} ${enough ? styles.rosterFillOk : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {!enough && min && (
        <p className={styles.rosterHint}>
          Ще <strong>{min - current}</strong> {pluralMembers(min - current)} потрібно прийняти запрошення
        </p>
      )}
    </div>
  );
}

// ── Member row ─────────────────────────────────────────────────────────────

function MemberRow({ member, canRemove, onRemove, isRemoving }) {
  const isPending = member.status === "pending";
  const { full_name, email } = member.user;

  return (
    <div className={`${styles.memberRow} ${isPending ? styles.memberRowPending : ""}`}>
      <Avatar name={full_name} avatar={member.user?.avatar} size="sm" />
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>{full_name}</span>
        <span className={styles.memberEmail}>{email}</span>
      </div>
      {isPending && <Badge color="amber">очікує</Badge>}
      {canRemove && (
        <button
          className={styles.iconBtn}
          onClick={() => onRemove(member.id)}
          disabled={isRemoving}
          title="Видалити із команди"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── Invite link (copy + show PIN) ─────────────────────────────────────────

function InviteLink({ token }) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const url = `${window.location.origin}/team-invite/${token}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className={styles.inviteLinkWrap}>
      <div className={styles.inviteLinkRow}>
        <span className={styles.inviteLinkLabel}>Посилання для запрошення:</span>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
          onClick={handleCopy}
        >
          {copied ? "✓ Скопійовано!" : "Копіювати посилання"}
        </button>
      </div>
    </div>
  );
}

// ── Register block ─────────────────────────────────────────────────────────

function RegisterBlock({ team, tournamentId, onRegistered }) {
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { can_register, member_count } = team;
  const min      = team.tournament?.min_team_size;
  const shortage = min ? Math.max(0, min - member_count) : 0;

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post(`/tournaments/${tournamentId}/teams/${team.id}/register/`);
      onRegistered(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Не вдалося зареєструвати команду.");
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (showConfirm) {
    return (
      <div className={styles.confirmBox}>
        <p className={styles.confirmText}>
          Після реєстрації склад зафіксується і ви не зможете змінювати учасників. Продовжити?
        </p>
        <div className={styles.confirmActions}>
          <button className={styles.btnDestructive} onClick={handleRegister} disabled={loading}>
            {loading ? "Реєстрація…" : "Так, зареєструвати"}
          </button>
          <button className={styles.btnGhost} onClick={() => setShowConfirm(false)}>
            Скасувати
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        className={`${styles.btnRegister} ${!can_register ? styles.btnRegisterDisabled : ""}`}
        onClick={() => can_register && setShowConfirm(true)}
        disabled={!can_register}
      >
        Приєднати команду до турніру
      </button>
      {shortage > 0 && (
        <p className={styles.registerHint}>
          Чекайте, поки ще <strong>{shortage} {pluralMembers(shortage)}</strong> приймуть запрошення (мінімум {min}).
        </p>
      )}
      {error && <p className={styles.formError} style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}

// ── Team dashboard ─────────────────────────────────────────────────────────

function TeamDashboard({ team, tournamentId, myRole, onUpdated, onDeleted }) {
  const [removing,          setRemoving]          = useState(null);
  const [deleting,          setDeleting]          = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [leaving,           setLeaving]           = useState(false);
  const [showConfirmLeave,  setShowConfirmLeave]  = useState(false);

  // Id учасників, що зараз видаляються — не мерджимо їх з polling
  const removingIds = useRef(new Set());

  const isAdmin      = myRole === "owner" || myRole === "admin";
  const isRegistered = team.status === "registered";
  const isCaptain    = !!team.is_captain;
  const canEdit      = ((team.is_editable && isCaptain) || isAdmin) && !isRegistered;

  const regMeta  = registrationStatusMeta(team.registration_status);
  const accepted = (team.members ?? []).filter(m => m.status === "accepted");
  const pending  = (team.members ?? []).filter(m => m.status === "pending");

  // ── Розумне злиття даних про команду з сервера ────────────────────────────
  //
  // Зберігаємо нові поля, але не «повертаємо» учасників, яких щойно видалили.

  const mergeTeamData = useCallback((fresh) => {
    onUpdated(prev => {
      if (!prev) return fresh;
      const filteredMembers = (fresh.members ?? []).filter(
        m => !removingIds.current.has(m.id)
      );
      return { ...fresh, members: filteredMembers };
    });
  }, [onUpdated]);

  const refetch = useCallback(async () => {
    try {
      const { data } = await API.get(`/tournaments/${tournamentId}/my-team/`);
      mergeTeamData(data);
    } catch (err) {
      console.error("Refetch my-team:", err);
    }
  }, [tournamentId, mergeTeamData]);

  const handleRemoveMember = async (memberId) => {
    setRemoving(memberId);
    removingIds.current.add(memberId);

    // Оптимістичне видалення зі списку
    onUpdated(prev => prev
      ? { ...prev, members: (prev.members ?? []).filter(m => m.id !== memberId) }
      : prev
    );

    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/members/${memberId}/`);
    } catch (err) {
      console.error("Remove member:", err);
      // Відкат: повторно завантажуємо актуальний стан
      await refetch();
    } finally {
      setRemoving(null);
      setTimeout(() => removingIds.current.delete(memberId), 3000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/`);
      onDeleted();
    } catch (err) {
      console.error("Delete team:", err);
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };


  const handleLeave = async () => {
    setLeaving(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/leave/`);
      onDeleted();
    } catch (err) {
      console.error("Leave team:", err);
      setLeaving(false);
      setShowConfirmLeave(false);
    }
  };

  const regMeta2 = registrationStatusMeta(team.registration_status);

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <Card>
        <div className={styles.cardHeader}>
          <div className={styles.teamMeta}>
            <h2 className={styles.teamName}>{team.name}</h2>
            {team.city && <div className={styles.teamSub}><span>📍 {team.city}</span></div>}
          </div>
          <div className={styles.badgeStack}>
            <Badge color={isRegistered ? "green" : "gray"}>
              {isRegistered ? "Зареєстрована" : "Чернетка"}
            </Badge>
            <Badge color={regMeta2.color}>{regMeta2.text}</Badge>
            {team.roster_locked && <Badge color="red">🔒 Склад зафіксовано</Badge>}
          </div>
        </div>

        <div className={styles.divider} />

        <RosterProgress
          current={team.member_count ?? 1}
          min={team.tournament?.min_team_size}
          max={team.tournament?.max_team_size}
        />
      </Card>

      {/* Captain */}
      <Card>
        <SectionLabel>Капітан</SectionLabel>
        <div className={styles.captainRow}>
          <Avatar name={team.captain?.full_name} avatar={team.captain?.avatar} size="md" />
          <div className={styles.memberInfo}>
            <span className={styles.memberName}>
              {team.captain?.full_name}
              &nbsp;<Badge color="blue">капітан</Badge>
            </span>
            <span className={styles.memberEmail}>{team.captain?.email}</span>
          </div>
        </div>
      </Card>

      {/* Members */}
      <Card>
        <SectionLabel>
          <span>Учасники команди</span>
          {(accepted.length + pending.length) > 0 && (
            <span className={styles.countPill}>
              {accepted.length} прийнято
              {pending.length > 0 && `, ${pending.length} очікують`}
            </span>
          )}
        </SectionLabel>

        {accepted.length > 0 && (
          <div className={styles.memberList}>
            {accepted.map(m => (
              <MemberRow
                key={m.id} member={m}
                canRemove={canEdit} onRemove={handleRemoveMember} isRemoving={removing === m.id}
              />
            ))}
          </div>
        )}

        {pending.length > 0 && (
          <>
            <p className={styles.pendingLabel}>Очікують підтвердження</p>
            <div className={styles.memberList}>
              {pending.map(m => (
                <MemberRow
                  key={m.id} member={m}
                  canRemove={canEdit} onRemove={handleRemoveMember} isRemoving={removing === m.id}
                />
              ))}
            </div>
          </>
        )}

        {accepted.length === 0 && pending.length === 0 && (
          <p className={styles.emptyNote}>
            Поділіться посиланням — учасники зможуть приєднатися до команди.
          </p>
        )}

        {/* Invite link only */}
        {canEdit && (
          <div className={styles.inviteSection}>
            <div className={styles.divider} />
            <InviteLink token={team.team_invite_token} />
          </div>
        )}
      </Card>

      {/* Register — тільки капітан або адмін */}
      {!isRegistered && (isCaptain || isAdmin) && (
        <Card>
          <SectionLabel>Реєстрація у турнірі</SectionLabel>
          <RegisterBlock team={team} tournamentId={tournamentId} onRegistered={onUpdated} />
        </Card>
      )}

      {/* Danger zone — тільки капітан або адмін */}
      {(isAdmin || (isCaptain && team.is_editable)) && (
        <div className={styles.dangerZone}>
          {!showConfirmDelete ? (
            <button className={styles.btnDanger} onClick={() => setShowConfirmDelete(true)}>
              Розпустити команду
            </button>
          ) : (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>
                Ви впевнені? Усі учасники будуть виключені. Цю дію неможливо скасувати.
              </p>
              <div className={styles.confirmActions}>
                <button className={styles.btnDestructive} onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Видалення…" : "Так, розпустити"}
                </button>
                <button className={styles.btnGhost} onClick={() => setShowConfirmDelete(false)}>
                  Скасувати
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Покинути команду — тільки для учасників, що НЕ є капітаном і команда не зареєстрована */}
      {myRole === "participant" && team.is_captain === false && !isAdmin && !isRegistered && (
        <div className={styles.dangerZone}>
          {!showConfirmLeave ? (
            <button className={styles.btnDanger} onClick={() => setShowConfirmLeave(true)}>
              Покинути команду
            </button>
          ) : (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>
                Ви впевнені? Ви залишите команду і вас потрібно буде запросити знову.
              </p>
              <div className={styles.confirmActions}>
                <button className={styles.btnDestructive} onClick={handleLeave} disabled={leaving}>
                  {leaving ? "Виходимо…" : "Так, покинути"}
                </button>
                <button className={styles.btnGhost} onClick={() => setShowConfirmLeave(false)}>
                  Скасувати
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ registrationOpen, onCreate }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>🏆</div>
      <h3 className={styles.emptyTitle}>Ви ще не в команді</h3>
      <p className={styles.emptyDesc}>
        {registrationOpen
          ? "Створіть команду та запросіть учасників до старту турніру."
          : "Реєстрація команд наразі закрита."}
      </p>
      {registrationOpen && (
        <button className={styles.btnPrimary} onClick={onCreate} style={{ marginTop: 8 }}>
          + Створити команду
        </button>
      )}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className={styles.skeletonWrap}>
      <div className={styles.card}>
        <div className={styles.sk} style={{ width: "50%", height: 22, marginBottom: 8 }} />
        <div className={styles.sk} style={{ width: "30%", height: 14 }} />
        <div className={styles.divider} style={{ marginTop: 14 }} />
        <div className={styles.sk} style={{ width: "100%", height: 32, marginTop: 12 }} />
      </div>
      <div className={styles.card}>
        <div className={styles.sk} style={{ width: "20%", height: 11, marginBottom: 14 }} />
        <div className={styles.skRow}>
          <div className={styles.sk} style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className={styles.sk} style={{ width: "45%", height: 14, marginBottom: 6 }} />
            <div className={styles.sk} style={{ width: "32%", height: 12 }} />
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.sk} style={{ width: "28%", height: 11, marginBottom: 14 }} />
        {[0, 1].map(i => (
          <div key={i} className={styles.skRow} style={{ marginBottom: 8 }}>
            <div className={styles.sk} style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className={styles.sk} style={{ width: "42%", height: 13, marginBottom: 5 }} />
              <div className={styles.sk} style={{ width: "30%", height: 11 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────

export function MyTeamTab({ tournamentId, tournament, myRole, tournamentStatus, onTeamUpdated }) {
  const [team,     setTeam]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);

  // Реєстрація відкрита якщо:
  // 1. статус турніру "registration", АБО
  // 2. дати реєстрації не вказані взагалі (вільна реєстрація), АБО
  // 3. є активний виняток реєстрації
  const noRegDates = !tournament?.registration_start && !tournament?.registration_end;
  const hasException = tournament?.registration_exception_until
    && new Date(tournament.registration_exception_until).getTime() > Date.now();
  const registrationOpen =
    tournamentStatus === "registration" ||
    noRegDates ||
    !!hasException;

  // Оновлює локальний стан і сповіщає TournamentPage.
  // Приймає або дані, або updater-функцію (для оптимістичних оновлень).
  const handleTeamUpdate = useCallback((dataOrUpdater) => {
    setTeam(prev => {
      const next = typeof dataOrUpdater === "function"
        ? dataOrUpdater(prev)
        : dataOrUpdater;
      onTeamUpdated?.(next);
      return next;
    });
  }, [onTeamUpdated]);

  // ── Початкове завантаження ────────────────────────────────────────────────

  const fetchMyTeam = useCallback(async () => {
    try {
      const { data } = await API.get(`/tournaments/${tournamentId}/my-team/`);
      setTeam(data);
      onTeamUpdated?.(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setTeam(null);
        onTeamUpdated?.(null);
      } else {
        console.error("Fetch my-team:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [tournamentId, onTeamUpdated]);

  useEffect(() => { fetchMyTeam(); }, [fetchMyTeam]);

  // ── Polling ───────────────────────────────────────────────────────────────
  //
  // Під час polling порівнюємо кількість учасників та їх статуси.
  // Якщо щось змінилося — оновлюємо стан.

  const pollMyTeam = useCallback(async () => {
    if (!team?.id) return; // Немає команди — нічого поллити
    try {
      const { data } = await API.get(`/tournaments/${tournamentId}/my-team/`);
      setTeam(prev => {
        if (!prev) {
          onTeamUpdated?.(data);
          return data;
        }

        const prevMembers  = JSON.stringify((prev.members  ?? []).map(m => ({ id: m.id, status: m.status })));
        const freshMembers = JSON.stringify((data.members  ?? []).map(m => ({ id: m.id, status: m.status })));
        const changed      = prevMembers !== freshMembers
          || prev.status       !== data.status
          || prev.member_count !== data.member_count
          || prev.roster_locked !== data.roster_locked
          || prev.can_register  !== data.can_register;

        if (changed) {
          onTeamUpdated?.(data);
          return data;
        }
        return prev; // Нічого не змінилося — React не перерендерить
      });
    } catch (err) {
      if (err?.response?.status === 404) {
        setTeam(null);
        onTeamUpdated?.(null);
      } else {
        console.error("Poll my-team:", err);
      }
    }
  }, [tournamentId, team?.id, onTeamUpdated]);

  // Polling активний тільки коли є команда і вже пройшло перше завантаження
  usePolling(pollMyTeam, POLL_INTERVAL, !loading && !!team);

  if (loading)  return <Skeleton />;

  if (creating) return (
    <CreateTeamForm
      tournamentId={tournamentId}
      tournament={tournament}
      onCreated={async (t) => {
        // Fetch full team data so is_captain / is_editable / team_invite_token are populated
        try {
          const { data } = await API.get(`/tournaments/${tournamentId}/my-team/`);
          handleTeamUpdate(data);
        } catch {
          handleTeamUpdate(t);
        }
        setCreating(false);
      }}
      onCancel={() => setCreating(false)}
    />
  );

  if (!team) return (
    <EmptyState registrationOpen={registrationOpen} onCreate={() => setCreating(true)} />
  );

  return (
    <TeamDashboard
      team={team}
      tournamentId={tournamentId}
      myRole={myRole}
      onUpdated={handleTeamUpdate}
      onDeleted={() => { setTeam(null); onTeamUpdated?.(null); }}
    />
  );
}