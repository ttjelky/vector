import React, { useState } from "react";
import styles from "../components/styles/loginPage.module.css";
import cross from "../components/static/icons/cross.svg";
import { loginUser } from '../../api';
import { useNavigate } from "react-router-dom";

const Login = ({isOpen, onClose, onSwitchToRegister, onSwitchToForgot}) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    try {
        const response = await loginUser({
            username: loginData.email,
            password: loginData.password
        });
        
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('fullUserName', `${response.data.first_name} ${response.data.last_name}`);
        onClose();
        navigate('/admindashboard');
    } catch (error) {
        const serverMessage = error.response?.data?.detail;
        const translations = {
            "No active account found with the given credentials": "Невірна пошта або пароль",
            "User is inactive": "Акаунт не активовано"
        };
        setErrors({ detail: translations[serverMessage] || "Помилка підключення" });
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`${styles.overlay} ${isClosing ? styles.fadeOut : ''}`} onClick={handleClose}>
      <div className={`${styles.login} ${isClosing ? styles.modalOut : ''}`} onClick={(e) => e.stopPropagation()}>
        <img src={cross} alt="close" className={styles.cross} onClick={handleClose} />

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <h1 className={styles.logintitle}>Вхід</h1>

          <div className={styles.inputGroups}>
            <div className={styles.fieldWrapper} style={{ animationDelay: '0.1s' }}>
              <p className={styles.label}>Email</p>
              <input
                type="email"
                className={styles.input}
                name="email"
                value={loginData.email}
                onChange={handleChange}
                required 
              />
            </div>

            <div className={styles.fieldWrapper} style={{ animationDelay: '0.2s' }}>
              <p className={styles.label}>Пароль</p>
              <input
                type="password" 
                className={styles.input}
                name="password"
                value={loginData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {errors.detail && <p className={styles.errorTextDetail}>{errors.detail}</p>}

          <div className={styles.rememberme}>
            <input type="checkbox" id="remember" name="remember" />
            <label htmlFor="remember">Запам'ятати мене</label>
          </div>

          <button type="submit" disabled={!loginData.email || !loginData.password} className={styles.thebutton}>
            Увійти
          </button>

          <section className={styles.underform}>
            <div onClick={onSwitchToRegister} className={styles.switchText}>
              <span>Не маєте акаунту? </span>
              <span className={styles.link}>Зареєструватися</span>
            </div>
            <div onClick={onSwitchToForgot} className={styles.forgotWrapper}>
              <span className={styles.link}>Забули пароль?</span>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default Login;