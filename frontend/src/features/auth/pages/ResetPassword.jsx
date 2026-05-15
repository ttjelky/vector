import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from '../styles/forgotPage.module.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
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
            const response = await fetch('/api/password_reset/confirm/', {
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
                    <p className={styles.subtitle} style={{ marginTop: "10px" }}>
                        Введіть новий пароль, який буде використовуватися для входу в профіль.
                    </p>

                    <div>
                        <p className={styles.fieldLabel}>Новий пароль</p>
                        <input
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <p className={styles.fieldLabel}>Підтвердіть пароль</p>
                        <input
                            type="password"
                            className={styles.input}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {status.message && (
                        <p className={status.type === 'error' ? styles.errorText : styles.successText}>
                            {status.message}
                        </p>
                    )}
                </form>

                <div className={styles.footer}>
                    <button type="submit" form="reset-form" className={styles.btnSubmit} onClick={handleSubmit}>
                        Оновити пароль
                    </button>
                </div>
            </div>
        </div>
    );
};

export { ResetPassword };
