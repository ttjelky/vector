import { useState, useEffect, useRef, useCallback } from "react";
import { API, getProfile } from "@api";
import styles from "../styles/AnnouncementsTab.module.css";
import { usePolling } from "@shared/hooks/usePolling";

// ─── Config ───────────────────────────────────────────────────────────────────
const REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "👏"];

const ROLE_OPTIONS = [
  { value: "all",         label: "Усі",    short: "Усі" },
  { value: "participant", label: "Учасники",         short: "Учасники" },
  { value: "jury",        label: "Журі",             short: "Журі" },
  { value: "admin",       label: "Адміністратори",   short: "Адміни" },
  { value: "owner",       label: "Власник",          short: "Власник" },
];

function roleLabel(value) {
  return ROLE_OPTIONS.find(r => r.value === value)?.label ?? value;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return "щойно";
  if (diff < 3600)  return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} д тому`;
  return new Date(dateStr).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

function getInitials(name = "?") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0]?.toUpperCase() ?? "?";
}

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#3b82f6","#10b981","#f97316"];
function avatarColor(name = "?") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name = "?", size = 32 }) {
  return (
    <div
      className={styles.avatar}
      style={{
        width: size, height: size,
        fontSize: size * 0.38,
        background: avatarColor(name),
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Reaction Strip ───────────────────────────────────────────────────────────
function ReactionStrip({ reactions = {}, myReaction, onReact, compact = false }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    if (pickerOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const active = Object.entries(reactions).filter(([, c]) => c > 0);

  return (
    <div className={`${styles.reactionRow} ${compact ? styles.reactionRowCompact : ""}`}>
      {active.map(([emoji, count]) => (
        <button
          key={emoji}
          className={`${styles.reactionChip} ${myReaction === emoji ? styles.reactionChipActive : ""}`}
          onClick={() => onReact(emoji)}
        >
          <span className={styles.reactionEmoji}>{emoji}</span>
          <span className={styles.reactionCount}>{count}</span>
        </button>
      ))}

      <div className={styles.pickerWrap} ref={pickerRef}>
        <button
          className={`${styles.reactionAdd} ${myReaction ? styles.reactionAddActive : ""}`}
          onClick={() => setPickerOpen(o => !o)}
          title="Додати реакцію"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="8" cy="8" r="6.5"/>
            <path d="M5.5 9.5c.5.8 1.4 1.5 2.5 1.5s2-.7 2.5-1.5"/>
            <circle cx="5.8" cy="6.5" r=".6" fill="currentColor" stroke="none"/>
            <circle cx="10.2" cy="6.5" r=".6" fill="currentColor" stroke="none"/>
          </svg>
        </button>

        {pickerOpen && (
          <div className={styles.reactionPicker}>
            {REACTIONS.map(e => (
              <button
                key={e}
                className={`${styles.pickerBtn} ${myReaction === e ? styles.pickerBtnActive : ""}`}
                onClick={() => { onReact(e); setPickerOpen(false); }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single Comment ───────────────────────────────────────────────────────────
function CommentItem({ comment, canManage, onReply, onDelete, onReact, depth = 0 }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending,   setSending]   = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (showReply && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showReply]);

  const submitReply = async () => {
    const t = replyText.trim();
    if (!t) return;
    setSending(true);
    await onReply(comment.id, t);
    setReplyText("");
    setShowReply(false);
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitReply();
  };

  return (
    <div className={`${styles.comment} ${depth > 0 ? styles.commentReply : ""}`}>
      <Avatar name={comment.author_name} size={depth > 0 ? 26 : 28} />

      <div className={styles.commentContent}>
        <div className={styles.commentHeader}>
          <span className={styles.commentAuthor}>{comment.author_name}</span>
          <span className={styles.commentTime}>{timeAgo(comment.created_at)}</span>
          {(canManage || comment.is_mine) && (
            <button
              className={styles.commentDeleteBtn}
              onClick={() => onDelete(comment.id)}
              title="Видалити коментар"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="2" y1="2" x2="10" y2="10"/>
                <line x1="10" y1="2" x2="2" y2="10"/>
              </svg>
            </button>
          )}
        </div>

        <p className={styles.commentText}>{comment.text}</p>

        <div className={styles.commentFooter}>
          <ReactionStrip
            reactions={comment.reactions ?? {}}
            myReaction={comment.my_reaction}
            onReact={(emoji) => onReact(comment.id, emoji)}
            compact
          />
          {depth === 0 && (
            <button
              className={styles.replyBtn}
              onClick={() => setShowReply(s => !s)}
            >
              {showReply ? "Скасувати" : "↩ Відповісти"}
            </button>
          )}
        </div>

        {showReply && (
          <div className={styles.replyForm}>
            <textarea
              ref={textareaRef}
              className={styles.replyTextarea}
              placeholder="Ваша відповідь… (Ctrl+Enter для надсилання)"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <button
              className={styles.replySendBtn}
              onClick={submitReply}
              disabled={sending || !replyText.trim()}
            >
              {sending ? "…" : "Надіслати"}
            </button>
          </div>
        )}

        {comment.replies?.length > 0 && (
          <div className={styles.repliesList}>
            {comment.replies.map(r => (
              <CommentItem
                key={r.id}
                comment={r}
                canManage={canManage}
                onReply={onReply}
                onDelete={onDelete}
                onReact={onReact}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────
function AnnouncementCard({
  ann, canManage,
  currentUserName,
  onDelete, onReact,
  onComment, onReplyComment,
  onDeleteComment, onReactComment,
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending,     setSending]     = useState(false);
  const textareaRef = useRef(null);

  const totalComments = (ann.comments ?? []).reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0), 0
  );

  const submitComment = async () => {
    const t = commentText.trim();
    if (!t) return;
    setSending(true);
    await onComment(ann.id, t);
    setCommentText("");
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment();
  };

  const toggleComments = () => {
    setExpanded(e => !e);
    if (!expanded) setTimeout(() => textareaRef.current?.focus(), 150);
  };

  const targetIsAll = ann.target_role === "all";

  return (
    <div className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.cardTop}>
        <div className={styles.cardTopLeft}>
          <Avatar name={ann.author_name} size={34} />
          <div className={styles.cardMeta}>
            <div className={styles.cardAuthorRow}>
              <span className={styles.cardAuthorName}>{ann.author_name}</span>
              {ann.author_role && (
                <span className={`${styles.authorRoleBadge} ${ann.author_role === "owner" ? styles.authorRoleOwner : ""}`}>
                  {ann.author_role === "owner" ? "Власник" : "Адмін"}
                </span>
              )}
            </div>
            <span className={styles.cardTime}>{timeAgo(ann.created_at)}</span>
          </div>
        </div>

        <div className={styles.cardTopRight}>
          <span className={`${styles.targetBadge} ${targetIsAll ? styles.targetAll : ""}`}>
            {roleLabel(ann.target_role)}
          </span>
          {canManage && (
            <button
              className={styles.cardDeleteBtn}
              onClick={() => onDelete(ann.id)}
              title="Видалити оголошення"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="2" y1="2" x2="10" y2="10"/>
                <line x1="10" y1="2" x2="2" y2="10"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{ann.title}</h3>
        {ann.body && <p className={styles.cardBodyText}>{ann.body}</p>}
      </div>

      {/* ── Reactions ── */}
      <div className={styles.cardReactions}>
        <ReactionStrip
          reactions={ann.reactions ?? {}}
          myReaction={ann.my_reaction}
          onReact={(emoji) => onReact(ann.id, emoji)}
        />
      </div>

      {/* ── Comments toggle ── */}
      <button className={styles.commentsToggle} onClick={toggleComments}>
        <span className={styles.commentsToggleLeft}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9a1 1 0 0 1-1 1H4l-2 2V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1z"/>
          </svg>
          {totalComments > 0
            ? `${totalComments} ${totalComments === 1 ? "коментар" : totalComments < 5 ? "коментарі" : "коментарів"}`
            : "Залишити коментар"
          }
        </span>
        <svg
          className={`${styles.chevron} ${expanded ? styles.chevronDown : ""}`}
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="4 6 8 10 12 6"/>
        </svg>
      </button>

      {/* ── Comments section ── */}
      {expanded && (
        <div className={styles.commentsSection}>
          {ann.comments?.length === 0 && (
            <p className={styles.noComments}>Будьте першим, хто залишить коментар 💬</p>
          )}

          {(ann.comments ?? []).map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              canManage={canManage}
              onReply={(parentId, text) => onReplyComment(ann.id, parentId, text)}
              onDelete={(cid) => onDeleteComment(ann.id, cid)}
              onReact={(cid, emoji) => onReactComment(ann.id, cid, emoji)}
            />
          ))}

          {/* New comment input */}
          <div className={styles.newCommentRow}>
            <Avatar name={currentUserName} size={28} />
            <div className={styles.newCommentField}>
              <textarea
                ref={textareaRef}
                className={styles.newCommentTextarea}
                placeholder="Написати коментар… (Ctrl+Enter для надсилання)"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
              />
              <button
                className={styles.newCommentSend}
                onClick={submitComment}
                disabled={sending || !commentText.trim()}
              >
                {sending ? "…" : "Надіслати"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────
function CreateAnnouncementForm({ tournamentId, onCreated }) {
  const [open,   setOpen]   = useState(false);
  const [title,  setTitle]  = useState("");
  const [body,   setBody]   = useState("");
  const [role,   setRole]   = useState("all");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const reset = () => { setTitle(""); setBody(""); setRole("all"); setOpen(false); setError(""); };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Вкажіть заголовок оголошення"); return; }
    setSaving(true);
    setError("");
    try {
      const r = await API.post(`/tournaments/${tournamentId}/announcements/`, {
        title: title.trim(),
        body:  body.trim(),
        target_role: role,
      });
      onCreated(r.data);
      reset();
    } catch (err) {
      setError("Не вдалося опублікувати. Спробуйте ще раз.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") reset();
  };

  if (!open) {
    return (
      <button className={styles.newAnnBtn} onClick={() => setOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="7" y1="1" x2="7" y2="13"/>
          <line x1="1" y1="7" x2="13" y2="7"/>
        </svg>
        Нове оголошення
      </button>
    );
  }

  return (
    <div className={styles.createForm} onKeyDown={handleKeyDown}>
      <div className={styles.createFormHeader}>
        <span className={styles.createFormTitle}>Нове оголошення</span>
        <button className={styles.createFormCloseBtn} onClick={reset} title="Закрити (Esc)">
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10"/>
            <line x1="10" y1="2" x2="2" y2="10"/>
          </svg>
        </button>
      </div>

      <input
        className={`${styles.formInput} ${error && !title.trim() ? styles.formInputError : ""}`}
        placeholder="Заголовок *"
        value={title}
        onChange={e => { setTitle(e.target.value); setError(""); }}
        maxLength={200}
        autoFocus
      />

      <textarea
        className={styles.formTextarea}
        placeholder="Текст оголошення (необов'язково)…"
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
      />

      <div className={styles.formAudienceRow}>
        <span className={styles.formAudienceLabel}>Аудиторія</span>
        <div className={styles.roleChips}>
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.roleChip} ${role === opt.value ? styles.roleChipActive : ""}`}
              onClick={() => setRole(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.formFooter}>
        <button className={styles.formCancelBtn} onClick={reset}>Скасувати</button>
        <button
          className={styles.formPublishBtn}
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
        >
          {saving ? "Публікація…" : "Опублікувати"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export function AnnouncementsTab({ tournamentId, myRole }) {
  const [announcements,   setAnnouncements]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [currentUserName, setCurrentUserName] = useState("Я");
  const [filter,          setFilter]          = useState("all");

  const canManage = myRole === "owner" || myRole === "admin";

  // ── Завантаження оголошень (викликається і при поллінгу) ──────────────────
  const fetchAnnouncements = useCallback(async () => {
    try {
      const r = await API.get(`/tournaments/${tournamentId}/announcements/`);
      setAnnouncements(prev => {
        // Зберігаємо локальний стан expanded/commentText карток —
        // оновлюємо тільки дані верхнього рівня (reactions, нові оголошення),
        // не зачіпаючи коментарі які юзер зараз вводить
        const prevMap = Object.fromEntries(prev.map(a => [a.id, a]));
        return r.data.map(a => {
          const old = prevMap[a.id];
          if (!old) return a;
          // Оновлюємо reactions + нові коментарі, але не перезаписуємо
          // якщо стан ідентичний — повертаємо старий об'єкт (React bailout)
          const same =
            old.reactions === a.reactions &&
            JSON.stringify(old.reactions) === JSON.stringify(a.reactions) &&
            (old.comments?.length ?? 0) === (a.comments?.length ?? 0);
          return same ? old : { ...old, ...a };
        });
      });
    } catch (err) {
      console.error(err);
    }
  }, [tournamentId]);

  // ── Початкове завантаження (разом з профілем) ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [annRes, profileRes] = await Promise.allSettled([
          API.get(`/tournaments/${tournamentId}/announcements/`),
          getProfile(),
        ]);
        if (annRes.status === "fulfilled") setAnnouncements(annRes.value.data);
        if (profileRes.status === "fulfilled") {
          const { first_name, last_name, username } = profileRes.value.data;
          const full = `${first_name ?? ""} ${last_name ?? ""}`.trim();
          setCurrentUserName(full || username || "Я");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [tournamentId]);

  // ── Поллінг кожні 10 секунд ───────────────────────────────────────────────
  usePolling(fetchAnnouncements, 10_000, !loading);

  // ── Announcement handlers ─────────────────────────────────────────────────

  const handleCreated = useCallback((ann) => {
    setAnnouncements(prev => [ann, ...prev]);
  }, []);

  const handleDelete = useCallback(async (annId) => {
    try {
      await API.delete(`/tournaments/${tournamentId}/announcements/${annId}/`);
      setAnnouncements(prev => prev.filter(a => a.id !== annId));
    } catch (err) { console.error(err); }
  }, [tournamentId]);

  const handleReact = useCallback(async (annId, emoji) => {
    try {
      const r = await API.post(`/tournaments/${tournamentId}/announcements/${annId}/react/`, { emoji });
      setAnnouncements(prev => prev.map(a =>
        a.id === annId
          ? { ...a, reactions: r.data.reactions, my_reaction: r.data.my_reaction }
          : a
      ));
    } catch (err) { console.error(err); }
  }, [tournamentId]);

  // ── Comment handlers ──────────────────────────────────────────────────────

  const handleComment = useCallback(async (annId, text) => {
    try {
      const r = await API.post(
        `/tournaments/${tournamentId}/announcements/${annId}/comments/`,
        { text }
      );
      setAnnouncements(prev => prev.map(a =>
        a.id === annId
          ? { ...a, comments: [...(a.comments ?? []), r.data] }
          : a
      ));
    } catch (err) { console.error(err); }
  }, [tournamentId]);

  const handleReplyComment = useCallback(async (annId, parentId, text) => {
    try {
      const r = await API.post(
        `/tournaments/${tournamentId}/announcements/${annId}/comments/`,
        { text, parent: parentId }
      );
      setAnnouncements(prev => prev.map(a => {
        if (a.id !== annId) return a;
        return {
          ...a,
          comments: (a.comments ?? []).map(c =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies ?? []), r.data] }
              : c
          ),
        };
      }));
    } catch (err) { console.error(err); }
  }, [tournamentId]);

  const handleDeleteComment = useCallback(async (annId, commentId) => {
    try {
      await API.delete(
        `/tournaments/${tournamentId}/announcements/${annId}/comments/${commentId}/`
      );
      setAnnouncements(prev => prev.map(a => {
        if (a.id !== annId) return a;
        const filterRecursive = (comments) =>
          comments
            .filter(c => c.id !== commentId)
            .map(c => ({ ...c, replies: (c.replies ?? []).filter(r => r.id !== commentId) }));
        return { ...a, comments: filterRecursive(a.comments ?? []) };
      }));
    } catch (err) { console.error(err); }
  }, [tournamentId]);

  const handleReactComment = useCallback(async (annId, commentId, emoji) => {
    try {
      const r = await API.post(
        `/tournaments/${tournamentId}/announcements/${annId}/comments/${commentId}/react/`,
        { emoji }
      );
      setAnnouncements(prev => prev.map(a => {
        if (a.id !== annId) return a;
        const patchComments = (comments) => comments.map(c => {
          if (c.id === commentId) return { ...c, reactions: r.data.reactions, my_reaction: r.data.my_reaction };
          if (c.replies?.length)  return { ...c, replies: patchComments(c.replies) };
          return c;
        });
        return { ...a, comments: patchComments(a.comments ?? []) };
      }));
    } catch (err) { console.error(err); }
  }, [tournamentId]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = filter === "all"
    ? announcements
    : announcements.filter(a => a.target_role === filter || a.target_role === "all");

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingDots}>
          <span/><span/><span/>
        </div>
        <p>Завантаження оголошень…</p>
      </div>
    );
  }

  return (
    <div className={styles.tab}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {canManage && (
          <div className={styles.filterRow}>
            {[{ value: "all", label: "Всі" }, ...ROLE_OPTIONS.slice(1)].map(opt => (
              <button
                key={opt.value}
                className={`${styles.filterChip} ${filter === opt.value ? styles.filterChipActive : ""}`}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {canManage && (
          <CreateAnnouncementForm tournamentId={tournamentId} onCreated={handleCreated} />
        )}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📢</div>
          <p className={styles.emptyTitle}>
            {filter !== "all" ? "Немає оголошень для цієї аудиторії" : "Оголошень ще немає"}
          </p>
          {canManage && filter === "all" && (
            <p className={styles.emptyHint}>Натисніть «Нове оголошення», щоб повідомити учасників</p>
          )}
        </div>
      ) : (
        <div className={styles.feed}>
          {filtered.map(ann => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              canManage={canManage}
              currentUserName={currentUserName}
              onDelete={handleDelete}
              onReact={handleReact}
              onComment={handleComment}
              onReplyComment={handleReplyComment}
              onDeleteComment={handleDeleteComment}
              onReactComment={handleReactComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
