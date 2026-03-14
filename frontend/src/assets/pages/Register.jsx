import React, { useState } from 'react';
import styles from "../components/styles/registerPage.module.css";
import cross from "../components/static/icons/cross.svg"
import { registerUser, loginUser } from '../../api';
import { useNavigate } from 'react-router-dom';

const Register = ({isOpen, onClose}) => {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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
            username: formData.email,
            password: formData.password
        });
        localStorage.setItem('accessToken', response.data.access);
        onClose();
        navigate('/dashboard');
    } catch (error) {
        if (error.response && error.response.data) {
            setErrors(error.response.data); 
        } else {
            alert("Щось пішло не так. Перевірте з'єднання.");
        }
    } finally {
        setIsLoading(false);
    }
};
  
    return (
      <form onSubmit={handleSubmit} noValidate>
      <div className={styles.overlay} onClick={onClose}>
      <div className={styles.login} onClick={(e) => e.stopPropagation()}>

        <div className={styles.navbar}>
            <img src={cross} alt="back" className={styles.cross} onClick={onClose} />
        </div>

        <div className={styles.form}>
        <h1 className={styles.logintitle}>Реєстрація</h1>

        <section className={styles.inputform}>

          <div className={styles.name}>
          <p style={{color: "gray"}}>Ім’я</p>
          <input 
          type="text" 
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          className={styles.input}
          required
          />
          {errors.first_name && <span className={styles.errorText}>{errors.first_name[0]}</span>}
          </div>

          <div className={styles.name}>
          <p style={{color: "gray"}}>Прізвище</p>
          <input 
          type="text" 
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          className={styles.input}
          required
          />
          {errors.last_name && <span className={styles.errorText}>{errors.last_name[0]}</span>}
          </div>


          <div className={styles.email}>
          <p style={{color: "gray"}}>Email</p>
          <input
          type="email" 
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={styles.input}
          required
          />
          {errors.email && <span className={styles.errorText}>{errors.email[0]}</span>}
          </div>

          <div className={styles.password}>
          <p style={{color: "gray"}}>Пароль</p>
          <input
          type="password" 
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={styles.input}
          required
          />
          </div>

        </section>

        <div className={styles.rememberme}>
            <input type="checkbox" id="remember" name="remember" />
            <label htmlFor="remember">Запам'ятати мене</label>
        </div>

        <div className={styles.button}>
          <button type="submit" disabled={isLoading || !formData.full_name || !formData.password} className={styles.thebutton}>
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