import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTabs } from '../../TabsContext';
import { getTabsForRole, COMMON_TABS } from '../../navConfig';
import styles from './styles/NavBar.module.css';

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
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('fullUserName');
    localStorage.removeItem('userRole');
    navigate('/');
  };

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
          <button className={styles.notificationBtn} aria-label="Сповіщення">
            <BellIcon className={styles.notificationIcon} />
          </button>
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
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              type="button"
            >
              <LogoutIcon className={styles.logoutIcon} />
              <span className={styles.logoutText}>Вийти</span>
            </button>
          </div>

        </aside>

        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default NavBar;
