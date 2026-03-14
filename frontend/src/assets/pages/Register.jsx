import React, { useState } from 'react';
import styles from "../components/styles/registerPage.module.css";
import cross from "../components/static/icons/cross.svg"
import { registerUser, loginUser } from '../../api';
import { useNavigate } from 'react-router-dom';

const Register = ({isOpen, onClose}) => {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      alert('Помилка реєстрації. Можливо, такий користувач вже існує.');
    }
  };
  
    return (
      <form onSubmit={handleSubmit}>
      <div className={styles.overlay} onClick={onClose}>
      <div className={styles.login} onClick={(e) => e.stopPropagation()}>

        <div className={styles.navbar}>
            <img src={cross} alt="back" className={styles.cross} onClick={onClose} />
        </div>

        <div className={styles.form}>
        <h1 className={styles.logintitle}>Реєстрація</h1>

        <section className={styles.inputform}>

          <div className={styles.name}>
          <p style={{color: "gray"}}>Ім’я та прізвище</p>
          <input 
          type="text" 
          name="username"
          value={formData.username}
          onChange={handleChange}
          className={styles.input}
          />
          </div>


          <div className={styles.email}>
          <p style={{color: "gray"}}>Email</p>
          <input
          type="email" 
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={styles.input}
          />
          </div>

          <div className={styles.password}>
          <p style={{color: "gray"}}>Пароль</p>
          <input
          type="password" 
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={styles.input}
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
            <a href="/">Увійти</a>
          </div>
        </section>
        </div>
      </div>
    </div>
    </form>
    );
};

export default Register