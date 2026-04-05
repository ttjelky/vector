import React from "react";
import styles from "./styles/blackbutton.module.css";

// Додаємо className у деструктуризацію пропсів
function BlackButton({ text, onClick, className }) {
    return (
        /* Об'єднуємо базовий стиль зі стилем, який передаємо (наприклад, MOBILE) */
        <button 
            onClick={onClick} 
            className={`${styles.blackbutton} ${className || ""}`}
        >
            {text}
        </button>
    );
}

export default BlackButton;