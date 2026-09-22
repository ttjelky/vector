import React from "react";
import styles from "@shared/styles/landingFooter.module.css";
import Logo from "@static/VectorFavicon.png";

const LandingFooter = () => {
    return (
        <footer className={styles.LandingFooter}>
            <div className={styles.LandingFooterBottom}>
                <div className={styles.LandingFooterLogoEmail}>
                    <img src={Logo} className={styles.FooterLogo} />
                    <p className={styles.LandingFooterEmail}>Vectorcommand6742@gmail.com</p>
                </div>
                <p className={styles.LandingFooterSFLU}>
                    Турнірне завдання команди Vector <br />Star For Life Ukraine 2026
                </p>
            </div>
        </footer>
    );
};

export { LandingFooter };