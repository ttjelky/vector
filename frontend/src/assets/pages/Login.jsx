import React, { useState } from "react";
import styles from "../components/styles/loginPage.module.css";
import cross from "../components/static/icons/cross.svg";
import { loginUser } from '../../api';
import { useNavigate } from "react-router-dom";

/**
 * Props:
 *  - isOpen            {boolean}
 *  - onClose           {function}
 *  - onSwitchToRegister {function}
 *  - onSwitchToForgot  {function}
 *  - onLoginSuccess    {function|undefined} — якщо передано, викликається після
 *                      успішного логіну замість navigate (для flow JoinTournamentPage)
 */
const Login = ({ isOpen, onClose, onSwitchToRegister, onSwitchToForgot, onLoginSuccess }) => {

  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      localStorage.setItem(
        'fullUserName',
        `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim()
      );

      onClose();

      // Якщо є зовнішній callback (напр. з JoinTournamentPage) — викликаємо його
      if (onLoginSuccess) {
        onLoginSuccess();
        return;
      }

      // Стандартна поведінка: перевіряємо pendingJoinToken або йдемо на дашборд
      const pendingToken = localStorage.getItem("pendingJoinToken");
      if (pendingToken) {
        localStorage.removeItem("pendingJoinToken");
        navigate(`/join/${pendingToken}`);
      } else {
        navigate("/admindashboard");
      }
    } catch (error) {
      const serverMessage = error.response?.data?.detail;

      const translations = {
        "No active account found with the given credentials": "Невірна пошта або пароль",
        "User is inactive": "Акаунт не активовано"
      };

      const finalMessage = translations[serverMessage] || "Помилка підключення до сервера";
      setErrors({ detail: finalMessage });
    }
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.login} onClick={(e) => e.stopPropagation()}>

          <img src={cross} alt="back" className={styles.cross} onClick={onClose} />

          <div className={styles.form}>
            <h1 className={styles.logintitle}>Вхід на сайт</h1>

            <section style={{ marginTop: "32px" }}>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ color: "gray" }}>Email</p>
                <input
                  type="email"
                  className={styles.input}
                  name="email"
                  value={loginData.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && <span className={styles.errorText}>{errors.email[0]}</span>}
              </div>

              <div style={{ marginBottom: "10px" }}>
                <p style={{ color: "gray" }}>Пароль</p>
                <input
                  type="password"
                  className={styles.input}
                  name="password"
                  value={loginData.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && <span className={styles.errorText}>{errors.password[0]}</span>}
              </div>

            </section>

            {errors.detail && (
              <p className={styles.errorText} style={{ margin: '10px 0' }}>
                {errors.detail}
              </p>
            )}

            <div className={styles.rememberme}>
              <input type="checkbox" id="remember" name="remember" />
              <label htmlFor="remember">Запам'ятати мене</label>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <button
                type="submit"
                disabled={!loginData.email || !loginData.password}
                className={styles.thebutton}
              >
                Увійти
              </button>
            </div>

            <section className={styles.underform}>
              <div onClick={onSwitchToRegister} style={{ cursor: "pointer" }}>
                <span>Не маєте акаунту? </span>
                <a>Зареєструватися</a>
              </div>

              <div onClick={onSwitchToForgot}>
                <a className={styles.forgot} style={{ cursor: "pointer" }}>Забули пароль?</a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </form>
  );
};

export default Login;
