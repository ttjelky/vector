import React, { useState} from "react";
import { useNavigate } from "react-router-dom";
import styles from "../components/styles/forgotPage.module.css";
import cross from "../components/static/icons/cross.svg"


const Forgot = ({isOpen, onClose, onBackToLogin}) => {

    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    if (!isOpen) return null;

return (
    <div className={styles.overlay} onClick={onClose}>
        <div className={styles.forgot} onClick={(e) => e.stopPropagation()}>

            <img src={cross} alt="back" className={styles.cross} onClick={onClose} />

            <div className={styles.form}> 

                <h1 className={styles.title}>Забули пароль?</h1>
                <p style={{color: "gray", marginTop: "10px", marginBottom: "20px"}}>Вкажіть електронну пошту, пов’язану з вашим акаунтом, щоб скинути пароль.</p>

            <section style={{marginTop: "32px"}}>

                <div style={{marginBottom: "20px"}}>
                    <p style={{color: "gray"}}>Email</p>
                    <input
                        type="email"
                        className={styles.input}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.button}>
                    <button type="submit" disabled={!email} className={styles.thebutton}>
                        Скинути пароль
                    </button>
                </div>

            </section>

            <div className={styles.bottom}>
                <a className={styles.backToLogin} onClick={onBackToLogin}>Повернутися до входу</a>
            </div>

            </div>
        </div>
    </div>
)

}

export default Forgot