import { useState, useEffect } from "react";
import styles from "./styles/ParticipantsTab.module.css";
import API from "../../api";
import cross from "./static/icons/cross.svg";
import { X } from "lucide-react";


/**
 * Props:
 *  - tournamentId  {string|number}
 *  - myRole        {string|null}   — "owner" | "participant" | null
 *  - loading       {boolean}
 */
export default function ParticipantsTab({ tournamentId, myRole, loading }) {
  const [members,          setMembers]          = useState([]);
  const [membersLoading,   setMembersLoading]   = useState(true);
  const [copied,           setCopied]           = useState(false);
  const [inviteUrl,        setInviteUrl]        = useState(null);
  const [invitePin,        setInvitePin]        = useState(null);
  const [showPin,          setShowPin]          = useState(false);
  const [regenLoading,     setRegenLoading]     = useState(false);
  const [regenConfirm,     setRegenConfirm]     = useState(false); // підтвердження перед перегенерацією

  const isOwner = myRole === "owner";

  // Завантажити список учасників
  useEffect(() => {
    if (!tournamentId) return;
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error("Помилка завантаження учасників:", err))
      .finally(() => setMembersLoading(false));
  }, [tournamentId]);

  // Завантажити invite URL і PIN (тільки для власника)
  useEffect(() => {
    if (!tournamentId || !isOwner) return;
    API.get(`/tournaments/${tournamentId}/invite-link/`)
      .then(r => {
        setInviteUrl(r.data.invite_url);
        setInvitePin(r.data.invite_pin);
      })
      .catch(err => console.error("Помилка отримання invite-link:", err));
  }, [tournamentId, isOwner]);

  // Скопіювати посилання (Safari-safe — без await перед clipboard)
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
      try { document.execCommand("copy"); } catch { window.prompt("Скопіюйте вручну:", inviteUrl); }
      document.body.removeChild(el);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(inviteUrl).catch(doCopy);
    } else {
      doCopy();
    }

    setCopied(true);
    setShowPin(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Перегенерувати PIN
  const handleRegenerate = async () => {
    if (!regenConfirm) {
      // Перший клік — показати попередження
      setRegenConfirm(true);
      setTimeout(() => setRegenConfirm(false), 4000); // скидає через 4с якщо не підтвердив
      return;
    }
    // Другий клік — виконати
    setRegenLoading(true);
    setRegenConfirm(false);
    try {
      const res = await API.post(`/tournaments/${tournamentId}/regenerate-pin/`);
      setInvitePin(res.data.invite_pin);
      setShowPin(true);
    } catch (err) {
      console.error("Помилка перегенерації PIN:", err);
    } finally {
      setRegenLoading(false);
    }
  };

  // Видалити учасника
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
        <span className={styles.teamCount}>Учасники: {members.length}</span>

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

      {isOwner && showPin && invitePin && (
        <div className={styles.pinSection}>

          <div className={styles.pinInfo}>
            <span className={styles.pinText}>
              Також надайте учасникам <strong>PIN-код:</strong>
            </span>
              <div className={styles.pinCode}>
                {invitePin}
              </div>
            </div>

          <button
            onClick={handleRegenerate}
            disabled={regenLoading}
            title="Змінити PIN-код (старий стане недійсним)"
            className={`${styles.regenBtn} ${regenConfirm ? styles.regenConfirm : ""}`}
          >
            {regenLoading
              ? "Оновлення…"
              : regenConfirm
              ? "Підтвердити?"
              : "Змінити PIN"}
          </button>

          <div className={styles.crossIcon} onClick={() => { setShowPin(false); setRegenConfirm(false); }}>
            <X size={20} />
          </div>

          {regenConfirm && (
            <p style={{ width: "100%", margin: "4px 0 0", fontSize: 12, color: "#e53e3e" }}>
              Старий PIN стане недійсним. Натисніть «Натисніть ще раз» для підтвердження.
            </p>
          )}
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
