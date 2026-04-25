import React, { useState, useEffect, useRef } from "react";
import logo from "./static/VectorLogo.svg";
import styles from "./styles/landingNavBar.module.css";
import BlackButton from "./blackbutton";
import WhiteButton from "./WhiteButton";
import { useNavigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Forgot from "../pages/Forgot";

const LandingNavBar = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerWrapperRef = useRef(null);
  const navigate = useNavigate();

  const backToLogin = () => {
    setIsForgotOpen(false);
    setIsLoginOpen(true);
  };
  const switchToLogin = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };
  const switchToRegister = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };
  const switchToForgot = () => {
    setIsLoginOpen(false);
    setIsForgotOpen(true);
  };
  const closeMenu = () => setMenuOpen(false);

  // Закриття по кліку поза меню
  useEffect(() => {
    const handler = (e) => {
      if (burgerWrapperRef.current && !burgerWrapperRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <a className="landingNavLogo" href="#main">
            <img src={logo} alt="Logo" />
          </a>
        </div>

        {/* Desktop nav — не чіпаємо */}
        <nav>
          <ul className={styles.navBarList}>
            <li className={styles.navBarItem}>
              <a href="#info" className={styles.navBarLink}>Інфо</a>
            </li>
            <li className={styles.navBarItem}>
              <a href="#howToStart" className={styles.navBarLink}>Як почати?</a>
            </li>
            <li className={styles.navBarItem}>
              <a href="#contactUs" className={styles.navBarLink}>Зв'язатися з нами</a>
            </li>
          </ul>
        </nav>

        {/* Desktop buttons — не чіпаємо */}
        <div className={styles.buttons}>
          <WhiteButton text={"Реєстрація"} onClick={() => setIsRegisterOpen(true)} />
          <BlackButton text={"Вхід"} onClick={() => setIsLoginOpen(true)} />
        </div>

        {/* Burger + dropdown в одному wrapper (mobile only) */}
        <div className={styles.burgerWrapper} ref={burgerWrapperRef}>
          <button
            className={`${styles.burgerBtn} ${menuOpen ? styles.burgerOpen : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Меню"
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`${styles.mobileDropdown} ${menuOpen ? styles.mobileDropdownOpen : ""}`}>
            <ul className={styles.mobileNavList}>
              <li className={styles.mobileNavItem}>
                <a href="#info" className={styles.mobileNavLink} onClick={closeMenu}>Інфо</a>
              </li>
              <li className={styles.mobileNavItem}>
                <a href="#howToStart" className={styles.mobileNavLink} onClick={closeMenu}>Як почати?</a>
              </li>
              <li className={styles.mobileNavItem}>
                <a href="#contactUs" className={styles.mobileNavLink} onClick={closeMenu}>Зв'язатися з нами</a>
              </li>
            </ul>
            <div className={styles.mobileDivider} />
            <div className={styles.mobileButtons}>
              <WhiteButton
                text={"Реєстрація"}
                onClick={() => { closeMenu(); setIsRegisterOpen(true); }}
              />
              <BlackButton
                text={"Вхід"}
                onClick={() => { closeMenu(); setIsLoginOpen(true); }}
              />
            </div>
          </div>
        </div>
      </header>

      <Login
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={switchToRegister}
        onSwitchToForgot={switchToForgot}
      />
      <Register
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={switchToLogin}
      />
      <Forgot
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onBackToLogin={backToLogin}
      />
    </>
  );
};

export default LandingNavBar;