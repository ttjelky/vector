import React, { useState, useEffect, useRef } from "react";
import logo from "@static/VectorLogo.png";
import styles from "@shared/styles/landingNavBar.module.css";
import { BlackButton } from "./blackbutton";
import { WhiteButton } from "./WhiteButton";
import { useNavigate } from "react-router-dom";
import { Login } from "@features/auth";
import { Register } from "@features/auth";
import { Forgot } from "@features/auth";
import JellyRadio from "./JellyRadio";
import GlassSurface from "./GlassSurface";

const NAV_ITEMS = [
    { value: "info", label: "Інфо" },
    { value: "howToStart", label: "Як почати?" },
    { value: "contactUs", label: "Зв'язатися з нами" },
];

const scrollToSection = (value) => {
    const el = document.getElementById(value);
    if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", `#${value}`);
    }
};

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
        <header className={styles.header}>

            <GlassSurface
                width="auto"
                height="auto"
                borderRadius={35}
                backgroundOpacity={0.65}
                saturation={1.6}
                className={`${styles.logoGlass} glass-surface--flat`}
            >
                <a className="landingNavLogo" href="#main">
                    <img src={logo} className={styles.logo} />
                </a>
            </GlassSurface>

            {/* Desktop nav — JellyRadio */}
            <nav className={styles.jellyNav}>
                <JellyRadio
                    items={NAV_ITEMS}
                    defaultValue="info"
                    onChange={(value) => scrollToSection(value)}
                    chipColor="#ececee"
                    activeColor="#18181b"
                    textColor="#18181b"
                    activeTextColor="#f5f5f5"
                    size="lg"
                    gap={10}
                    radius={24}
                    ariaLabel="Навігація"
                />
            </nav>

            {/* Desktop buttons — не чіпаємо */}
            <div className={styles.buttons}>
                <WhiteButton text={"Реєстрація"} onClick={() => setIsRegisterOpen(true)} />
                <BlackButton text={"Вхід"} onClick={() => setIsLoginOpen(true)} />
            </div>

            {/* Burger + dropdown (mobile only) */}
            <div className={styles.burgerWrapper} ref={burgerWrapperRef}>
                <GlassSurface
                    width={48}
                    height={48}
                    borderRadius={14}
                    backgroundOpacity={0.65}
                    saturation={1.6}
                    className={`glass-surface--flat ${styles.landingGlassBorder}`}
                >
                    <button
                        className={`${styles.burgerBtn} ${menuOpen ? styles.burgerOpen : ""}`}
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label="Меню"
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </GlassSurface>

                <div className={`${styles.mobileDropdown} ${menuOpen ? styles.mobileDropdownOpen : ""}`}>
                    <GlassSurface
                        width="100%"
                        height="100%"
                        borderRadius={24}
                        backgroundOpacity={0.65}
                        saturation={1.6}
                        className={`glass-surface--flat ${styles.landingGlassBorder}`}
                    >
                        <div style={{ width: "100%" }}>
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
                    </GlassSurface>
                </div>
            </div>

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
        </header>
    );
};

export { LandingNavBar };