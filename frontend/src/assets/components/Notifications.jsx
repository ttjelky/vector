import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import nStyles from './styles/Notifications.module.css';

const API = 'http://127.0.0.1:8000/api';
const getToken = () => localStorage.getItem('accessToken');

// ── Body scroll lock ───────────────────────────────────────────────────────────
const useScrollLock = (active) => {
  useEffect(() => {
    if (!active) return;
    const prev            = document.body.style.overflow;
    const prevTouch       = document.body.style.touchAction;
    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow    = prev;
      document.body.style.touchAction = prevTouch;
    };
  }, [active]);
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
export const PaperclipIco = () => <Ico><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Ico>;
export const LinkIco      = () => <Ico><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Ico>;
export const SendIco      = () => <Ico><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ico>;
export const CloseIco     = () => <Ico size={14}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>;
export const BellEmptyIco = () => <Ico size={32}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Ico>;

// ── Recipient Autocomplete ────────────────────────────────────────────────────
const RecipientInput = ({ value, onChange, onSelect }) => {
  const [query, setQuery]       = useState(value || '');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef             = useRef();

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    try {
      const res = await fetch(`${API}/notifications/search-users/?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      }
    } catch {}
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setSelected(null);
    onChange(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (user) => {
    setQuery(user.full_name || user.username);
    setSelected(user);
    setOpen(false);
    onSelect(user.username);
  };

  return (
    <div className={nStyles.recipientWrap}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Ім'я, прізвище, username або email"
        autoComplete="off"
      />
      {selected && (
        <span className={nStyles.selectedBadge}>
          ✓ {selected.full_name || selected.username}
          <button onClick={() => { setSelected(null); setQuery(''); onChange(''); }}>
            <CloseIco />
          </button>
        </span>
      )}
      {open && (
        <div className={nStyles.autocomplete}>
          {results.map(u => (
            <div key={u.username} className={nStyles.autocompleteItem} onClick={() => handleSelect(u)}>
              <span className={nStyles.acName}>{u.full_name || u.username}</span>
              <span className={nStyles.acSub}>{u.email} · {u.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Compose Modal Inner (реальний UI) ─────────────────────────────────────────
const ComposeModalInner = ({ onClose, onSent }) => {
  const [toQuery, setToQuery]       = useState('');
  const [toUsername, setToUsername] = useState('');
  const [tournament, setTournament] = useState('');
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [url, setUrl]               = useState('');
  const [urlLabel, setUrlLabel]     = useState('');
  const [links, setLinks]           = useState([]);
  const [files, setFiles]           = useState([]);
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState('');
  const [closing, setClosing]       = useState(false);
  const fileRef = useRef();

  // Лочимо скрол завжди поки модалка відкрита
  useScrollLock(true);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 320);
  };

  // Закрити по кліку на overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const addLink = () => {
    if (!url.trim()) return;
    setLinks(l => [...l, { url, label: urlLabel || url }]);
    setUrl(''); setUrlLabel('');
  };

  const handleFiles = (e) => setFiles(f => [...f, ...Array.from(e.target.files)]);
  const removeLink  = (i) => setLinks(l => l.filter((_, idx) => idx !== i));
  const removeFile  = (i) => setFiles(f => f.filter((_, idx) => idx !== i));

  const handleSend = async () => {
    const to = toUsername || toQuery;
    if (!to.trim()) { setError("Вкажіть отримувача"); return; }
    if (!body.trim()) { setError("Введіть текст повідомлення"); return; }
    setSending(true); setError('');

    const fd = new FormData();
    fd.append('to_query',   to.trim());
    fd.append('subject',    subject);
    fd.append('text',       body);
    fd.append('tournament', tournament);
    fd.append('links',      JSON.stringify(links));
    files.forEach(f => fd.append('files', f));

    try {
      const res = await fetch(`${API}/notifications/send/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Помилка відправки');
      } else {
        onSent?.();
        handleClose();
      }
    } catch {
      setError("Помилка з'єднання");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`${nStyles.composeOverlay} ${closing ? nStyles.composeOverlayOut : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`${nStyles.composeModal} ${closing ? nStyles.composeModalOut : ''}`}>

        <div className={nStyles.composeHeader}>
          <span className={nStyles.composeTitle}>Нове повідомлення</span>
          <button className={nStyles.composeClose} onClick={handleClose}><CloseIco /></button>
        </div>

        <div className={nStyles.composeBody}>
          <div className={nStyles.composeField}>
            <label>Кому</label>
            <RecipientInput value={toQuery} onChange={setToQuery} onSelect={setToUsername} />
          </div>
          <div className={nStyles.composeField}>
            <label>Турнір</label>
            <input value={tournament} onChange={e => setTournament(e.target.value)} placeholder="Назва турніру (необов'язково)" />
          </div>
          <div className={nStyles.composeField}>
            <label>Тема</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Тема повідомлення" />
          </div>
          <div className={nStyles.composeField}>
            <label>Повідомлення</label>
            <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Текст повідомлення..." />
          </div>
          <div className={nStyles.composeField}>
            <label><span className={nStyles.attachIcon}><LinkIco /></span> Посилання</label>
            <div className={nStyles.linkRow}>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL" />
              <input value={urlLabel} onChange={e => setUrlLabel(e.target.value)} placeholder="Підпис" />
              <button className={nStyles.addBtn} onClick={addLink}>Додати</button>
            </div>
            {links.length > 0 && (
              <div className={nStyles.chipList}>
                {links.map((l, i) => (
                  <span key={i} className={nStyles.chip}>
                    🔗 {l.label}
                    <button onClick={() => removeLink(i)}><CloseIco /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={nStyles.composeField}>
            <label><span className={nStyles.attachIcon}><PaperclipIco /></span> Файли</label>
            <button className={nStyles.attachFileBtn} onClick={() => fileRef.current.click()}>
              + Прикріпити файл
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleFiles} />
            {files.length > 0 && (
              <div className={nStyles.chipList}>
                {files.map((f, i) => (
                  <span key={i} className={nStyles.chip}>
                    📎 {f.name}
                    <button onClick={() => removeFile(i)}><CloseIco /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {error && <p className={nStyles.errorText}>{error}</p>}
        </div>

        <div className={nStyles.composeFooter}>
          <div className={nStyles.footerActions}>
            <button className={nStyles.cancelBtn} onClick={handleClose}>Скасувати</button>
            <button className={nStyles.sendBtn} onClick={handleSend} disabled={sending}>
              <SendIco /> {sending ? 'Надсилається...' : 'Надіслати'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ── ComposeModal — ЗАВЖДИ через портал у document.body ────────────────────────
// Незалежно від того де рендериться батьківський компонент —
// модалка завжди виходить на найвищий рівень DOM,
// тому жоден батьківський overflow/transform/will-change її не ламає.
export const ComposeModal = (props) =>
  ReactDOM.createPortal(<ComposeModalInner {...props} />, document.body);

// ── Dropdown content (shared) ─────────────────────────────────────────────────
const DropdownContent = ({ notifs, loading, onCompose, onMarkAllRead, onMarkOne }) => (
  <div className={nStyles.dropdown}>
    <div className={nStyles.dropHeader}>
      <span className={nStyles.dropTitle}>Сповіщення</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {notifs.some(n => !n.is_read) && (
          <button className={nStyles.markReadBtn} onClick={onMarkAllRead}>Прочитати всі</button>
        )}
        <button className={nStyles.composeBtn} onClick={onCompose}>✉ Написати</button>
      </div>
    </div>
    <div className={nStyles.dropBody}>
      {loading ? (
        <div className={nStyles.empty}><p>Завантаження...</p></div>
      ) : notifs.length === 0 ? (
        <div className={nStyles.empty}>
          <BellEmptyIco />
          <p>Немає нових сповіщень</p>
        </div>
      ) : (
        notifs.map(n => (
          <div
            key={n.id}
            className={`${nStyles.notifItem} ${n.is_read ? '' : nStyles.unread}`}
            onClick={() => !n.is_read && onMarkOne(n.id)}
          >
            {n.sender_full && <span className={nStyles.notifSender}>від {n.sender_full || n.sender}</span>}
            {n.subject     && <p className={nStyles.notifSubject}>{n.subject}</p>}
            <p className={nStyles.notifText}>{n.text}</p>
            {n.tournament  && <span className={nStyles.notifTournament}>🏆 {n.tournament}</span>}
            {n.links?.length > 0 && (
              <div className={nStyles.notifLinks}>
                {n.links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" className={nStyles.notifLink}>
                    🔗 {l.label || l.url}
                  </a>
                ))}
              </div>
            )}
            {n.attachments?.length > 0 && (
              <div className={nStyles.notifLinks}>
                {n.attachments.map((a, i) => (
                  <a key={i} href={`http://127.0.0.1:8000${a.url}`} target="_blank" rel="noreferrer" className={nStyles.notifLink}>
                    📎 {a.name}
                  </a>
                ))}
              </div>
            )}
            <span className={nStyles.notifTime}>{n.created_at}</span>
          </div>
        ))
      )}
    </div>
  </div>
);

// ── Notification Dropdown ─────────────────────────────────────────────────────
export const NotificationDropdown = (props) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Лочимо скрол поки дропдаун відкритий на мобілці
  useScrollLock(isMobile);

  if (isMobile) {
    return ReactDOM.createPortal(
      <>
        <div className={nStyles.mobileBackdrop} onClick={props.onClose} />
        <DropdownContent {...props} />
      </>,
      document.body
    );
  }

  return <DropdownContent {...props} />;
};