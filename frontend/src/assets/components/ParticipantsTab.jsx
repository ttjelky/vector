import { useState, useEffect, useCallback } from "react";
import styles from "./styles/ParticipantsTab.module.css";
import API from "../../api";
import { X } from "lucide-react";
import { ConfirmDeleteModal } from "./TournamentShared";

const TABS = [
  { key: "participant", label: "Учасники",     icon: "" },
  { key: "jury",        label: "Журі",          icon: "" },
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

// ── Аватарка учасника ─────────────────────────────────────────────────────
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

export default function ParticipantsTab({ tournamentId, myRole, loading }) {
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

  // Допоміжна функція для отримання гарного імені
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

      {/* ── Заголовок + кнопка ── */}
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
          visibleMembers.map((member, idx) => (
            <div key={member.id} className={styles.teamCard}>

              {/* Аватарка замість індексу */}
              <MemberAvatar member={member} />

              <div className={styles.teamInfo}>
                {/* ВИПРАВЛЕНО: Відображаємо Ім'я та Прізвище */}
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