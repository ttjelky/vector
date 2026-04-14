import React from "react";
import styles from "./styles/landingFooter.module.css";
import Logo from "./static/LogoOnly.svg";

const LandingFooter = () => {
    return (
        <footer className={styles.LandingFooter}>
            <div className={styles.LandingFooterLinks}>
                <a href="#info">Інфо</a>
                <a href="#howToStart">Як почати?</a>
                <a href="#contactUs">Зв’язатися з нами</a>
            </div>
            
            <div className={styles.LandingFooterBottom}>
                <div className={styles.LandingFooterLogoEmail}>
                    <img src={Logo} alt="Logo" className={styles.FooterLogo} />
                    <p className={styles.LandingFooterEmail}>Vectorcommand6742@gmail.com</p>
                </div>
                
                <div className={styles.LandingFooterSFLU}>
                    <p>Турнірне завдання команди Vector</p>
                    <p>Star For Life Ukraine 2026</p>
                </div>
            </div>
        </footer>
    );
};

export default LandingFooter;