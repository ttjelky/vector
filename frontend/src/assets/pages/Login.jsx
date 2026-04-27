import React, { useState } from "react";
import styles from "../components/styles/loginPage.module.css";
import cross from "../components/static/icons/cross.svg";
import { loginUser } from '../../api';
import { useNavigate } from "react-router-dom";
import { ROLE_HOME } from "../../navConfig";

/**
 * Props:
 *  - isOpen              {boolean}
 *  - onClose             {function}
 *  - onSwitchToRegister  {function}
 *  - onSwitchToForgot    {function}
 *  - onLoginSuccess      {function|undefined} — якщо передано, викликається після
 *                        успішного логіну замість navigate (для flow JoinTournamentPage)
 */
const Login = ({ isOpen, onClose, onSwitchToRegister, onSwitchToForgot, onLoginSuccess }) => {
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [errors,    setErrors]    = useState({});

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
        password: loginData.password,
      });

      const { access, first_name, last_name, role = "participant" } = response.data;

      // ── Зберігаємо дані у localStorage ──────────────────────────
      localStorage.setItem("accessToken", access);
      localStorage.setItem("userRole", role);
      localStorage.setItem(
        "fullUserName",
        `${first_name || ""} ${last_name || ""}`.trim()
      );

      onClose();

      // ── Redirect ─────────────────────────────────────────────────
      if (onLoginSuccess) {
        onLoginSuccess();
        return;
      }

      const pendingToken = localStorage.getItem("pendingJoinToken");
      if (pendingToken) {
        localStorage.removeItem("pendingJoinToken");
        navigate(`/join/${pendingToken}`);
        return;
      }

      // Редіректимо на головну сторінку відповідної ролі
      navigate(ROLE_HOME[role] ?? ROLE_HOME.participant);

    } catch (error) {
      const serverMessage = error.response?.data?.detail;
      const translations = {
        "No active account found with the given credentials": "Невірна пошта або пароль",
        "User is inactive": "Акаунт не активовано",
      };
      setErrors({ detail: translations[serverMessage] || "Помилка підключення до сервера" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.login}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        {/* Floating header */}
        <div className={styles.header}>
          <h2 id="login-title" className={styles.logintitle}>Вхід на сайт</h2>
          <img src={cross} alt="Закрити" className={styles.cross} onClick={onClose} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className={styles.form}>

          <div>
            <p className={styles.fieldLabel}>Email</p>
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

          <div style={{ marginTop: "16px" }}>
            <p className={styles.fieldLabel}>Пароль</p>
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

          {errors.detail && (
            <p className={styles.errorText} style={{ marginTop: "8px" }}>{errors.detail}</p>
          )}

          <div className={styles.rememberme} style={{ marginTop: "16px" }}>
            <input type="checkbox" id="remember" name="remember" />
            <label htmlFor="remember">Запам'ятати мене</label>
          </div>

          <div className={styles.sectionDivider} />

          <div className={styles.underform} style={{ marginBottom: "16px" }}>
            <div onClick={onSwitchToRegister} style={{ cursor: "pointer" }}>
              <span>Не маєте акаунту? </span>
              <a>Зареєструватися</a>
            </div>
            <a className={styles.forgot} onClick={onSwitchToForgot}>Забули пароль?</a>
          </div>

          {/* Floating footer */}
          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Скасувати
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={!loginData.email || !loginData.password}
            >
              Увійти
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login;
