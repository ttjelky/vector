import React from "react";
import logo from "./static/VectorLogo.svg";
import styles from "./styles/landingNavBar.module.css";
import LandingBody from "./LandingBody";
import BlackButton from "./blackbutton";
import WhiteButton from "./WhiteButton";
import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import Login from "../pages/Login";
import Register from "../pages/Register";
import Forgot from "../pages/Forgot";

const LandingNavBar = () => {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isForgotOpen, setIsForgotOpen] = useState(false);
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

    return (
    <header className={styles.header}>
    
    <div className={styles.logoContainer}>
        <a className="landingNavLogo" href="#main">
        <img src={logo} alt="Logo" />
        </a>
    </div>
        <nav>
        <ul className={styles.navBarList}>
            <li className={styles.navBarItem}>
                <a href="#info" className={styles.navBarLink}>Інфо</a>
            </li>
            <li className={styles.navBarItem}>
                <a href="#howToStart" className={styles.navBarLink}>Як почати?</a>
            </li>
            <li className={styles.navBarItem}>
                <a href="#contactUs" className={styles.navBarLink}>Зв’язатися з нами</a>
            </li>
        </ul>
        </nav>  

        <div className={styles.buttons}> 
            <WhiteButton text={"Реєстрація"} onClick={() => setIsRegisterOpen(true)}/>
            <BlackButton text={"Вхід"} onClick={() => setIsLoginOpen(true)}/>
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
}

export default LandingNavBar;