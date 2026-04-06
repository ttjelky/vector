import React, { useState, useEffect, useRef } from "react"; // Додав useRef
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const menuRef = useRef(null); // Реф для відстеження контейнера меню

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    // Закриття при кліку поза межами
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Якщо меню відкрите і клік був НЕ по контейнеру navContainer
            if (isMobileMenuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
                closeMobileMenu();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMobileMenuOpen]);

    useEffect(() => {
        const handleAnchorClick = (e) => {
            const href = e.currentTarget.getAttribute("href");
            if (href?.startsWith("#")) {
                e.preventDefault();
                const targetId = href.replace("#", "");
                const elem = document.getElementById(targetId);
                elem?.scrollIntoView({ behavior: "smooth" });
                closeMobileMenu();
            }
        };

        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => link.addEventListener("click", handleAnchorClick));
        return () => links.forEach(link => link.removeEventListener("click", handleAnchorClick));
    }, []);

    return (
        <header className={styles.mainHeader}>
            {/* Додав ref={menuRef} до navContainer, щоб ловити кліки всередині всієї шапки */}
            <div className={styles.navContainer} ref={menuRef}>
                <div className={styles.logoSection}>
                    <div className={styles.logoWrapper}>
                        <a href="#main">
                            <img src={logo} alt="Logo" />
                        </a>
                    </div>
                </div>

                <nav className={styles.centerNav}>
                    <ul className={styles.navLinks}>
                        <li><a href="#info">Інфо</a></li>
                        <li><a href="#howToStart">Як почати?</a></li>
                        <li><a href="#contactUs">Зв’язатися з нами</a></li>
                    </ul>
                </nav>

                <div className={styles.actionSection}>
                    <div className={styles.authButtons}>
                        <WhiteButton text={"Реєстрація"} onClick={() => setIsRegisterOpen(true)} />
                        <BlackButton text={"Вхід"} onClick={() => setIsLoginOpen(true)} />
                    </div>
                    
                    <div className={`${styles.burgerBtn} ${isMobileMenuOpen ? styles.activeBurger : ""}`} onClick={toggleMobileMenu}>
                        <span></span><span></span><span></span>
                    </div>
                </div>

                <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.menuVisible : ""}`}>
                    <div className={styles.mobLinkList}>
                        <a href="#info" onClick={closeMobileMenu}>Інфо</a>
                        <a href="#howToStart" onClick={closeMobileMenu}>Як почати?</a>
                        <a href="#contactUs" onClick={closeMobileMenu}>Зв’язатися з нами</a>
                    </div>
                    <div className={styles.mobAuth}>
                        <button className={styles.regBtn} onClick={() => {setIsRegisterOpen(true); closeMobileMenu()}}>Реєстрація</button>
                        <button className={styles.logBtn} onClick={() => {setIsLoginOpen(true); closeMobileMenu()}}>Вхід</button>
                    </div>
                </div>
            </div>

            <Login isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSwitchToRegister={() => {setIsLoginOpen(false); setIsRegisterOpen(true)}} onSwitchToForgot={() => {setIsLoginOpen(false); setIsForgotOpen(true)}} />
            <Register isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onSwitchToLogin={() => {setIsRegisterOpen(false); setIsLoginOpen(true)}} />
            <Forgot isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} onBackToLogin={() => {setIsForgotOpen(false); setIsLoginOpen(true)}} />
        </header>
    );
}

export default LandingNavBar;