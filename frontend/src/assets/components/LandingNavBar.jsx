import React from "react";
import logo from "./static/VectorLogo.svg";
import styles from "./styles/landingNavBar.module.css";

const LandingNavBar = () => {
    return (
    <header className={styles.header}>

        <a className="landingNavLogo" href="/">
        <img src={logo} alt="Logo" />
        </a>

        <nav>
        <ul className={styles.navBarList}>
            <li className={styles.navBarItem}>
                <a href="/" className={styles.navBarLink}>Інфо</a>
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
            <button className={styles.navBarButton}>
                Увійти
            </button>
        </div>
        
    </header>
    );
}

export default LandingNavBar;