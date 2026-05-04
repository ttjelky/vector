import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTabs } from '../../TabsContext';
import { getTabsForRole, COMMON_TABS } from '../../navConfig';
import styles from './styles/NavBar.module.css';
import nStyles from './styles/Notifications.module.css'

import HomeIcon        from './static/icons/Home.svg?react';
import TournamentsIcon from './static/icons/Tournaments.svg?react';
import WorksIcon       from './static/icons/Works.svg?react';
import StatsIcon       from './static/icons/Stats.svg?react';
import SettingsIcon    from './static/icons/Settings.svg?react';
import ProfileIcon     from './static/icons/Profile.svg?react';
import InfoIcon        from './static/icons/Info.svg?react';
import LogoutIcon      from './static/icons/Logout.svg?react';
import BellIcon        from './static/icons/Bell.svg?react';
import Logo            from './static/VectorLogo.svg';
import cross           from './static/icons/cross.svg';
import NewsIcon        from "./static/icons/News.svg?react";

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
  news:        NewsIcon,
};

const renderIcon = (key) => {
  const Icon = ICON_MAP[key] ?? HomeIcon;
  return <Icon className={styles.sidebarIcon} />;
};

/* ─── Один пункт меню ─── */
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

/* ─── Вкладка турніру з анімацією ─── */
// isNew=true  → вкладка щойно додана, програємо анімацію появи
// isNew=false → вкладка вже існувала (навігація між сторінками), одразу visible
const TournamentTab = ({ tab, onClose, isNew }) => {
  const [visible, setVisible] = useState(!isNew);

  useEffect(() => {
    if (!isNew) return;
    // Подвійний rAF: браузер фіксує initial tabHidden, потім застосовує transition
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    setTimeout(() => onClose(tab.id), 250);
  };

  return (
    <div className={`${styles.nestedTournament} ${visible ? styles.tabVisible : styles.tabHidden}`}>
      <NavLink
        to={`/tournament/${tab.id}`}
        className={({ isActive }) =>
          isActive ? styles.activeNestedLink : styles.nestedLink
        }
        title={tab.name}
      >
        <span className={styles.tabName}>└ {tab.name}</span>
        <button
          className={styles.closeIconWrapper}
          onClick={handleClose}
          aria-label={`Закрити ${tab.name}`}
          type="button"
        >
          <img src={cross} className={styles.closeIcon} alt="" />
        </button>
      </NavLink>
    </div>
  );
};

/* ─── Головний компонент ─── */
const NavBar = ({ children }) => {
  const { openTabs, closeTab } = useTabs();
  const navigate = useNavigate();
  const [fullUserName, setFullUserName] = useState('');

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

  const role = localStorage.getItem('userRole') ?? 'participant';
  const roleTabs = getTabsForRole(role);

  // Зберігаємо Set id-шників з ПОПЕРЕДНЬОГО рендеру.
  // Якщо id є в prevIds → вкладка вже існувала → isNew=false (без анімації).
  // Якщо id нема в prevIds → щойно додана → isNew=true (з анімацією).
  // Після рендеру оновлюємо ref поточним станом.
  const prevTabIdsRef = useRef(new Set());

  const currentIds = new Set(openTabs.map((t) => String(t.id)));
  const newTabIds  = new Set(
    [...currentIds].filter((id) => !prevTabIdsRef.current.has(id))
  );
  // Синхронізуємо ref після визначення нових — до наступного рендеру
  prevTabIdsRef.current = currentIds;

  useEffect(() => {
    const storedName = localStorage.getItem('fullUserName');
    if (storedName) setFullUserName(storedName.trim());
    const token = getToken();
    if (token) {
      fetch(`${API}/profile/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.avatar) setAvatar(`http://127.0.0.1:8000${d.avatar}`); })
        .catch(() => {});
    }
  }, []);

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

  return (
    <div className={styles.vectorApp}>

      {/* ── Верхня панель ── */}
      <header className={styles.topNavbar}>

        <div className={styles.navbarLogo}>
          <img src={Logo} alt="Vector" className={styles.logo} />
        </div>

        <div className={styles.search}>
          <input
            type="search"
            placeholder="Пошук..."
            className={styles.searchInput}
          />
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
        <aside className={styles.leftSidebar}>

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
                          isNew={newTabIds.has(String(tab.id))}
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

          <div className={styles.logoutSection}>
            {showLogout && (
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              type="button"
            >
              <LogoutIcon className={styles.logoutIcon} />
              <span className={styles.logoutText}>Вийти</span>
            </button>
            )}
          </div>

        </aside>

        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
      {compose && (
        <ComposeModal onClose={() => setCompose(false)} onSent={fetchNotifs} />
      )}
    </div>
  );
};

export default NavBar;
