import { useState, useEffect, useCallback } from "react";
import styles from "./styles/ParticipantsTab.module.css";
import API from "../../api";
import { X } from "lucide-react";
import { ConfirmDeleteModal } from "./TournamentShared";

const TABS = [
  { key: "participant", label: "Учасники",     icon: "👤" },
  { key: "jury",        label: "Журі",          icon: "⚖️" },
  { key: "admin",       label: "Адміністратори", icon: "🛡️" },
];

const ROLE_LABELS = {
  owner:       "👑 Власник",
  participant: "👤 Учасник",
  jury:        "⚖️ Журі",
  admin:       "🛡️ Адмін",
};

const INVITE_LABELS = {
  participant: "Запросити учасника",
  jury:        "Запросити журі",
  admin:       "Запросити адміна",
};

/**
 * Props:
 *  - tournamentId  {string|number}
 *  - myRole        {string|null}   — "owner" | "participant" | "jury" | "admin" | null
 *  - loading       {boolean}
 */
export default function ParticipantsTab({ tournamentId, myRole, loading }) {
  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [activeTab,      setActiveTab]      = useState("participant");

  // Invite state — по одному об'єкту на роль
  const [invites, setInvites] = useState({
    participant: { url: null, pin: null },
    jury:        { url: null, pin: null },
    admin:       { url: null, pin: null },
  });
  const [showPin,      setShowPin]      = useState(null);   // яка роль показує PIN
  const [copied,       setCopied]       = useState(null);   // яка роль скопійована
  const [regenRole,    setRegenRole]    = useState(null);   // роль у стані підтвердження
  const [regenLoading, setRegenLoading] = useState(false);

  // Delete state
  const [memberToDelete,  setMemberToDelete]  = useState(null);
  const [deletingMember,  setDeletingMember]  = useState(false);

  const isOwner = myRole === "owner";

  // ── Завантажити список учасників ──────────────────────────────────────────
  useEffect(() => {
    if (!tournamentId) return;
    setMembersLoading(true);
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error("Помилка завантаження учасників:", err))
      .finally(() => setMembersLoading(false));
  }, [tournamentId]);

  // ── Завантажити invite дані для всіх ролей (тільки власнику) ─────────────
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

  // ── Скопіювати посилання ──────────────────────────────────────────────────
  const handleInvite = useCallback((role) => {
    const url = invites[role]?.url;
    if (!url) return;

    const doCopy = () => {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity  = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
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

  // ── Перегенерувати PIN ────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async (role) => {
    if (regenRole !== role) {
      // Перший клік — показати підтвердження
      setRegenRole(role);
      setTimeout(() => setRegenRole(r => r === role ? null : r), 4000);
      return;
    }
    // Другий клік — виконати
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

  // ── Видалити учасника ─────────────────────────────────────────────────────
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

  // ── Фільтрація по вкладці ─────────────────────────────────────────────────
  // Власник відображається в усіх вкладках (або тільки в першій — на ваш вибір)
  const visibleMembers = members.filter(m =>
    m.role === activeTab || (activeTab === "participant" && m.role === "owner")
  );

  // ── Рендер ────────────────────────────────────────────────────────────────
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

  return (
    <div className={styles.tabContent}>

      {/* ── Підвкладки ──────────────────────────────────────────────────── */}
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
              <span className={styles.subTabIcon}>{tab.icon}</span>
              {tab.label}
              <span className={styles.subTabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Заголовок + кнопка запрошення ───────────────────────────────── */}
      <div className={styles.participantsHeader}>
        <span className={styles.teamCount}>
          {TABS.find(t => t.key === activeTab)?.label}: {visibleMembers.length}
        </span>

        {isOwner && (
          <button
            className={styles.inviteBtn}
            onClick={() => handleInvite(activeTab)}
            disabled={!invite?.url}
          >
            {!invite?.url
              ? "Завантаження…"
              : isCopied
              ? "✓ Посилання скопійовано!"
              : `+ ${INVITE_LABELS[activeTab]}`}
          </button>
        )}
      </div>

      {/* ── PIN-секція ───────────────────────────────────────────────────── */}
      {isOwner && pinVisible && invite?.pin && (
        <div className={styles.pinSection}>
          <div className={styles.pinInfo}>
            <span className={styles.pinText}>
              Також надайте <strong>PIN-код:</strong>
            </span>
            <div className={styles.pinCode}>{invite.pin}</div>
          </div>

          <button
            onClick={() => handleRegenerate(activeTab)}
            disabled={regenLoading}
            title="Змінити PIN-код (старий стане недійсним)"
            className={`${styles.regenBtn} ${isRegen ? styles.regenConfirm : ""}`}
          >
            {regenLoading ? "Оновлення…" : isRegen ? "Підтвердити?" : "Змінити PIN"}
          </button>

          <div
            className={styles.crossIcon}
            onClick={() => { setShowPin(null); setRegenRole(null); }}
          >
            <X size={20} />
          </div>

          {isRegen && (
            <p className={styles.regenWarning}>
              Старий PIN стане недійсним. Натисніть «Підтвердити?» для підтвердження.
            </p>
          )}
        </div>
      )}

      {/* ── Список учасників ─────────────────────────────────────────────── */}
      <div className={styles.teamList}>
        {visibleMembers.length === 0 ? (
          <p className={styles.empty}>
            {TABS.find(t => t.key === activeTab)?.label} ще немає.
          </p>
        ) : (
          visibleMembers.map((member, idx) => (
            <div key={member.id} className={styles.teamCard}>
              <div className={styles.teamIndex}>{idx + 1}</div>
              <div className={styles.teamInfo}>
                <span className={styles.teamName}>{member.username}</span>
                <span className={styles.teamMeta}>
                  {ROLE_LABELS[member.role] ?? member.role}
                  {member.user_role && ` · ${member.user_role}`}
                </span>
              </div>
              {isOwner && member.role !== "owner" && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveMember(member)}
                  title="Видалити учасника"
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

      {/* ── Модальне вікно видалення ─────────────────────────────────────── */}
      {memberToDelete && (
        <ConfirmDeleteModal
          icon={TABS.find(t => t.key === memberToDelete.role)?.icon ?? "👤"}
          title="Видалити учасника?"
          description={
            <>Учасник <strong>{memberToDelete.username}</strong> буде видалений з турніру.
            Він зможе приєднатися знову за інвайт-посиланням.</>
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
