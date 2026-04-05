import React from "react";
import styles from "./styles/whitebutton.module.css";

// Додаємо className у деструктуризацію пропсів
function WhiteButton({ text, onClick, className }) {
    return (
        /* Об'єднуємо базовий стиль зі стилем, який передаємо (наприклад, MOBILE) */
        <button 
            onClick={onClick} 
            className={`${styles.whitebutton} ${className || ""}`}
        >
            {text}
        </button>
    );
}

export default WhiteButton;