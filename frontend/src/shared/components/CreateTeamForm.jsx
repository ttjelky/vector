// src/tournament/components/CreateTeamForm.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import API from "@api";
import styles from "@shared/styles/CreateTeamForm.module.css";

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const MAP = {
    draft:      { label: "Чернетка",      cls: styles.badgeDraft      },
    registered: { label: "Зареєстрована", cls: styles.badgeRegistered },
  };
  const { label, cls } = MAP[status] ?? { label: status, cls: "" };
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function SizeProgress({ current, min, max }) {
  const pct   = min ? Math.min((current / min) * 100, 100) : 100;
  const ready = current >= min;
  return (
    <div className={styles.sizeProgress}>
      <div className={styles.sizeProgressBar}>
        <div
          className={`${styles.sizeProgressFill} ${ready ? styles.sizeProgressReady : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`${styles.sizeProgressLabel} ${ready ? styles.sizeReady : ""}`}>
        {current} / {min} мін.{max ? ` (макс. ${max})` : ""}
      </span>
    </div>
  );
}

function MemberRow({ member, onRemove, canEdit }) {
  const isAccepted = member.status === "accepted";
  return (
    <div className={`${styles.memberRow} ${isAccepted ? styles.memberAccepted : styles.memberPending}`}>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>{member.user.full_name || member.user.username}</span>
        <span className={styles.memberEmail}>{member.user.email}</span>
      </div>
      <span className={`${styles.memberStatus} ${isAccepted ? styles.statusAccepted : styles.statusPending}`}>
        {isAccepted ? "у команді" : "очікує"}
      </span>
      {canEdit && (
        <button type="button" className={styles.removeMemberBtn} onClick={() => onRemove(member.id)} title="Видалити">
          ✕
        </button>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function CreateTeamForm({ tournamentId, tournament, onCreated, onCancel }) {
  // Одразу показуємо форму створення, team з'явиться після першого запиту
  const [team,    setTeam]    = useState(null);
  const [created, setCreated] = useState(false); // чи вже відправили POST

  const [name,    setName]    = useState("");
  const [city,    setCity]    = useState("");
  const [contact, setContact] = useState("");

  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);

  const nameRef = useRef(null);

  const minSize = tournament?.min_team_size ?? 2;
  const maxSize = tournament?.max_team_size ?? null;

  const acceptedCount = team
    ? 1 + (team.members?.filter(m => m.status === "accepted").length ?? 0)
    : 1; // тільки капітан поки немає team
  const canRegister = team?.can_register ?? false;
  const canEdit     = team?.is_editable  ?? false;

  // ── Refresh polling ──────────────────────────────────────────────────────

  const refreshTeam = useCallback(async () => {
    if (!team?.id) return;
    try {
      const { data } = await API.get(`/tournaments/${tournamentId}/teams/${team.id}/`);
      setTeam(data);
    } catch { /* silent */ }
  }, [team?.id, tournamentId]);

  useEffect(() => {
    if (!created) return;
    const id = setInterval(refreshTeam, 8000);
    return () => clearInterval(id);
  }, [created, refreshTeam]);

  // ── Create draft ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!name.trim()) {
      setErrors({ name: "Введіть назву команди." });
      nameRef.current?.focus();
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const { data } = await API.post(`/tournaments/${tournamentId}/teams/`, {
        name: name.trim(), city: city.trim(), contact: contact.trim(),
      });
      setTeam(data);
      setCreated(true);
      onCreated(data); // передаємо одразу — MyTeamTab сховає форму і покаже TeamDashboard
    } catch (err) {
      const data = err?.response?.data;
      if (data?.non_field_errors) {
        setErrors({ general: data.non_field_errors[0] });
      } else if (data && typeof data === "object") {
        setErrors(Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
        ));
      } else {
        setErrors({ general: "Помилка сервера. Спробуйте ще раз." });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Remove member ────────────────────────────────────────────────────────

  const handleRemoveMember = async (memberId) => {
    try {
      await API.delete(`/tournaments/${tournamentId}/teams/${team.id}/members/${memberId}/`);
      await refreshTeam();
    } catch (err) {
      alert(err?.response?.data?.detail || "Не вдалося видалити учасника.");
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    setLoading(true);
    setErrors({});
    try {
      const { data } = await API.post(`/tournaments/${tournamentId}/teams/${team.id}/register/`);
      setTeam(data);
      onCreated(data);
    } catch (err) {
      setErrors({ general: err?.response?.data?.detail || "Помилка реєстрації." });
    } finally {
      setLoading(false);
    }
  };

  // ── Copy invite link ──────────────────────────────────────────────────────

  const handleCopyLink = () => {
    const url = `${window.location.origin}/team-invite/${team.team_invite_token}/`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const shortage = minSize - acceptedCount;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.formWrap} style={{
      maxWidth: 560,
      margin: "0 auto",
      padding: "0 16px",
    }}>

      {/* Заголовок */}
      <div className={styles.formHeader} style={{
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}>
        <div>
          <h2 className={styles.formTitle}>
            {team ? team.name : "Нова команда"}
          </h2>
          <p className={styles.formSubtitle}>{tournament?.name}</p>
        </div>
        {team && <StatusBadge status={team.status} />}
      </div>

      {errors.general && <div className={styles.globalError}>{errors.general}</div>}

      {/* ── Блок 1: назва + місто — показується ТІЛЬКИ до створення ── */}
      {!created && (
        <div className={styles.section}>
          <div className={styles.field}>
            <label className={styles.label}>
              Назва команди <span className={styles.required}>*</span>
            </label>
            <input
              ref={nameRef}
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              placeholder="Наприклад: Phoenix Squad"
              value={name}
              onChange={e => { setName(e.target.value); setErrors({}); }}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            {errors.name && <p className={styles.fieldError}>{errors.name}</p>}
          </div>

          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.label}>
                Місто <span className={styles.optional}>необов'язково</span>
              </label>
              <input
                className={styles.input}
                placeholder="Київ"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Telegram / телефон <span className={styles.optional}>необов'язково</span>
              </label>
              <input
                className={styles.input}
                placeholder="@handle або +380…"
                value={contact}
                onChange={e => setContact(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>

          <p className={styles.sizeHint}>
            Мінімум учасників (разом з вами): {minSize}
            {maxSize ? `, максимум: ${maxSize}` : ""}
          </p>
        </div>
      )}

      {/* ── Блок 2: склад — показується після створення ── */}
      {created && team && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Склад команди</div>
            <SizeProgress current={acceptedCount} min={minSize} max={maxSize} />

            {/* Капітан */}
            <div className={`${styles.memberRow} ${styles.memberAccepted} ${styles.captainRow}`}>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>
                  {team.captain?.full_name || team.captain?.username}
                  <span className={styles.captainBadge}>капітан</span>
                </span>
                <span className={styles.memberEmail}>{team.captain?.email}</span>
              </div>
              <span className={`${styles.memberStatus} ${styles.statusAccepted}`}>у команді</span>
            </div>

            {team.members?.length > 0 && (
              <div className={styles.memberList}>
                {team.members.map(m => (
                  <MemberRow key={m.id} member={m} onRemove={handleRemoveMember} canEdit={canEdit} />
                ))}
              </div>
            )}
          </div>

          {/* Запросити учасників */}
          {canEdit && team.team_invite_token && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Запросити учасників</div>
              <div className={styles.inviteLinkWrap}>
                <span className={styles.inviteLinkLabel}>
                  Поділіться посиланням — учасники зможуть приєднатися:
                </span>
              </div>
              <button
                type="button"
                className={styles.copyLinkBtn}
                onClick={handleCopyLink}
                style={copied
                  ? { color: "#1a7f4c", background: "rgba(26,127,76,0.07)", borderColor: "rgba(26,127,76,0.18)" }
                  : undefined}
              >
                {copied ? "✓ Посилання скопійовано!" : "Копіювати посилання"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Footer ── */}
      <div className={styles.formFooter}>
        {!created ? (
          // Кроку ще немає — показуємо кнопку Скасувати + Створити
          <>
            <button type="button" className={styles.btnSecondary} onClick={onCancel}>
              Скасувати
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleCreate} disabled={loading}>
              {loading ? "Створення…" : "Створити команду →"}
            </button>
          </>
        ) : team?.status === "draft" ? (
          // Команда створена, але ще не зареєстрована
          <button
            type="button"
            className={`${styles.btnPrimary} ${!canRegister ? styles.btnDisabledHint : ""}`}
            onClick={handleRegister}
            disabled={loading || !canRegister}
            title={!canRegister ? `Потрібно ще ${shortage} учасник(ів)` : undefined}
            style={{ width: "100%" }}
          >
            {loading
              ? "Реєстрація…"
              : canRegister
                ? "Приєднати до турніру ✓"
                : `Ще ${shortage} учасник(ів)`}
          </button>
        ) : team?.status === "registered" ? (
          <div className={styles.successMsg}>✓ Команду успішно зареєстровано!</div>
        ) : null}
      </div>
    </div>
  );
}
