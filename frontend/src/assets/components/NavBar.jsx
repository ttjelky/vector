import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTabs } from "../../TabsContext";
import { getTabsForRole, COMMON_TABS } from "../../navConfig";
import styles from './styles/NavBar.module.css';

// Імпорти іконок
import HomeIcon       from './static/icons/Home.svg?react';
import TournamentsIcon from './static/icons/Tournaments.svg?react';
import WorksIcon      from './static/icons/Works.svg?react';
import StatsIcon      from './static/icons/Stats.svg?react';
import SettingsIcon   from './static/icons/Settings.svg?react';
import ProfileIcon    from './static/icons/Profile.svg?react';
import InfoIcon       from './static/icons/Info.svg?react';
import LogoutIcon     from './static/icons/Logout.svg?react';
import BellIcon       from './static/icons/Bell.svg?react';
import Logo           from './static/VectorLogo.svg';
import cross          from './static/icons/cross.svg';

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

const NavBar = ({ children }) => {
  const { openTabs, closeTab } = useTabs();
  const navigate = useNavigate();
  const [fullUserName, setFullUserName] = useState('');

  const role = localStorage.getItem("userRole") ?? "participant";
  const roleTabs = getTabsForRole(role);

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
          <input type="search" placeholder="Пошук..." className={styles.searchInput} />
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
                          >
                            <span className={styles.tabName}>└ {tab.name}</span>
                            <span
                              className={styles.closeIconWrapper}
                              onClick={(e) => {
                                e.preventDefault();
                                closeTab(tab.id);
                              }}
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
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
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
