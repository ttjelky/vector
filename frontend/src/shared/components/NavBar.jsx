import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useTabs } from "@shared/contexts/TabsContext";
import { getTabsForRole, COMMON_TABS } from "@nav";
import styles from "@shared/styles/NavBar.module.css";
import nStyles from "@shared/styles/Notifications.module.css";

import { House, Trophy, FileText, Settings, User, CircleHelp, LogOut, Newspaper, X } from "lucide-react";
import BellIcon        from "@static/icons/Bell.svg?react";
import Logo            from "@static/VectorLogo.png";

import { ComposeModal, NotificationDropdown } from './Notifications';
import { mediaUrl, getAccessToken, getUserRole, clearAccessToken, logoutUser } from '@api';
import { useSearch } from '@shared/contexts/SearchContext';
import { SearchOverlay } from './SearchOverlay';
import { ConfirmDeleteModal } from "@features/tournaments";
import GlassSurface from "./GlassSurface";

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';
const getToken = () => getAccessToken();

const ICON_MAP = {
  home:        House,
  tournaments: Trophy,
  works:       FileText,
  settings:    Settings,
  profile:     User,
  help:        CircleHelp,
  news:        Newspaper,
  logout:      LogOut,
};

const renderIcon = (key, isMobile = false) => {
  const Icon = ICON_MAP[key] ?? House;
  return <Icon className={isMobile ? styles.mobileNavIcon : styles.sidebarIcon} strokeWidth={1.8} />;
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
          <X className={styles.closeIcon} strokeWidth={2} />
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

/* ─── Animated Search ─── */
const MobileSearch = ({ onSearch }) => {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  const expand = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const collapse = () => {
    setExpanded(false);
    inputRef.current?.blur();
    onSearch("");
  };

  // Клік поза або Escape — звужуємо
  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) collapse();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') collapse();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  return (
    <div
      ref={wrapRef}
      className={`${styles.search} ${expanded ? styles.searchExpanded : ''}`}
      onClick={!expanded ? expand : undefined}
      onKeyDown={!expanded ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand(); } } : undefined}
      style={{ cursor: expanded ? 'text' : 'pointer' }}
      role={!expanded ? 'button' : undefined}
      tabIndex={!expanded ? 0 : undefined}
      aria-label="Пошук турнірів"
      aria-expanded={expanded}
    >
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={100}
        backgroundOpacity={0.7}
        saturation={1.6}
        className={`${styles.searchGlass} glass-surface--solid`}
      >
      <svg
        width="16" height="16" viewBox="0 0 20 20"
        fill="none" stroke="#111" strokeWidth="2"
        style={{ flexShrink: 0 }}
      >
        <circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/>
      </svg>
      <input
        ref={inputRef}
        type="search"
        placeholder="Пошук..."
        className={styles.searchInput}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={expand}
        tabIndex={expanded ? 0 : -1}
        style={{ pointerEvents: expanded ? 'auto' : 'none' }}
      />
      {expanded && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); collapse(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 2px', display: 'flex', alignItems: 'center',
            flexShrink: 0, color: '#aaa', fontSize: 18, lineHeight: 1,
            transition: 'color 0.15s',
          }}
          aria-label="Закрити пошук"
        >
          ×
        </button>
      )}
      </GlassSurface>
    </div>
  );
};

/* ─── Main NavBar ─── */
const NavBar = ({ children }) => {
  const { openTabs, closeTab, removeTabById } = useTabs();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();

  // Сторінки де пошук фільтрує вбудований список — оверлей не потрібен
  const TOURNAMENT_PATHS = ["/tournaments", "/admin/tournaments", "/participant/tournaments"];
  const isOnTournamentsPage = TOURNAMENT_PATHS.some(p => location.pathname.startsWith(p));

  // Сторінка турніру — щільніше скло сайдбара: сильніший блюр і фрост
  const isTournamentPage = location.pathname.startsWith("/tournament/");

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
        const res = await fetch(
          `${API_BASE}/tournaments/?search=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const all = Array.isArray(data) ? data : (data.results ?? []);

          const lower = q.toLowerCase();
          const filtered = all.filter(t =>
            t.name?.toLowerCase().includes(lower)
          );

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
  const notifPanelRef = useRef();

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

  const role     = getUserRole() ?? localStorage.getItem("userRole") ?? "participant";
  const roleTabs = getTabsForRole(role);
  const homePath = role === "admin" ? "/admindashboard" : role === "jury" ? "/jury" : "/dashboard";

  const initialTabIds = useRef(new Set(openTabs.map((t) => String(t.id))));

  // Профіль
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
      if (e.detail?.avatar !== undefined) setAvatar(e.detail.avatar);
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  // Mobile scroll lock
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

  const handleBellClick = () => {
    if (bellOpen) {
      // Закриваємо з анімацією через сам дропдаун
      notifPanelRef.current?.close();
      return;
    }
    setBellOpen(true);
    fetchNotifs();
  };

  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        notifPanelRef.current?.close();
      }
    };
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

    clearAccessToken();
    localStorage.removeItem("userRole");
    localStorage.removeItem("fullUserName");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    setFullUserName("");
    setAvatar(null);
    setNotifs([]);
    setBellOpen(false);
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/");
  };

  const hasUnread = notifs.some((n) => !n.is_read);

  // ── Desktop nav content ──────────────────────────────────────────────────
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
                      key={tab.id} tab={tab} onClose={closeTab}
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

  // ── Mobile nav content ──────────────────────────────────────────────────
  const mobileNavContent = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <p style={{
          fontSize: 14, fontWeight: 500, color: '#111',
          margin: '0 0 4px 12px',
        }}>Меню</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {roleTabs.map(({ key, label, path }) => (
            <NavItem key={key} tabKey={key} label={label} path={path} onNavClick={handleNavClick} mobile>
              {key === 'tournaments' && openTabs.length > 0 && (
                <div className={styles.openedList}>
                  {openTabs.map((tab) => (
                    <TournamentTab
                      key={tab.id} tab={tab} onClose={closeTab}
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
      <div>
        <p style={{
          fontSize: 14, fontWeight: 500, color: '#111',
          margin: '0 0 4px 12px',
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

        <NavLink to={homePath} className={styles.navbarLogo} aria-label="На головну">
          <img src={Logo} alt="Vector" className={styles.logo} />
        </NavLink>

        <MobileSearch onSearch={setSearchQuery} />

        {overlayOpen && (
          <SearchOverlay
            results={searchResults}
            loading={searchLoading}
            onClose={handleCloseOverlay}
          />
        )}

        <div className={`${styles.navbarUserActions} ${styles.userShell}`} ref={bellRef}>
          <GlassSurface
            width="auto"
            height="auto"
            borderRadius={100}
            backgroundOpacity={0.7}
            saturation={1.6}
            className={`${styles.userPill} glass-surface--solid ${styles.userPillClickable}`}
            onClick={() => navigate("/profile")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/profile"); } }}
            role="link"
            tabIndex={0}
            aria-label="Мій профіль"
            title="Мій профіль"
          >
            {avatar
              ? <img src={avatar} alt="avatar" className={styles.navbarAvatar} />
              : (
                <div className={styles.navbarAvatarPlaceholder}>
                  {fullUserName?.[0]?.toUpperCase() || "?"}
                </div>
              )
            }
            <span className={styles.userName}>{fullUserName}</span>
          </GlassSurface>
          <GlassSurface
            width={50}
            height={50}
            borderRadius={100}
            className={`${styles.bellCircle} glass-surface--solid`}
          >
            <button className={`${nStyles.bellBtn} ${styles.bellCircleBtn}`} aria-label="Сповіщення" onClick={handleBellClick}>
              <BellIcon className={styles.notificationIcon} />
              {hasUnread && <span className={nStyles.badge} />}
            </button>
          </GlassSurface>
          {bellOpen && (
            <NotificationDropdown
              ref={notifPanelRef}
              notifs={notifs} loading={notifsLoading}
              onClose={() => setBellOpen(false)}
              onCompose={() => { setBellOpen(false); setCompose(true); }}
              onMarkAllRead={markAllRead} onMarkOne={markOneRead}
            />
          )}
        </div>
      </header>

      <div className={styles.mainWrapper}>
        {/* ── Desktop sidebar — liquid glass ── */}
        <GlassSurface
          width={232}
          height="100%"
          borderRadius={0}
          backgroundOpacity={isTournamentPage ? 0.82 : 0.7}
          saturation={1.6}
          displace={isTournamentPage ? 4 : 0}
          className={`${styles.leftSidebar} ${styles.desktopSidebar} ${styles.sidebarGlass} glass-surface--dense`}
        >
          {desktopNavContent()}
          <div className={styles.logoutSection}>
            {showLogout && (
              <button onClick={handleLogout} className={styles.logoutBtn} type="button">
                <LogOut className={styles.logoutIcon} style={{ color: "rgb(215,125,126)" }} strokeWidth={1.8} />
                <span className={styles.logoutText}>Вийти</span>
              </button>
            )}
          </div>
        </GlassSurface>

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <div
            className={`${styles.mobileOverlay} ${mobileClosing ? styles.mobileOverlayClosing : styles.mobileOverlayOpen}`}
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile sidebar drawer — liquid glass ── */}
        {mobileOpen && (
          <GlassSurface
            width={null}
            height={null}
            borderRadius={0}
            backgroundOpacity={0.65}
            saturation={1.6}
            displace={0}
            className={`${styles.mobileSidebar} ${mobileClosing ? styles.mobileSidebarClosing : styles.mobileSidebarOpen} ${styles.mobileGlass} glass-surface--dense`}
          >
            <div className={styles.mobileSidebarHeader}>
              <img src={Logo} alt="Vector" className={styles.mobileSidebarLogo} />
            </div>
            <div className={styles.mobileSidebarBody}>
              {mobileNavContent()}
            </div>
            <div className={styles.mobileSidebarFooter}>
              {showLogout && (
                <div className={styles.logoutSection}>
                  <button onClick={handleLogout} className={styles.logoutBtn} type="button">
                    <LogOut className={styles.logoutIcon} style={{ color: 'rgb(215,125,126)' }} strokeWidth={1.8} />
                    <span className={styles.logoutText}>Вийти</span>
                  </button>
                </div>
              )}
            </div>
          </GlassSurface>
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

export { NavBar };