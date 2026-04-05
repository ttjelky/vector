import React, { useState, useEffect, useRef } from "react";
import logo from "./static/VectorLogo.svg";
import styles from "./styles/landingNavBar.module.css";
import BlackButton from "./blackbutton";
import WhiteButton from "./WhiteButton";
import Login from "../pages/Login";
import Register from "../pages/Register";

const LandingNavBar = () => {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    // Функція для плавного скролу
    const scrollToSection = (e, id) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
        setOpen(false); // Закриваємо бургер після кліку
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <a href="#main" onClick={(e) => scrollToSection(e, "main")}>
                    <img src={logo} alt="Logo" />
                </a>
            </div>

            <nav className={styles.nav}>
                <ul className={styles.navBarList}>
                    <li><a href="#info" className={styles.navBarLink} onClick={(e) => scrollToSection(e, "info")}>Інфо</a></li>
                    <li><a href="#howToStart" className={styles.navBarLink} onClick={(e) => scrollToSection(e, "howToStart")}>Як почати?</a></li>
                    <li><a href="#contactUs" className={styles.navBarLink} onClick={(e) => scrollToSection(e, "contactUs")}>Зв’язатися з нами</a></li>
                </ul>
            </nav>

            <div className={styles.desktopButtons}>
                <WhiteButton text="Реєстрація" onClick={() => setIsRegisterOpen(true)} />
                <BlackButton text="Вхід" onClick={() => setIsLoginOpen(true)} />
            </div>

            <div className={styles.mobileContainer} ref={menuRef}>
                <div 
                    className={`${styles.burger} ${open ? styles.burgerActive : ""}`} 
                    onClick={() => setOpen(!open)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

                <div className={`${styles.dropdown} ${open ? styles.open : styles.closed}`}>
                    <div className={styles.mobileLinks}>
                        {/* Плавний скролл для мобілки */}
                        <a href="#info" onClick={(e) => scrollToSection(e, "info")}>Інфо</a>
                        <a href="#howToStart" onClick={(e) => scrollToSection(e, "howToStart")}>Як почати?</a>
                        <a href="#contactUs" onClick={(e) => scrollToSection(e, "contactUs")}>Зв’язатися з нами</a>
                    </div>
                    
                    <hr className={styles.divider} />

                    <div className={styles.mobileActions}>
                        <BlackButton 
                            className={styles.blackbuttonMOBILE} 
                            text="Вхід" 
                            onClick={() => {setIsLoginOpen(true); setOpen(false);}} 
                        />
                        <WhiteButton 
                            className={styles.whitebuttonMOBILE} 
                            text="Реєстрація" 
                            onClick={() => {setIsRegisterOpen(true); setOpen(false);}} 
                        />
                    </div>
                </div>
            </div>

            <Login isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
            <Register isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
        </header>
    );
};

export default LandingNavBar;