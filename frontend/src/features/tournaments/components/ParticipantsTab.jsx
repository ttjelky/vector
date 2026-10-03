import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/ParticipantsTab.module.css";
import { API, mediaUrl } from '@api';
import { X } from "lucide-react";
import { ConfirmDeleteModal } from "./TournamentShared";
import { ScrollRow } from "@features/dashboard";
import { usePolling } from "@shared/hooks/usePolling";

// ─── Константи ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "participant", label: "Учасники" },
  { key: "jury",        label: "Журі" },
  { key: "admin",       label: "Адміністратори" },
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

// ─── Утиліти ──────────────────────────────────────────────────────────────────

function getDisplayName(member) {
  const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
  return fullName || member.username || member.email || "Анонімний";
}

function getInitials(member) {
  return getDisplayName(member)
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// ─── Аватарка учасника ────────────────────────────────────────────────────────

function MemberAvatar({ member }) {
  const src = mediaUrl(member.avatar);
  if (src) return <img src={src} alt={getDisplayName(member)} className={styles.memberAvatar} />;
  return <div className={styles.memberAvatarPlaceholder}>{getInitials(member)}</div>;
}

// ─── Клікабельне ім'я → профіль ─────────────────────────────────────────────

function NameLink({ userId, className, children }) {
  const navigate = useNavigate();
  if (!userId) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      className={`${className ?? ""} ${styles.nameLink}`}
      onClick={() => navigate(`/profile/${userId}`)}
    >
      {children}
    </button>
  );
}

// ─── Картка учасника (клітинка горизонтальної стрічки) ───────────────────────

function MemberCard({ member, canRemove, onRemove }) {
  const email = member.email;
  const displayName = getDisplayName(member);
  return (
    <div className={styles.memberCell}>
      <div className={styles.memberTop}>
        <MemberAvatar member={member} />
        <div className={styles.memberInfo}>
          <NameLink userId={member.user} className={styles.memberName}>
            {displayName}
          </NameLink>
          {email && email !== displayName && (
            <span className={styles.memberEmail}>{email}</span>
          )}
          <span className={styles.memberMeta}>
            {ROLE_LABELS[member.role] ?? member.role}
            {member.user_role ? ` · ${member.user_role}` : ""}
            {member.joined_at
              ? ` · ${new Date(member.joined_at).toLocaleDateString("uk-UA")}`
              : ""}
          </span>
        </div>
        {canRemove && member.role !== "owner" && (
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(member)}
            title="Видалити учасника"
            aria-label={`Видалити ${displayName}`}
          >
            <X size={15} />
          </button>
        )}
      </div>
      {member.registration_display?.length > 0 && (
        <div className={styles.answersBox}>
          <div className={styles.answersTitle}>Відповіді при реєстрації</div>
          {member.registration_display.map((a) => (
            <div key={a.field_id} className={styles.answerRow}>
              <span className={styles.answerLabel}>{a.label}: </span>
              <strong>{a.value || "—"}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Головний компонент ───────────────────────────────────────────────────────

export function ParticipantsTab({ tournamentId, myRole, loading, tournamentType, tournamentStatus, maxParticipants, openRegistration = false, registrationOpen, registrationReason, registrationMessage }) {
  const isTeamTourn = tournamentType === "team";

  const [members,        setMembers]        = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [activeTab,      setActiveTab]      = useState(isTeamTourn ? "jury" : "participant");

  const [invites,      setInvites]      = useState({ participant: [], jury: [], admin: [] });
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [copiedId,     setCopiedId]       = useState(null);
  const [linkName,     setLinkName]       = useState("");
  const [linkCreating, setLinkCreating]   = useState(false);
  const [linkError,    setLinkError]      = useState("");
  const [showLinks,    setShowLinks]      = useState(false);

  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

  const [exceptionUntil,   setExceptionUntilState] = useState(null);
  const [exceptionLoading, setExceptionLoading]    = useState(false);
  const [exceptionMinutes, setExceptionMinutes]    = useState(30);
  const [showException,    setShowException]       = useState(false);

  const isOwner        = myRole === "owner";
  const isPrivilegedUser = myRole === "owner" || myRole === "admin"; // може запрошувати і видаляти
  const canRegister = tournamentStatus === "registration";

  // При вільній реєстрації реєстрація відкрита завжди (крім finished)
  const isOpenAndActive = openRegistration && tournamentStatus !== "finished";

  // ── Завантаження стану винятку реєстрації ────────────────────────────────
  useEffect(() => {
    if (!tournamentId || !isOwner) return;
    API.get(`/tournaments/${tournamentId}/registration-exception/`)
      .then(r => { if (r.data.is_active) setExceptionUntilState(r.data.until); })
      .catch(() => {});
  }, [tournamentId, isOwner]);

  const exceptionActive = exceptionUntil && new Date() < new Date(exceptionUntil);
  // Джерело правди про реєстрацію — бекенд (registration_open з деталей турніру).
  // Fallback на локальний розрахунок, якщо поле відсутнє.
  const backendOpen = typeof registrationOpen === "boolean" ? registrationOpen : null;
  const fallbackOpen = canRegister || isOpenAndActive;
  const baseOpen = backendOpen ?? fallbackOpen;
  const canRegisterNow  = baseOpen || exceptionActive;

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

  // ── Завантаження учасників ────────────────────────────────────────────────
  const fetchMembers = useCallback(() => {
    if (!tournamentId) return;
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error(err));
  }, [tournamentId]);

  // Початкове завантаження зі спінером
  useEffect(() => {
    if (!tournamentId) return;
    setMembersLoading(true);
    API.get(`/tournaments/${tournamentId}/members/`)
      .then(r => setMembers(r.data))
      .catch(err => console.error(err))
      .finally(() => setMembersLoading(false));
  }, [tournamentId]);

  // Автооновлення кожні 5 секунд (без спінера)
  usePolling(fetchMembers, 5000, !!tournamentId);

  // ── Завантаження посилань-запрошень (без PIN, max 3 на роль) ──────────────
  const fetchInvites = useCallback(async () => {
    if (!tournamentId || !isPrivilegedUser) return;
    setInvitesLoading(true);
    try {
      const res = await API.get(`/tournaments/${tournamentId}/invite-links/`);
      const grouped = { participant: [], jury: [], admin: [] };
      for (const l of res.data || []) {
        if (grouped[l.role]) grouped[l.role].push(l);
      }
      setInvites(grouped);
    } catch {
      // ігнор
    } finally {
      setInvitesLoading(false);
    }
  }, [tournamentId, isPrivilegedUser]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const copyText = useCallback((text, id) => {
    const fallbackCopy = () => {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      try { document.execCommand("copy"); } catch { window.prompt("Скопіюйте вручну:", text); }
      document.body.removeChild(el);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const fullInviteUrl = (token) => `${window.location.origin}/join/${token}`;

  const handleCreateLink = useCallback(async (role) => {
    setLinkCreating(true);
    setLinkError("");
    try {
      const res = await API.post(`/tournaments/${tournamentId}/invite-links/`, {
        role, name: linkName.trim(),
      });
      setInvites((prev) => ({ ...prev, [role]: [...(prev[role] || []), res.data] }));
      setLinkName("");
    } catch (err) {
      setLinkError(err.response?.data?.detail || "Не вдалось створити посилання.");
    } finally {
      setLinkCreating(false);
    }
  }, [tournamentId, linkName]);

  const handleDeleteLink = useCallback(async (role, id) => {
    if (!window.confirm("Видалити це посилання? Старі запрошення за ним перестануть працювати.")) return;
    try {
      await API.delete(`/tournaments/${tournamentId}/invite-links/${id}/`);
      setInvites((prev) => ({ ...prev, [role]: prev[role].filter((l) => l.id !== id) }));
    } catch {
      // ігнор
    }
  }, [tournamentId]);

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;
    setDeletingMember(true);
    try {
      await API.delete(`/tournaments/${tournamentId}/members/${memberToDelete.id}/`);
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch {
      // помилка видалення
    } finally {
      setDeletingMember(false);
    }
  };

  // ── Похідні значення ──────────────────────────────────────────────────────

  const visibleMembers = members.filter(m =>
    m.role === activeTab || (activeTab === "participant" && m.role === "owner")
  );

  const activeLinks = invites[activeTab] || [];
  const canCreateLink = activeLinks.length < 3;

  const subTabs = isTeamTourn
    ? TABS.filter(t => t.key === "jury" || t.key === "admin")
    : TABS;

  const statusBanner = isPrivilegedUser && activeTab === "participant"
    ? (() => {
        if (exceptionActive) return null; // активний виняток видно окремою кнопкою
        if (baseOpen) {
          return {
            kind: "open",
            icon: "✅",
            text: "Реєстрація відкрита. Учасники можуть приєднуватися за посиланням або через публічний каталог.",
          };
        }
        // Закрита — показуємо конкретну причину з бекенду
        return {
          kind: "closed",
          icon: "🔒",
          text: registrationMessage || "Реєстрація зараз закрита.",
        };
      })()
    : null;

  const showInviteBtn = isPrivilegedUser && (activeTab !== "participant" || canRegisterNow);
  const canRemove = isPrivilegedUser;

  // ── Рендер ────────────────────────────────────────────────────────────────

  if (loading || membersLoading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{isTeamTourn ? "Адміністрація" : "Учасники"}</h2>
        </div>
        <div className={styles.skeletonRow}>
          {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent} key={activeTab}>

      {/* Заголовок секції */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {TABS.find(t => t.key === activeTab)?.label}
          <span className={styles.countText}>
            &nbsp;· {visibleMembers.length}
            {activeTab === "participant" && maxParticipants ? ` / ${maxParticipants}` : ""}
          </span>
        </h2>
        <div className={styles.headerActions}>
          {/* Кнопка винятку — коли реєстрація закрита, але турнір ще не завершено.
              На finished виняток не діє (бекенд: finished > exception), тому ховаємо. */}
          {isOwner && activeTab === "participant" && !isOpenAndActive &&
            tournamentStatus !== "finished" && (
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
                className="btn-secondary btn-sm"
                onClick={() => setShowException(v => !v)}
                disabled={exceptionLoading}
              >
                Зробити виняток
              </button>
            )
          )}

          {/* Кнопка посилань (без PIN, до 3 на роль) */}
          {showInviteBtn && (
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowLinks((v) => !v)}
            >
              {showLinks ? "Сховати посилання" : `Посилання · ${activeLinks.length}/3`}
            </button>
          )}

          {/* Заблокована кнопка запрошення з конкретною причиною */}
          {isPrivilegedUser && activeTab === "participant" && !canRegisterNow && (
            <button
              className="btn-secondary btn-sm"
              disabled
              title={registrationMessage || "Реєстрація закрита"}
            >
              + {INVITE_LABELS[activeTab]}
            </button>
          )}
        </div>
      </div>

      {/* Підвкладки */}
      {subTabs.length > 1 && (
        <div className={styles.subTabs} role="tablist" aria-label="Категорії учасників">
          {subTabs.map(tab => {
            const count = members.filter(m =>
              m.role === tab.key || (tab.key === "participant" && m.role === "owner")
            ).length;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`${styles.subTab} ${activeTab === tab.key ? styles.subTabActive : ""}`}
                onClick={() => { setActiveTab(tab.key); setShowLinks(false); setLinkError(""); }}
              >
                {tab.label}
                <span className={styles.subTabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Статусний банер */}
      {statusBanner && (
        <div className={`${styles.statusBanner} ${statusBanner.kind === "open" ? styles.statusBannerOpen : styles.statusBannerClosed}`}>
          <span className={styles.statusBannerIcon}>{statusBanner.icon}</span>
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Панель налаштування винятку */}
      {showException && isOwner && activeTab === "participant" && !isOpenAndActive && (
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
              className="btn-primary btn-sm"
              onClick={handleActivateException}
              disabled={exceptionLoading}
            >
              {exceptionLoading ? "Збереження…" : "Активувати"}
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setShowException(false)}>
              Скасувати
            </button>
          </div>
          <span className={styles.exceptionPanelHint}>
            Реєстрація відкриється на {exceptionMinutes} хв для всіх адмінів і закриється автоматично
          </span>
        </div>
      )}

      {/* Панель посилань-запрошень: тільки унікальні посилання, без PIN */}
      {isPrivilegedUser && showLinks && showInviteBtn && (
        <div className={styles.invitePanel}>
          <div className={styles.invitePanelTitle}>
            {INVITE_LABELS[activeTab]} · {activeLinks.length}/3
          </div>
          {invitesLoading && <p className={styles.inviteLoading}>Завантаження…</p>}
          {activeLinks.map((l) => {
            const url = l.invite_url?.includes("http") ? l.invite_url : fullInviteUrl(l.token);
            return (
              <div key={l.id} className={styles.inviteRow}>
                <span className={styles.inviteRowName}>{l.name || "Посилання"}</span>
                <span className={styles.inviteRowUrl} title={url}>{url}</span>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => copyText(url, l.id)}
                >
                  {copiedId === l.id ? "✓ Скопійовано" : "Копіювати"}
                </button>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleDeleteLink(activeTab, l.id)}
                  title="Видалити"
                  aria-label="Видалити посилання"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
          {canCreateLink ? (
            <div className={styles.inviteCreateRow}>
              <input
                className="input"
                placeholder="Назва посилання (необов'язково)"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
              />
              <button
                className="btn-primary btn-sm"
                disabled={linkCreating}
                onClick={() => handleCreateLink(activeTab)}
              >
                {linkCreating ? "…" : "+ Створити"}
              </button>
            </div>
          ) : (
            <p className={styles.inviteLimit}>
              Досягнуто максимум (3 посилання). Видаліть старе щоб створити нове.
            </p>
          )}
          {linkError && <p className={styles.formError}>{linkError}</p>}
          {!canRegisterNow && activeTab === "participant" && (
            <p className={styles.inviteWarn}>
              ⚠️ {registrationMessage || "Реєстрація зараз закрита — посилання спрацюють, коли вона відкриється."}
            </p>
          )}
        </div>
      )}

      {/* Список учасників — горизонтальна стрічка */}
      {visibleMembers.length === 0 ? (
        <div className={styles.emptyBlock}>
          <div className={styles.emptyBlockIcon}>👥</div>
          <p>Список порожній.</p>
        </div>
      ) : (
        <ScrollRow classes={styles}>
          {visibleMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              canRemove={canRemove}
              onRemove={setMemberToDelete}
            />
          ))}
        </ScrollRow>
      )}

      {/* Модалка підтвердження видалення учасника */}
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
