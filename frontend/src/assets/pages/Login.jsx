import React, { useState } from 'react';
import styles from "../components/styles/registerPage.module.css";
import cross from "../components/static/icons/cross.svg";
import { loginUser } from '../../api';
import { useNavigate } from 'react-router-dom';

const Login = ({ isOpen, onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(formData);
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      navigate('/dashboard');
      onClose();
    } catch (error) {
      console.error(error.response?.data);
      alert('Невірний логін або пароль');
    }
  };

  return (
    <div 
      className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`} 
      onClick={onClose}
    >
      <div 
        className={`${styles.login} ${isOpen ? styles.open : styles.closed}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h1 className={styles.logintitle}>Вхід</h1>
          <div className={styles.crossContainer} onClick={onClose}>
            <img src={cross} alt="close" className={styles.crossIcon} />
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.inputform}>
            <div className={styles.name}>
              <p>Логін</p>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ваш логін або email"
                required
              />
            </div>

            <div className={styles.password}>
              <p>Пароль</p>
              <input
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="••••••••"
                required
              />
            </div>
          </section>

          <div className={styles.rememberme}>
            <input type="checkbox" id="rememberLogin" name="remember" />
            <label htmlFor="rememberLogin">Запам'ятати мене</label>
          </div>

          <div className={styles.button}>
            <button type="submit" className={styles.thebutton}>
              Увійти
            </button>
          </div>

          <section className={styles.underform}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="/forgot" style={{ fontSize: '14px' }}>Забули пароль?</a>
              <span>
                Немає акаунту? 
                <a href="/" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}> Зареєструватися</a>
              </span>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default Login;