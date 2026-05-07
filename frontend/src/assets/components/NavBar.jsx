import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTabs } from "../../TabsContext";
import { getTabsForRole, COMMON_TABS } from "../../navConfig";
import styles from './styles/NavBar.module.css';
import nStyles from './styles/Notifications.module.css';

import HomeIcon        from './static/icons/Home.svg?react';
import TournamentsIcon from './static/icons/Tournaments.svg?react';
import WorksIcon       from './static/icons/Works.svg?react';
import StatsIcon       from './static/icons/Works.svg?react';
import SettingsIcon    from './static/icons/Settings.svg?react';
import ProfileIcon     from './static/icons/Profile.svg?react';
import InfoIcon        from './static/icons/Info.svg?react';
import LogoutIcon      from './static/icons/Logout.svg?react';
import BellIcon        from './static/icons/Bell.svg?react';
import Logo            from './static/VectorLogo.svg';
import cross           from './static/icons/cross.svg';

import { ComposeModal, NotificationDropdown } from './Notifications';

const API = 'http://127.0.0.1:8000/api';
const getToken = () => localStorage.getItem('accessToken');

const ICON_MAP = {
  home:        HomeIcon,
  tournaments: TournamentsIcon,
  works:       WorksIcon,
  stats:       StatsIcon,
  settings:    SettingsIcon,
  profile:     ProfileIcon,
  help:        InfoIcon,
};

const renderIcon = (key) => {
  const Icon = ICON_MAP[key] ?? HomeIcon;
  return <Icon className={styles.sidebarIcon} />;
};

const NavItem = ({ tabKey, label, path, children }) => (
  <li className={styles.sidebarEl}>
    <NavLink
      to={path}
      className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}
    >
      {renderIcon(tabKey)}
      <span className={styles.sidebarText}>{label}</span>
    </NavLink>
    {children}
  </li>
);

// ── NavBar ────────────────────────────────────────────────────────────────────
const NavBar = ({ children }) => {
  const { openTabs, closeTab } = useTabs();
  const navigate = useNavigate();

  const [fullUserName, setFullUserName]   = useState('');
  const [avatar, setAvatar]               = useState(null);
  const [bellOpen, setBellOpen]           = useState(false);
  const [compose, setCompose]             = useState(false);
  const [notifs, setNotifs]               = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  // mobile sidebar
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);

  const bellRef    = useRef();
  const sidebarRef = useRef();

  const [showLogout, setShowLogout] = useState(
    () => JSON.parse(localStorage.getItem("setting_logout") ?? "true")
  );

  const role     = localStorage.getItem("userRole") ?? "participant";
  const roleTabs = getTabsForRole(role);

  // ── Профіль ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedName = localStorage.getItem('fullUserName');
    if (storedName) setFullUserName(storedName.trim());

    const token = getToken();
    if (token) {
      fetch(`${API}/users/profile/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.avatar) setAvatar(`http://127.0.0.1:8000${d.avatar}`); })
        .catch(() => {});
    }
  }, []);

  // ── Реалтайм-оновлення після збереження профілю ───────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.fullUserName) setFullUserName(e.detail.fullUserName);
      if (e.detail?.avatar !== undefined) setAvatar(e.detail.avatar);
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  // ── Кнопка виходу ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () =>
      setShowLogout(JSON.parse(localStorage.getItem("setting_logout") ?? "true"));
    window.addEventListener("storage", handler);
    window.addEventListener("settings-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("settings-updated", handler);
    };
  }, []);

  // ── Теплий режим ─────────────────────────────────────────────────────────
  useEffect(() => {
    const applyWarm = () => {
      const warm = JSON.parse(localStorage.getItem("setting_warm") ?? "false");
      document.documentElement.style.filter = warm
        ? "sepia(0.25) saturate(1.1) brightness(0.98)"
        : "";
    };
    applyWarm(); // застосувати одразу при маунті
    window.addEventListener("settings-updated", applyWarm);
    window.addEventListener("storage", applyWarm);
    return () => {
      window.removeEventListener("settings-updated", applyWarm);
      window.removeEventListener("storage", applyWarm);
    };
  }, []);

  // ── Закрити sidebar по кліку поза ────────────────────────────────────────
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        closeSidebar();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [sidebarOpen]);

  const closeSidebar = () => {
    setSidebarClosing(true);
    setTimeout(() => {
      setSidebarOpen(false);
      setSidebarClosing(false);
    }, 320);
  };

  // ── Сповіщення ───────────────────────────────────────────────────────────
  const fetchNotifs = async () => {
    setNotifsLoading(true);
    try {
      const res = await fetch(`${API}/notifications/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setNotifs(await res.json());
    } catch {}
    finally { setNotifsLoading(false); }
  };

  const handleBellClick = () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) fetchNotifs();
  };

  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  const markAllRead = async () => {
    await fetch(`${API}/notifications/mark-read/`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
  };

  const markOneRead = async (id) => {
    await fetch(`${API}/notifications/mark-read/${id}/`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('fullUserName');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const hasUnread = notifs.some(n => !n.is_read);

  // ── Sidebar content (shared desktop + mobile) ─────────────────────────────
  const SidebarContent = () => (
    <>
      <nav className={styles.primaryNav}>
        <h3 className={styles.sidebarSectionTitle}>Меню</h3>
        <ul>
          {roleTabs.map(({ key, label, path }) => (
            <NavItem key={key} tabKey={key} label={label} path={path}>
              {key === 'home' && openTabs.length > 0 && (
                <div className={styles.openedList}>
                  {openTabs.map((tab) => (
                    <div key={tab.id} className={styles.nestedTournament}>
                      <div className={styles.treeLine} />
                      <NavLink
                        to={`/tournament/${tab.id}`}
                        className={({ isActive }) =>
                          isActive ? styles.activeNestedLink : styles.nestedLink
                        }
                        onClick={closeSidebar}
                      >
                        <span className={styles.tabName}>└ {tab.name}</span>
                        <span
                          className={styles.closeIconWrapper}
                          onClick={(e) => { e.preventDefault(); closeTab(tab.id); }}
                        >
                          <img src={cross} className={styles.closeIcon} alt="закрити" />
                        </span>
                      </NavLink>
                    </div>
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

      <div className={styles.logoutSection}>
        {showLogout && (
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogoutIcon className={styles.logoutIcon} />
            <span className={styles.logoutText}>Вийти</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className={styles.vectorApp}>

        {/* ── Top navbar ── */}
        <header className={styles.topNavbar}>

          {/* Burger (mobile only) */}
          <button
            className={`${styles.burgerBtn} ${sidebarOpen ? styles.burgerOpen : ''}`}
            onClick={() => sidebarOpen ? closeSidebar() : setSidebarOpen(true)}
            aria-label="Меню"
          >
            <span /><span /><span />
          </button>

          {/* Лого */}
          <div className={styles.navbarLogo}>
            <img src={Logo} alt="Vector" className={styles.logo} />
          </div>

          <div className={styles.search}>
            <input type="search" placeholder="Пошук..." className={styles.searchInput} />
          </div>

          <div className={styles.navbarUserActions}>
            <span className={styles.userName}>{fullUserName}</span>
            {avatar
              ? <img src={avatar} alt="avatar" className={styles.navbarAvatar} />
              : (
                <div className={styles.navbarAvatarPlaceholder}>
                  {fullUserName?.[0]?.toUpperCase() || '?'}
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
                  notifs={notifs}
                  loading={notifsLoading}
                  onClose={() => setBellOpen(false)}
                  onCompose={() => { setBellOpen(false); setCompose(true); }}
                  onMarkAllRead={markAllRead}
                  onMarkOne={markOneRead}
                />
              )}
            </div>
          </div>
        </header>

        <div className={styles.mainWrapper}>

          {/* ── Desktop sidebar ── */}
          <aside className={styles.leftSidebar}>
            <SidebarContent />
          </aside>

          {/* ── Mobile sidebar overlay ── */}
          {sidebarOpen && (
            <div className={`${styles.mobileOverlay} ${sidebarClosing ? styles.mobileOverlayOut : ''}`}>
              <aside
                className={`${styles.mobileSidebar} ${sidebarClosing ? styles.mobileSidebarOut : ''}`}
                ref={sidebarRef}
              >
                <div className={styles.mobileSidebarUser}>
                  {avatar
                    ? <img src={avatar} alt="avatar" className={styles.mobileAvatar} />
                    : (
                      <div className={styles.mobileAvatarPlaceholder}>
                        {fullUserName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )
                  }
                  <div className={styles.mobileUserInfo}>
                    <span className={styles.mobileUserName}>{fullUserName}</span>
                  </div>
                  <button className={styles.mobileSidebarClose} onClick={closeSidebar}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div className={styles.mobileBellRow}>
                  <div className={nStyles.bellWrap}>
                    <button
                      className={`${nStyles.bellBtn} ${styles.mobileBellBtn}`}
                      onClick={handleBellClick}
                      aria-label="Сповіщення"
                    >
                      <BellIcon className={styles.notificationIcon} />
                      {hasUnread && <span className={nStyles.badge} />}
                    </button>
                    <span className={styles.mobileBellLabel}>Сповіщення</span>
                  </div>
                </div>

                <SidebarContent />
              </aside>
            </div>
          )}

          <main className={styles.contentArea}>
            {children}
          </main>
        </div>
      </div>

      {compose && (
        <ComposeModal onClose={() => setCompose(false)} onSent={fetchNotifs} />
      )}
    </>
  );
};

export default NavBar;