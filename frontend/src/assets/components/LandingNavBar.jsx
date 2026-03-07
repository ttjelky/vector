import React from "react";
import logo from "./static/VectorLogo.svg";
import styles from "./styles/landingNavBar.module.css";
import LandingBody from "./LandingBody";
import BlackButton from "./blackbutton";

const LandingNavBar = () => {
    return (
    <header className={styles.header}>
    
    <div className={styles.logoContainer}>
        <a className="landingNavLogo" href="/">
        <img src={logo} alt="Logo" />
        </a>
    </div>
        <nav>
        <ul className={styles.navBarList}>
            <li className={styles.navBarItem}>
                <a href="#info" className={styles.navBarLink}>Інфо</a>
            </li>
            <li className={styles.navBarItem}>
                <a href="/" className={styles.navBarLink}>Як почати?</a>
            </li>
            <li className={styles.navBarItem}>
                <a href="/" className={styles.navBarLink}>Зв’язатися з нами</a>
            </li>
        </ul>
        </nav>  

        <div>
            <BlackButton text={"Увійти"}/>
        </div>
        
    </header>
    );
}

export default LandingNavBar;