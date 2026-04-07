import React, { useState, useEffect } from 'react';
import styles from "../components/styles/registerPage.module.css";
import cross from "../components/static/icons/cross.svg"
import { registerUser, loginUser } from '../../api';
import { useNavigate } from 'react-router-dom';

const Register = ({isOpen, onClose, onSwitchToLogin}) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Спеціальний закриватор з анімацією
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Час має збігатися з CSS анімацією
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        handleClose();
        navigate('/dashboard');
    } catch (error) {
        if (error.response && error.response.data) {
            setErrors(error.response.data); 
        } else {
            alert("Щось пішло не так.");
        }
    } finally {
        setIsLoading(false);
    }
  };
  
  if (!isOpen && !isClosing) return null;

  return (
    <div className={`${styles.overlay} ${isClosing ? styles.fadeOut : ''}`} onClick={handleClose}>
      <div className={`${styles.register} ${isClosing ? styles.modalOut : ''}`} onClick={(e) => e.stopPropagation()}>
        <img src={cross} alt="close" className={styles.cross} onClick={handleClose} />
        
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <h1 className={styles.title}>Реєстрація</h1>

          <div className={styles.inputGroups}>
            {[
              { label: "Ім’я", name: "first_name", type: "text" },
              { label: "Прізвище", name: "last_name", type: "text" },
              { label: "Email", name: "email", type: "email" },
              { label: "Пароль", name: "password", type: "password" }
            ].map((field, idx) => (
              <div key={field.name} className={styles.fieldWrapper} style={{ animationDelay: `${idx * 0.1}s` }}>
                <p className={styles.label}>{field.label}</p>
                <input 
                  type={field.type} 
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
                {errors[field.name] && <span className={styles.errorText}>{errors[field.name][0]}</span>}
              </div>
            ))}
          </div>

          <div className={styles.rememberme}>
            <input type="checkbox" id="remember" name="remember" />
            <label htmlFor="remember">Запам'ятати мене</label>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !formData.email || !formData.password || !formData.last_name || !formData.first_name} 
            className={styles.button}
          >
            {isLoading ? "Завантаження..." : "Зареєструватися"}
          </button>

          <section className={styles.underform}>
            <div onClick={onSwitchToLogin} className={styles.switchText}>
              <span>Вже маєте акаунт? </span>
              <span className={styles.link}>Увійти</span>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default Register;