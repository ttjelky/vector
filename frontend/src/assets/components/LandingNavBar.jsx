import React, { useState } from "react";
import logo from "./static/VectorLogo.svg";
import styles from "./styles/landingNavBar.module.css";
import BlackButton from "./blackbutton";
import WhiteButton from "./WhiteButton";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Forgot from "../pages/Forgot";

const LandingNavBar = () => {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isForgotOpen, setIsForgotOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <a href="#main">
                    <img src={logo} alt="Logo" className={styles.logoImg} />
                </a>
            </div>

            <button 
                className={`${styles.burgerBtn} ${isMenuOpen ? styles.active : ""}`} 
                onClick={toggleMenu}
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            <div className={`${styles.navWrapper} ${isMenuOpen ? styles.active : ""}`}>
                <nav>
                    <ul className={styles.navBarList}>
                        <li className={styles.navBarItem}>
                            <a href="#info" className={styles.navBarLink} onClick={closeMenu}>Інфо</a>
                        </li>
                        <li className={styles.navBarItem}>
                            <a href="#howToStart" className={styles.navBarLink} onClick={closeMenu}>Як почати?</a>
                        </li>
                        <li className={styles.navBarItem}>
                            <a href="#contactUs" className={styles.navBarLink} onClick={closeMenu}>Зв’язатися з нами</a>
                        </li>
                    </ul>
                </nav>

                <div className={`${styles.buttons} ${styles.mobileButtons}`}>
                    <WhiteButton text={"Реєстрація"} onClick={() => { setIsRegisterOpen(true); closeMenu(); }} />
                    <BlackButton text={"Вхід"} onClick={() => { setIsLoginOpen(true); closeMenu(); }} />
                </div>
            </div>

            <div className={`${styles.buttons} ${styles.desktopButtons}`}>
                <WhiteButton text={"Реєстрація"} onClick={() => setIsRegisterOpen(true)} />
                <BlackButton text={"Вхід"} onClick={() => setIsLoginOpen(true)} />
            </div>

            {/* Модалки */}
            <Login 
                isOpen={isLoginOpen} 
                onClose={() => setIsLoginOpen(false)} 
                onSwitchToRegister={() => { setIsLoginOpen(false); setIsRegisterOpen(true); }}
                onSwitchToForgot={() => { setIsLoginOpen(false); setIsForgotOpen(true); }}
            />
            <Register 
                isOpen={isRegisterOpen} 
                onClose={() => setIsRegisterOpen(false)}
                onSwitchToLogin={() => { setIsRegisterOpen(false); setIsLoginOpen(true); }}
            />
            <Forgot 
                isOpen={isForgotOpen} 
                onClose={() => setIsForgotOpen(false)}
                onBackToLogin={() => { setIsForgotOpen(false); setIsLoginOpen(true); }}
            />
        </header>
    );
}

export default LandingNavBar;