import React, { useState, useEffect } from "react";
import { NavBar } from "@shared/components/NavBar";
import { Forgot } from "@features/auth";
import "../styles/SettingsStyle.css";

// ── Inline SVG icons (20px / 1.8 — як іконки сповіщень на Головній) ──────────
const Icon = ({ children }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const MoonIcon   = () => <Icon><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></Icon>;
const BellIcon   = () => <Icon><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Icon>;
const MailIcon   = () => <Icon><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></Icon>;
const SoundIcon  = () => <Icon><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></Icon>;
const MotionIcon = () => <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></Icon>;
const PanelIcon  = () => <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></Icon>;
const LockIcon   = () => <Icon><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>;
const WarmIcon   = () => <Icon><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></Icon>;
const EyeOffIcon = () => <Icon><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></Icon>;

// ── Хелпер: зберегти в localStorage і повідомити інші компоненти ──────────────
const saveSetting = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("settings-updated"));
};

// ── Reusable Toggle Row (клік по всьому рядку, світч як на турнірі) ─────────
const ToggleRow = ({ icon, tile, label, desc, checked, onChange }) => (
  <div
    className="settings-row clickable"
    onClick={onChange}
    role="switch"
    aria-checked={checked}
    aria-label={label}
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(); } }}
  >
    <div className="settings-row-left">
      <div className={`settings-row-icon ${tile || ""}`}>{icon}</div>
      <div className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {desc && <span className="settings-row-desc">{desc}</span>}
      </div>
    </div>
    <button
      type="button"
      className={`switch ${checked ? "switchOn" : ""}`}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      aria-label={label}
      tabIndex={-1}
    >
      <span className="switchKnob" />
    </button>
  </div>
);

// ── Clickable Row ─────────────────────────────────────────────────────────────
const ClickRow = ({ icon, tile, label, desc, onClick }) => (
  <div className="settings-row clickable" onClick={onClick} style={{ cursor: "pointer" }}>
    <div className="settings-row-left">
      <div className={`settings-row-icon ${tile || ""}`}>{icon}</div>
      <div className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {desc && <span className="settings-row-desc">{desc}</span>}
      </div>
    </div>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Settings = () => {
  const get = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };

  const [darkMode,      setDarkMode]      = useState(() => get("setting_dark",   false));
  const [warmMode,      setWarmMode]      = useState(() => get("setting_warm",   false));
  const [reduceMotion,  setReduceMotion]  = useState(() => get("setting_motion", false));
  const [notifications, setNotifications] = useState(() => get("setting_notifs", true));
  const [emailNotifs,   setEmailNotifs]   = useState(() => get("setting_email",  false));
  const [soundNotifs,   setSoundNotifs]   = useState(() => get("setting_sound",  true));
  const [solidSidebar,  setSolidSidebar]  = useState(() => get("setting_sidebar", false));
  const [showLogoutBtn, setShowLogoutBtn] = useState(() => get("setting_logout", true));
  const [forgotOpen,    setForgotOpen]    = useState(false);

  // Темна тема — клас на <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark-theme", darkMode);
    saveSetting("setting_dark", darkMode);
  }, [darkMode]);

  // Зменшення анімацій — клас на <html> (правило в jellyButtons.css)
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    saveSetting("setting_motion", reduceMotion);
  }, [reduceMotion]);

  // Непрозорий сайдбар — клас на <html> (правило в GlassSurface.css)
  useEffect(() => {
    document.documentElement.classList.toggle("solid-sidebar", solidSidebar);
    saveSetting("setting_sidebar", solidSidebar);
  }, [solidSidebar]);

  // Решта — просто зберігаємо + повідомляємо NavBar / WarmOverlay
  useEffect(() => { saveSetting("setting_warm",   warmMode);      }, [warmMode]);
  useEffect(() => { saveSetting("setting_notifs", notifications); }, [notifications]);
  useEffect(() => { saveSetting("setting_email",  emailNotifs);   }, [emailNotifs]);
  useEffect(() => { saveSetting("setting_sound",  soundNotifs);   }, [soundNotifs]);
  useEffect(() => { saveSetting("setting_logout", showLogoutBtn); }, [showLogoutBtn]);

  return (
    <NavBar>
      <div className="settings-page">

        <div className="settings-grid">
        {/* ── Вигляд ── */}
        <div className="settings-section">
          <div className="settings-section-title">Вигляд</div>

          <ToggleRow
            icon={<MoonIcon />}
            tile="tile-purple"
            label="Темна тема"
            desc="Темне оформлення застосунку"
            checked={darkMode}
            onChange={() => setDarkMode(v => !v)}
          />

          <ToggleRow
            icon={<WarmIcon />}
            tile="tile-orange"
            label="Теплий режим"
            desc="Накладає теплий фільтр — зручно ввечері"
            checked={warmMode}
            onChange={() => setWarmMode(v => !v)}
          />

          <ToggleRow
            icon={<MotionIcon />}
            tile="tile-gray"
            label="Зменшити анімації"
            desc="Вимикає желейні переходи та появи"
            checked={reduceMotion}
            onChange={() => setReduceMotion(v => !v)}
          />
        </div>

        {/* ── Сповіщення ── */}
        <div className="settings-section">
          <div className="settings-section-title">Сповіщення</div>

          <ToggleRow
            icon={<BellIcon />}
            tile="tile-blue"
            label="Push-сповіщення"
            desc="Сповіщення всередині застосунку"
            checked={notifications}
            onChange={() => setNotifications(v => !v)}
          />

          <ToggleRow
            icon={<MailIcon />}
            tile="tile-teal"
            label="Email-сповіщення"
            desc="Надсилати важливе на пошту"
            checked={emailNotifs}
            onChange={() => setEmailNotifs(v => !v)}
          />

          <ToggleRow
            icon={<SoundIcon />}
            tile="tile-green"
            label="Звук сповіщень"
            desc="Короткий сигнал про нове сповіщення"
            checked={soundNotifs}
            onChange={() => setSoundNotifs(v => !v)}
          />
        </div>

        {/* ── Безпека ── */}
        <div className="settings-section">
          <div className="settings-section-title">Безпека</div>

          <ClickRow
            icon={<LockIcon />}
            tile="tile-purple"
            label="Оновити пароль"
            desc="Скинути пароль через електронну пошту"
            onClick={() => setForgotOpen(true)}
          />
        </div>

        {/* ── Інтерфейс ── */}
        <div className="settings-section">
          <div className="settings-section-title">Інтерфейс</div>

          <ToggleRow
            icon={<EyeOffIcon />}
            tile="tile-gray"
            label='Кнопка "Вийти" в сайдбарі'
            desc="Показувати або приховати кнопку виходу в меню"
            checked={showLogoutBtn}
            onChange={() => setShowLogoutBtn(v => !v)}
          />

          <ToggleRow
            icon={<PanelIcon />}
            label="Непрозорий сайдбар"
            desc="Суцільний фон меню замість скла"
            checked={solidSidebar}
            onChange={() => setSolidSidebar(v => !v)}
          />
        </div>
        </div>
      </div>

      {/* Forgot password modal */}
      <Forgot
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onBackToLogin={() => setForgotOpen(false)}
      />
    </NavBar>
  );
};

export { Settings };