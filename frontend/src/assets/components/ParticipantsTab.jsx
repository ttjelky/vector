import { useState, useEffect, useCallback } from "react";
import styles from "./styles/ParticipantsTab.module.css";
import API from "../../api";
import { X } from "lucide-react";
import { ConfirmDeleteModal } from "./TournamentShared";

const TABS = [
  { key: "participant", label: "Учасники",      icon: "" },
  { key: "jury",        label: "Журі",           icon: "" },
  { key: "admin",       label: "Адміністратори", icon: "" },
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

  if (src) {
    return <img src={src} alt={initials} className={styles.memberAvatar} />;
  }
  return (
    <div className={styles.memberAvatarPlaceholder}>
      {initials}
    </div>
  );
}

export default function ParticipantsTab({
  tournamentId,
  myRole,
  loading,
  maxParticipants,
  tournamentStatus,
}) {
  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [activeTab,      setActiveTab]      = useState("participant");

  const [invites, setInvites] = useState({
    participant: { url: null, pin: null },
    jury:        { url: null, pin: null },
    admin:       { url: null, pin: null },
  });
  const [showPin,      setShowPin]      = useState(null);
  const [copied,       setCopied]       = useState(null);
  const [regenRole,    setRegenRole]    = useState(null);
  const [regenLoading, setRegenLoading] = useState(false);

  const [memberToDelete,  setMemberToDelete]  = useState(null);
  const [deletingMember,  setDeletingMember]  = useState(false);

  const isOwner = myRole === "owner";

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
      .catch(err => console.error("Помилка завантаження учасників:", err))
      .finally(() => setMembersLoading(false));
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId || !isOwner) return;
    const roles = ["participant", "jury", "admin"];
    roles.forEach(role => {
      API.get(`/tournaments/${tournamentId}/invite-link/?role=${role}`)
        .then(r => setInvites(prev => ({
          ...prev,
          [role]: { url: r.data.invite_url, pin: r.data.invite_pin },
        })))
        .catch(err => console.error(`Помилка invite-link (${role}):`, err));
    });
  }, [tournamentId, isOwner]);

  const handleInvite = useCallback((role) => {
    const url = invites[role]?.url;
    if (!url) return;

    const doCopy = () => {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity  = "0";
      document.body.appendChild(el);
      el.focus(); el.select();
      try { document.execCommand("copy"); } catch { window.prompt("Скопіюйте вручну:", url); }
      document.body.removeChild(el);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).catch(doCopy);
    } else {
      doCopy();
    }

    setCopied(role);
    setShowPin(role);
    setTimeout(() => setCopied(null), 2500);
  }, [invites]);

  const handleRegenerate = useCallback(async (role) => {
    if (regenRole !== role) {
      setRegenRole(role);
      setTimeout(() => setRegenRole(r => r === role ? null : r), 4000);
      return;
    }
    setRegenLoading(true);
    setRegenRole(null);
    try {
      const res = await API.post(`/tournaments/${tournamentId}/regenerate-pin/?role=${role}`);
      setInvites(prev => ({
        ...prev,
        [role]: { ...prev[role], pin: res.data.invite_pin },
      }));
      setShowPin(role);
    } catch (err) {
      console.error("Помилка перегенерації PIN:", err);
    } finally {
      setRegenLoading(false);
    }
  }, [regenRole, tournamentId]);

  const handleRemoveMember = (member) => setMemberToDelete(member);

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;
    setDeletingMember(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/members/${memberToDelete.id}/`);
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch (err) {
      console.error("Помилка видалення:", err);
    } finally {
      setDeletingMember(false);
    }
  };

  const visibleMembers = members.filter(m =>
    m.role === activeTab || (activeTab === "participant" && m.role === "owner")
  );

  if (loading || membersLoading) {
    return (
      <div className={styles.tabContent}>
        <p className={styles.empty}>Завантаження...</p>
      </div>
    );
  }

  const invite     = invites[activeTab];
  const pinVisible = showPin === activeTab;
  const isCopied   = copied  === activeTab;
  const isRegen    = regenRole === activeTab;

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

      {/* ── Підвкладки ── */}
      <div className={styles.subTabs}>
        {TABS.map(tab => {
          const count = members.filter(m =>
            m.role === tab.key || (tab.key === "participant" && m.role === "owner")
          ).length;
          return (
            <button
              key={tab.key}
              className={`${styles.subTab} ${activeTab === tab.key ? styles.subTabActive : ""}`}
              onClick={() => { setActiveTab(tab.key); setShowPin(null); setRegenRole(null); }}
            >
              {tab.label}
              <span className={styles.subTabCount}>{count}</span>
            </button>
          );
        })}
      </div>

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
        </div>
      )}

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

              {isOwner && member.role !== "owner" && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveMember(member)}
                >
                  ✕
                </button>
              )}

              {member.joined_at && (
                <div className={styles.teamDate}>
                  {new Date(member.joined_at).toLocaleDateString("uk-UA")}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {memberToDelete && (
        <ConfirmDeleteModal
          icon="👤"
          title="Видалити учасника?"
          description={
            <>Учасник <strong>{getDisplayName(memberToDelete)}</strong> буде видалений з турніру.</>
          }
          confirmLabel="Так, видалити"
          onConfirm={confirmRemoveMember}
          onCancel={() => setMemberToDelete(null)}
          loading={deletingMember}
        />
      )}
    </div>
  );
}
