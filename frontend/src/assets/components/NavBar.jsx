import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useTabs } from "../../TabsContext";
import { getTabsForRole, COMMON_TABS } from "../../navConfig";
import styles from "./styles/NavBar.module.css";
import nStyles from "./styles/Notifications.module.css";

import HomeIcon        from "./static/icons/Home.svg?react";
import TournamentsIcon from "./static/icons/Tournaments.svg?react";
import WorksIcon       from "./static/icons/Works.svg?react";
import SettingsIcon    from "./static/icons/Settings.svg?react";
import ProfileIcon     from "./static/icons/Profile.svg?react";
import InfoIcon        from "./static/icons/Info.svg?react";
import LogoutIcon      from "./static/icons/Logout.svg?react";
import BellIcon        from "./static/icons/Bell.svg?react";
import Logo            from "./static/VectorLogo.svg";
import cross           from "./static/icons/cross.svg";
import NewsIcon        from "./static/icons/News.svg?react";

import { ComposeModal, NotificationDropdown } from './Notifications';
import { mediaUrl, getAccessToken, getUserRole, clearAccessToken, logoutUser } from '../../api';
import { useSearch } from '../../SearchContext';
import SearchOverlay from './SearchOverlay';
import { ConfirmDeleteModal } from './TournamentShared';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000/api';
const getToken = () => getAccessToken();

const ICON_MAP = {
  home:        HomeIcon,
  tournaments: TournamentsIcon,
  works:       WorksIcon,
  settings:    SettingsIcon,
  profile:     ProfileIcon,
  help:        InfoIcon,
  news:        NewsIcon,
};

const renderIcon = (key, isMobile = false) => {
  const Icon = ICON_MAP[key] ?? HomeIcon;
  return <Icon className={isMobile ? styles.mobileNavIcon : styles.sidebarIcon} />;
};

/* ─── Nav item ─── */
const NavItem = ({ tabKey, label, path, children, onNavClick, mobile }) => (
  <li style={mobile ? { marginBottom: 4, listStyle: 'none' } : undefined}>
    <NavLink
      to={path}
      className={({ isActive }) => isActive
        ? (mobile ? styles.mobileActiveLink : styles.activeLink)
        : (mobile ? styles.mobileInactiveLink : styles.inactiveLink)
      }
      onClick={onNavClick}
    >
      {renderIcon(tabKey, mobile)}
      <span className={mobile ? styles.mobileSidebarText : styles.sidebarText}>{label}</span>
    </NavLink>
    {children}
  </li>
);

/* ─── Tournament tab ─── */
const TournamentTab = ({ tab, onClose, animate, onNavClick }) => {
  const [phase, setPhase] = useState(animate ? 'hidden' : 'open');

  useEffect(() => {
    if (!animate) return;
    const raf = requestAnimationFrame(() => setPhase('opening'));
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPhase("closing");
    setTimeout(() => onClose(tab.id), 250);
  };

  const cls = [
    styles.nestedTournament,
    phase === "hidden"  ? styles.tabHidden  : "",
    phase === "opening" ? styles.tabOpening : "",
    phase === "closing" ? styles.tabClosing : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      <NavLink
        to={`/tournament/${tab.id}`}
        className={({ isActive }) => isActive ? styles.activeNestedLink : styles.nestedLink}
        title={tab.name}
        onClick={onNavClick}
      >
        <span className={styles.tabName}>└ {tab.name}</span>
        <button className={styles.closeIconWrapper} onClick={handleClose}
          aria-label={`Закрити ${tab.name}`} type="button">
          <img src={cross} className={styles.closeIcon} alt="" />
        </button>
      </NavLink>
    </div>
  );
};

/* ─── Polling hook ─── */
const useTournamentRemovalPolling = (openTabs, removeTabById) => {
  useEffect(() => {
    if (!openTabs.length) return;
    const check = async () => {
      for (const tab of openTabs) {
        try {
          const res = await fetch(`${API_BASE}/tournaments/${tab.id}/my-role/`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (res.status === 403 || res.status === 404) removeTabById(tab.id);
        } catch (err) {
          if (err.response?.status === 403 || err.response?.status === 404) {
            removeTabById(tab.id);
          }
        }
      }
    };
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [openTabs, removeTabById]);
};

/* ─── Burger button ─── */
const BurgerButton = ({ isOpen, onClick }) => (
  <button
    className={`${styles.burgerBtn} ${isOpen ? styles.burgerBtnOpen : ''}`}
    onClick={onClick}
    aria-label={isOpen ? 'Закрити меню' : 'Відкрити меню'}
    type="button"
  >
    <span className={styles.burgerLine} />
    <span className={styles.burgerLine} />
    <span className={styles.burgerLine} />
  </button>
);

/* ─── Main NavBar ─── */
const NavBar = ({ children }) => {
  const { openTabs, closeTab, removeTabById } = useTabs();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();

  // Сторінки де пошук фільтрує вбудований список — оверлей не потрібен
  const TOURNAMENT_PATHS = ["/tournaments", "/admin/tournaments", "/participant/tournaments"];
  const isOnTournamentsPage = TOURNAMENT_PATHS.some(p => location.pathname.startsWith(p));

  // Стан оверлею
  const [overlayOpen,    setOverlayOpen]    = useState(false);
  const [searchResults,  setSearchResults]  = useState([]);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const searchDebounce = useRef(null);

  // Debounced пошук через API
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q || isOnTournamentsPage) {
      setOverlayOpen(false);
      setSearchResults([]);
      return;
    }

    setOverlayOpen(true);
    setSearchLoading(true);

    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      try {
        // Спочатку пробуємо пошук через API (?search=)
        const res = await fetch(
          `${API_BASE}/tournaments/?search=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const all = Array.isArray(data) ? data : (data.results ?? []);

          // Якщо API повернув результати — перевіряємо чи він справді фільтрує.
          // Якщо всі результати не відповідають запиту — фільтруємо самостійно на клієнті.
          const lower = q.toLowerCase();
          const filtered = all.filter(t =>
            t.name?.toLowerCase().includes(lower)
          );

          // Якщо після клієнтського фільтру є результати — показуємо їх.
          // Якщо filtered порожній, але all не порожній — API не фільтрує,
          // тому показуємо filtered (порожній список "не знайдено").
          // Якщо all порожній — API сам вже відфільтрував правильно.
          setSearchResults(all.length === 0 ? [] : filtered);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounce.current);
  }, [searchQuery, isOnTournamentsPage]);

  // Закриваємо оверлей при переході на іншу сторінку
  useEffect(() => {
    setOverlayOpen(false);
  }, [location.pathname]);

  const handleCloseOverlay = useCallback(() => {
    setOverlayOpen(false);
    clearSearch();
  }, [clearSearch]);
  const [fullUserName, setFullUserName] = useState('');
  const [avatar, setAvatar]             = useState(null);

  const [bellOpen, setBellOpen]           = useState(false);
  const [compose, setCompose]             = useState(false);
  const [notifs, setNotifs]               = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  const [mobileOpen, setMobileOpen]       = useState(false);
  const [mobileClosing, setMobileClosing] = useState(false);

  const bellRef = useRef();

  const [showLogout, setShowLogout] = useState(
    () => JSON.parse(localStorage.getItem("setting_logout") ?? "true")
  );
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useTournamentRemovalPolling(openTabs, removeTabById);

  // Settings sync
  useEffect(() => {
    const sync = () => setShowLogout(JSON.parse(localStorage.getItem("setting_logout") ?? "true"));
    window.addEventListener("settings-updated", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("settings-updated", sync); window.removeEventListener("storage", sync); };
  }, []);

  // Warm filter
  useEffect(() => {
    const applyWarm = () => {
      const warm = JSON.parse(localStorage.getItem("setting_warm") ?? "false");
      document.documentElement.style.filter = warm ? "sepia(0.25) saturate(1.1) brightness(0.98)" : "";
    };
    applyWarm();
    window.addEventListener("settings-updated", applyWarm);
    window.addEventListener("storage", applyWarm);
    return () => { window.removeEventListener("settings-updated", applyWarm); window.removeEventListener("storage", applyWarm); };
  }, []);

  // Роль — спочатку з пам'яті (безпечно), fallback на localStorage для UI
  const role     = getUserRole() ?? localStorage.getItem("userRole") ?? "participant";
  const roleTabs = getTabsForRole(role);

  const initialTabIds = useRef(new Set(openTabs.map((t) => String(t.id))));

  // ── Початкове завантаження профілю ───────────────────────────────────────
  useEffect(() => {
    const storedName = localStorage.getItem("fullUserName");
    if (storedName) setFullUserName(storedName.trim());

    const token = getToken();
    if (token) {
      fetch(`${API_BASE}/users/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.avatar) setAvatar(mediaUrl(d.avatar));
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.fullUserName) setFullUserName(e.detail.fullUserName);
      // avatar вже абсолютний URL (підготовлений у Profile.jsx через mediaUrl)
      if (e.detail?.avatar !== undefined) setAvatar(e.detail.avatar);
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  // Mobile sidebar scroll lock
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') closeMobile(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileOpen]);

  const openMobile  = () => { setMobileClosing(false); setMobileOpen(true); };
  const closeMobile = () => {
    setMobileClosing(true);
    setTimeout(() => { setMobileOpen(false); setMobileClosing(false); }, 320);
  };
  const handleNavClick = () => { if (mobileOpen) closeMobile(); };

  // Bell
  const fetchNotifs = async () => {
    setNotifsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setNotifs(await res.json());
    } catch {} finally { setNotifsLoading(false); }
  };

  const handleBellClick = () => { const next = !bellOpen; setBellOpen(next); if (next) fetchNotifs(); };

  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  const markAllRead = async () => {
    await fetch(`${API_BASE}/notifications/mark-read/`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
  };

  const markOneRead = async (id) => {
    await fetch(`${API_BASE}/notifications/mark-read/${id}/`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const handleLogout = (e) => {
    e.preventDefault();
    setLogoutConfirm(true);
  };

  const doLogout = async () => {
    setLogoutLoading(true);
    try {
      await logoutUser();
    } catch {}

    // ── Повне очищення стану ──────────────────────────────────────────────
    clearAccessToken();                          // access token + роль з пам'яті

    // Актуальні ключі
    localStorage.removeItem("userRole");
    localStorage.removeItem("fullUserName");
    // Legacy-ключі старого коду
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");

    // Скидаємо локальний UI-стан навбару
    setFullUserName("");
    setAvatar(null);
    setNotifs([]);
    setBellOpen(false);

    window.dispatchEvent(new Event("auth-changed"));
    navigate("/");
  };

  const hasUnread = notifs.some((n) => !n.is_read);

  // ── Desktop nav content ────────────────────────────────────────────────────
  const desktopNavContent = () => (
    <>
      <nav className={styles.primaryNav}>
        <h3 className={styles.sidebarSectionTitle}>Меню</h3>
        <ul>
          {roleTabs.map(({ key, label, path }) => (
            <NavItem key={key} tabKey={key} label={label} path={path}>
              {key === 'tournaments' && openTabs.length > 0 && (
                <div className={styles.openedList}>
                  {openTabs.map((tab) => (
                    <TournamentTab
                      key={tab.id}
                      tab={tab}
                      onClose={closeTab}
                      animate={!initialTabIds.current.has(String(tab.id))}
                    />
                  ))}
                </div>
              )}
            </NavItem>
          ))}
        </ul>
      </nav>
      <nav className={styles.secondaryNav}>
        <h3 className={styles.sidebarSectionTitle}>Інше</h3>
        <ul>
          {COMMON_TABS.map(({ key, label, path }) => (
            <NavItem key={key} tabKey={key} label={label} path={path} />
          ))}
        </ul>
      </nav>
    </>
  );

  // ── Mobile nav content — uses inline styles to bypass CSS Modules scoping ──
  const mobileNavContent = () => (
    <>
      {/* МЕНЮ */}
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: '#aab0bc',
          margin: '0 0 8px 12px',
        }}>Меню</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {roleTabs.map(({ key, label, path }) => (
            <NavItem key={key} tabKey={key} label={label} path={path} onNavClick={handleNavClick} mobile>
              {key === 'tournaments' && openTabs.length > 0 && (
                <div className={styles.openedList}>
                  {openTabs.map((tab) => (
                    <TournamentTab
                      key={tab.id}
                      tab={tab}
                      onClose={closeTab}
                      animate={!initialTabIds.current.has(String(tab.id))}
                      onNavClick={handleNavClick}
                    />
                  ))}
                </div>
              )}
            </NavItem>
          ))}
        </ul>
      </div>

      {/* ІНШЕ */}
      <div>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: '#aab0bc',
          margin: '0 0 8px 12px',
        }}>Інше</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {COMMON_TABS.map(({ key, label, path }) => (
            <NavItem key={key} tabKey={key} label={label} path={path} onNavClick={handleNavClick} mobile />
          ))}
        </ul>
      </div>
    </>
  );

  return (
    <div className={styles.vectorApp}>

      {/* ── Topbar ── */}
      <header className={styles.topNavbar}>
        <BurgerButton isOpen={mobileOpen} onClick={mobileOpen ? closeMobile : openMobile} />

        <div className={styles.navbarLogo}>
          <img src={Logo} alt="Vector" className={styles.logo} />
        </div>

        <div className={styles.search}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4, flexShrink: 0 }}>
            <circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/>
          </svg>
          <input
            type="search"
            placeholder="Пошук турнірів..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {overlayOpen && (
          <SearchOverlay
            results={searchResults}
            loading={searchLoading}
            onClose={handleCloseOverlay}
          />
        )}

        <div className={styles.navbarUserActions}>
          <span className={styles.userName}>{fullUserName}</span>
          {avatar
            ? <img src={avatar} alt="avatar" className={styles.navbarAvatar} />
            : (
              <div className={styles.navbarAvatarPlaceholder}>
                {fullUserName?.[0]?.toUpperCase() || "?"}
              </div>
            )
          }
          <div className={nStyles.bellWrap} ref={bellRef}>
            <button className={nStyles.bellBtn} aria-label="Сповіщення" onClick={handleBellClick}>
              <BellIcon className={styles.notificationIcon} />
              {hasUnread && <span className={nStyles.badge} />}
            </button>
            {bellOpen && (
              <NotificationDropdown
                notifs={notifs} loading={notifsLoading}
                onClose={() => setBellOpen(false)}
                onCompose={() => { setBellOpen(false); setCompose(true); }}
                onMarkAllRead={markAllRead} onMarkOne={markOneRead}
              />
            )}
          </div>
        </div>
      </header>

      <div className={styles.mainWrapper}>
        {/* ── Desktop sidebar ── */}
        <aside className={`${styles.leftSidebar} ${styles.desktopSidebar}`}>
          {desktopNavContent()}
          <div className={styles.logoutSection}>
            {showLogout && (
              <button onClick={handleLogout} className={styles.logoutBtn} type="button">
                <LogoutIcon className={styles.logoutIcon} style={{ color: "rgb(215,125,126)", fill: "rgb(215,125,126)" }} />
                <span className={styles.logoutText}>Вийти</span>
              </button>
            )}
          </div>
        </aside>

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <div
            className={`${styles.mobileOverlay} ${mobileClosing ? styles.mobileOverlayClosing : styles.mobileOverlayOpen}`}
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile sidebar drawer ── */}
        {mobileOpen && (
          <aside className={`${styles.mobileSidebar} ${mobileClosing ? styles.mobileSidebarClosing : styles.mobileSidebarOpen}`}>

            {/* Logo header */}
            <div className={styles.mobileSidebarHeader}>
              <img src={Logo} alt="Vector" className={styles.mobileSidebarLogo} />
            </div>

            {/* Nav body — inline styles bypass CSS Modules scoping */}
            <div className={styles.mobileSidebarBody}>
              {mobileNavContent()}
            </div>

            {/* Logout footer */}
            <div className={styles.mobileSidebarFooter}>
              {showLogout && (
                <div className={styles.logoutSection}>
                  <button onClick={handleLogout} className={styles.logoutBtn} type="button">
                    <LogoutIcon className={styles.logoutIcon} style={{ color: 'rgb(215,125,126)', fill: 'rgb(215,125,126)' }} />
                    <span className={styles.logoutText}>Вийти</span>
                  </button>
                </div>
              )}
            </div>

          </aside>
        )}

        {/* ── Main content ── */}
        <main className={styles.contentArea}>
          {children}
        </main>

      </div>

      {compose && <ComposeModal onClose={() => setCompose(false)} onSent={fetchNotifs} />}

      {logoutConfirm && (
        <ConfirmDeleteModal
          icon="🚪"
          title="Вийти з акаунту?"
          description="Ви впевнені, що хочете вийти? Всі незбережені дані буде втрачено."
          confirmLabel="Так, вийти"
          onConfirm={doLogout}
          onCancel={() => setLogoutConfirm(false)}
          loading={logoutLoading}
        />
      )}
    </div>
  );
};

export default NavBar;