import { useState, useEffect } from "react";
import styles from "./styles/ParticipantsTab.module.css";
import API from "../../api";

/**
 * Props:
 *  - tournamentId  {string|number}
 *  - myRole        {string|null}   — "owner" | "participant" | null
 *  - loading       {boolean}
 */
export default function ParticipantsTab({ tournamentId, myRole, loading }) {
  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [copied,         setCopied]         = useState(false);
  const [inviteUrl,      setInviteUrl]      = useState(null);
  const [invitePin,      setInvitePin]      = useState(null);
  const [showPin,        setShowPin]        = useState(false);  // чи показати PIN у UI

  const isOwner = myRole === "owner";

  // Завантажити список учасників
  useEffect(() => {
    if (!tournamentId) return;
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error("Помилка завантаження учасників:", err))
      .finally(() => setMembersLoading(false));
  }, [tournamentId]);

  // Завантажити invite URL і PIN заздалегідь (тільки для власника)
  useEffect(() => {
    if (!tournamentId || !isOwner) return;
    API.get(`/tournaments/${tournamentId}/invite-link/`)
      .then(r => {
        setInviteUrl(r.data.invite_url);
        setInvitePin(r.data.invite_pin);
      })
      .catch(err => console.error("Помилка отримання invite-link:", err));
  }, [tournamentId, isOwner]);

  // Скопіювати інвайт-посилання — без await перед clipboard (Safari fix)
  const handleInvite = () => {
    if (!inviteUrl) return;

    const doCopy = () => {
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      el.style.position = "fixed";
      el.style.opacity  = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        window.prompt("Скопіюйте посилання вручну:", inviteUrl);
      }
      document.body.removeChild(el);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(inviteUrl).catch(doCopy);
    } else {
      doCopy();
    }

    setCopied(true);
    setShowPin(true);   // після копіювання показати PIN власнику
    setTimeout(() => setCopied(false), 2500);
  };

  // Видалити учасника (тільки власник)
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Видалити цього учасника?")) return;
    try {
      await API.delete(`/tournaments/${tournamentId}/members/${memberId}/`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error("Помилка видалення:", err);
    }
  };

  if (loading || membersLoading) {
    return (
      <div className={styles.tabContent}>
        <p className={styles.empty}>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.participantsHeader}>
        <span className={styles.teamCount}>{members.length} учасників</span>

        {isOwner && (
          <button
            className={styles.inviteBtn}
            onClick={handleInvite}
            disabled={!inviteUrl}
          >
            {!inviteUrl
              ? "Завантаження…"
              : copied
              ? "✓ Посилання скопійовано!"
              : "+ Запросити учасника"}
          </button>
        )}
      </div>

      {/* PIN-підказка для власника — з'являється після натискання кнопки */}
      {isOwner && showPin && invitePin && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#f0f7ff",
          border: "1px solid #b3d4f5",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 14,
          color: "#1a1a2e",
        }}>
          <span style={{ fontSize: 20 }}>🔐</span>
          <span>
            Передайте учаснику також <strong>PIN-код:</strong>&nbsp;
            <span style={{
              fontFamily: "monospace",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "#378ADD",
            }}>
              {invitePin}
            </span>
          </span>
          <button
            onClick={() => setShowPin(false)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#888",
              fontSize: 16,
              lineHeight: 1,
            }}
            title="Сховати PIN"
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.teamList}>
        {members.length === 0 ? (
          <p className={styles.empty}>Учасників ще немає.</p>
        ) : (
          members.map((member, idx) => (
            <div key={member.id} className={styles.teamCard}>
              <div className={styles.teamIndex}>{idx + 1}</div>
              <div className={styles.teamInfo}>
                <span className={styles.teamName}>{member.username}</span>
                <span className={styles.teamMeta}>
                  {member.role === "owner" ? "👑 Власник" : "👤 Учасник"}
                  {member.user_role && ` · ${member.user_role}`}
                </span>
              </div>
              {isOwner && member.role !== "owner" && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveMember(member.id)}
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
    </div>
  );
}
