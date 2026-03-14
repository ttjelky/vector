import React from "react";
import styles from "../components/styles/loginPage.module.css";
import cross from "../components/static/icons/cross.svg"
import BlackButton from "../components/blackbutton";
import { registerUser, loginUser } from '../../api';

const Login = ({isOpen, onClose}) => {
    if (!isOpen) return null;
    return (
      <div className={styles.overlay} onClick={onClose}>
      <div className={styles.login} onClick={(e) => e.stopPropagation()}>

        <div className={styles.navbar}>
            <img src={cross} alt="back" className={styles.cross} onClick={onClose} />
        </div>

        <div className={styles.form}>
        <h1 className={styles.logintitle}>Вхід на сайт</h1>

        <section className={styles.inputform}>

          <div className={styles.email}>
          <p style={{color: "gray"}}>Email</p>
          <input type="email" className={styles.input} />
          </div>

          <div className={styles.password}>
          <p style={{color: "gray"}}>Пароль</p>
          <input type="password" className={styles.input} />
          </div>

        </section>

        <div className={styles.rememberme}>
            <input type="checkbox" id="remember" name="remember" />
            <label htmlFor="remember">Запам'ятати мене</label>
        </div>

        <div className={styles.button}>
          <button className={styles.thebutton}>
            Увійти
          </button>
        </div>

        <section className={styles.underform}>
        <div>
          <a href="/" className={styles.forgot}>Забули пароль?</a>
        </div>

          <div>
            <span>Не маєте акаунту? </span>
            <a href="/">Зареєструватися</a>
          </div>
        </section>
        </div>
      </div>
    </div>
    );
};

export default Login