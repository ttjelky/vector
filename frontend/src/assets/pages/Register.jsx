import React, { useState, useEffect } from 'react';
import styles from "../components/styles/registerPage.module.css";
import cross from "../components/static/icons/cross.svg"
import { registerUser, loginUser } from '../../api';
import { useNavigate } from 'react-router-dom';

const Register = ({isOpen, onClose, onSwitchToLogin}) => {
  const navigate = useNavigate();

  const [role, setRole] = useState("");

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
        await registerUser({
          ...formData,
          role: role
        });
        const response = await loginUser({
            username: formData.email,
            password: formData.password
        });
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('role', response.data.role);
        onClose();
        navigate('/admindashboard');
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
      <form onSubmit={handleSubmit} noValidate>
      <div className={styles.overlay} onClick={onClose}>
      <div className={styles.register} onClick={(e) => e.stopPropagation()}>

        <div className={styles.navbar}>
            <img src={cross} alt="back" className={styles.cross} onClick={onClose} />
        </div>

        <div className={styles.form}>
        <h1 className={styles.title}>Реєстрація</h1>

        <section className={styles.inputform}>
          <div className={styles.namecontainer}>
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
          </div>

          <div className={styles.email}>
          <div style={{marginBottom: "12px"}}>
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

          <div className={styles.rolecontainer}>
            <p style={{color: "gray"}}>Роль</p>
            <select
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className={styles.input}
              required
            >
              <option value="">Оберіть роль</option>
              <option value="admin">Адміністратор</option>
              <option value="team">Учасник</option>
              <option value="jury">Журі</option>
            </select>
          </div>
        </section>

        <div className={styles.rememberme}>
            <input type="checkbox" id="remember" name="remember" />
            <label htmlFor="remember">Запам'ятати мене</label>
        </div>

        <div className={styles.button}>
          <button type="submit" disabled={!formData.email || !formData.password || !formData.last_name || !formData.first_name || !role} className={styles.thebutton}>
            Зареєструватися
          </button>
        </div>

        <section className={styles.underform}>

          <div onClick={onSwitchToLogin} style={{cursor: "pointer"}}>
            <span>Вже маєте акаунт? </span>
            <a>Увійти</a>
          </div>
        </section>
        </div>
      </div>
    </div>
    </form>
    );
};

export default Register;