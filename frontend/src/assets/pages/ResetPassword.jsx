import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from '../components/styles/forgotPage.module.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); // Витягуємо токен з посилання
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setStatus({ type: 'error', message: 'Паролі не збігаються!' });
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/password_reset/confirm/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    password: password
                }),
            });

            if (response.ok) {
                setStatus({ type: 'success', message: 'Пароль успішно змінено! Перенаправляємо...' });
                setTimeout(() => navigate('/'), 2000);
            } else {
                setStatus({ type: 'error', message: 'Токен недійсний або застарів.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Помилка з\'єднання з сервером.' });
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.forgot}>
                <form onSubmit={handleSubmit} className={styles.form}>
                <h1 className={styles.title}>Скинути пароль</h1>
                <p style={{color: "gray", marginTop: "10px", marginBottom: "20px"}}>Введіть новий пароль, який буде використовуватися для входу в профіль.</p>
                    <div style={{ marginBottom: "15px" }}>
                        <p style={{color: "gray"}}>Новий пароль</p>
                        <input 
                            type="password" 
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                        <p style={{color: "gray"}}>Підтвердіть пароль</p>
                        <input 
                            type="password"
                            className={styles.input}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.thebutton}>
                        Оновити пароль
                    </button>
                </form>

                {status.message && (
                    <p style={{ 
                        marginTop: "15px", 
                        color: status.type === 'error' ? '#ff4d4d' : '#4ade80' 
                    }}>
                        {status.message}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;