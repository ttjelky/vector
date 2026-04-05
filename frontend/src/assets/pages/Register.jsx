import React, { useState } from 'react';
import styles from "../components/styles/registerPage.module.css";
import cross from "../components/static/icons/cross.svg";
import { registerUser, loginUser } from '../../api';
import { useNavigate } from 'react-router-dom';

const Register = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
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
    setErrors({});
    setIsLoading(true);
    try {
      await registerUser(formData);
      const response = await loginUser({
        username: formData.username,
        password: formData.password
      });
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      navigate('/dashboard');
      onClose();
    } catch (error) {
      console.error(error.response?.data);
      alert('Помилка реєстрації.');
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
          <h1 className={styles.logintitle}>Реєстрація</h1>
          <div className={styles.crossContainer} onClick={onClose}>
            <img src={cross} alt="close" className={styles.crossIcon} />
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.inputform}>
            <div className={styles.name}>
              <p style={{ color: "gray", margin: "0 0 5px 5px" }}>Ім’я та прізвище</p>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введіть ваше ім'я"
                required
              />
            </div>

            <div className={styles.email}>
              <p style={{ color: "gray", margin: "0 0 5px 5px" }}>Email</p>
              <input
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="example@mail.com"
                required
              />
            </div>

            <div className={styles.password}>
              <p style={{ color: "gray", margin: "0 0 5px 5px" }}>Пароль</p>
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
            <input type="checkbox" id="remember" name="remember" />
            <label htmlFor="remember">Запам'ятати мене</label>
          </div>

          <div className={styles.button}>
            <button type="submit" className={styles.thebutton}>
              Зареєструватися
            </button>
          </div>

          <section className={styles.underform}>
            <div>
              <span>Вже маєте акаунт? </span>
              <a href="/" onClick={(e) => { e.preventDefault(); onClose(); }}>Увійти</a>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default Register;