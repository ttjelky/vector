import React, { useState, useEffect } from 'react';
import { href, useNavigate } from 'react-router-dom';
import { Link, NavLink } from 'react-router-dom';
import styles from './styles/NavBar.module.css';
import HomeIcon from './static/icons/Home.svg?react';
import TournamentsIcon from './static/icons/Tournaments.svg?react';
import WorksIcon from './static/icons/Works.svg?react';
import SettingsIcon from './static/icons/Settings.svg?react';
import ProfileIcon from './static/icons/Profile.svg?react';
import InfoIcon from './static/icons/Info.svg?react';
import LogoutIcon from './static/icons/Logout.svg?react';
import BellIcon from './static/icons/Bell.svg?react';
import Logo from './static/VectorLogo.svg';

const NavBar = ({children}) => {
  const navigate = useNavigate();
  const [fullUserName, setFullUserName] = useState('');

  useEffect(() => {
        const storedName = localStorage.getItem('fullUserName');
        if (storedName) {
            setFullUserName(storedName.trim());
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('fullUserName');
        navigate('/');
    };
  return (
    <div className={styles.vectorApp}>
      
      <header className={styles.topNavbar}>
        <div className={styles.navbarLogo}>
          <img src={Logo} alt="Vector" style={{scale: 0.85}} />
        </div>

        {/* Пошук */}
        <div className={styles.search}>
          <input type="search" placeholder="Пошук..." className={styles.searchInput} />
        </div>

        <div className={styles.navbarUserActions}>
          <span className={styles.userName}>{fullUserName}</span>
          <button className={styles.notificationBtn} aria-label="Сповіщення">
            <BellIcon alt="Сповіщення" className={styles.notificationIcon} />
          </button>
        </div>
      </header>

      {/* --- ОСНОВНА ОБЛАСТЬ, ПОДІЛЕНА НА САЙДБАР ТА КОНТЕНТ --- */}
      <div className={styles.mainWrapper}>
        
        {/* --- 2. ЛІВИЙ САЙДБАР (LEFT SIDEBAR) --- */}
        <aside className={styles.leftSidebar}>
          {/* Основне меню (Меню) */}
          <nav className={styles.primaryNav}>
            <h3 className={styles.sidebarSectionTitle}>Меню</h3>
            <ul>
              <li className={styles.sidebarEl}>
<<<<<<< HEAD
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}>
=======
                <NavLink to="/admindashboard" className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}>
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
                  <HomeIcon className={styles.sidebarIcon}/> <span className={styles.sidebarText}>Головна</span>
                </NavLink>
              </li>
              <li className={styles.sidebarEl}>
                <NavLink to="/tournaments" className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}>
                  <TournamentsIcon className={styles.sidebarIcon} /> <span className={styles.sidebarText}>Турніри</span>
                </NavLink>
              </li>
              <li className={styles.sidebarEl}>
                <NavLink to="/works" className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}>
                  <WorksIcon className={styles.sidebarIcon} /> <span className={styles.sidebarText}>Мої роботи</span>
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* Розділ "Інше" */}
          <nav className={styles.secondaryNav}>
            <h3 className={styles.sidebarSectionTitle}>Інше</h3>
            <ul>
              <li className={styles.sidebarEl}>
                <NavLink to="/settings" className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}>
                  <SettingsIcon className={styles.sidebarIcon} /> <span className={styles.sidebarText}>Налаштування</span>
                </NavLink>
              </li>
              <li className={styles.sidebarEl}>
                <NavLink to="/profile" className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}>
                  <ProfileIcon className={styles.sidebarIcon} /> <span className={styles.sidebarText}>Мій профіль</span>
                </NavLink>
              </li>
              <li className={styles.sidebarEl}>
                <NavLink to="/help" className={({ isActive }) => isActive ? styles.activeLink : styles.inactiveLink}>
                  <InfoIcon className={styles.sidebarIcon} /> <span className={styles.sidebarText}>Допомога</span>
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* Розділ "Вийти" у самому низу */}
          <div className={styles.logoutSection}>
            <a href="/" className={styles.logoutBtn}>
              <LogoutIcon className={styles.logoutIcon}/> <span className={styles.logoutText}>Вийти</span>
            </a>
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