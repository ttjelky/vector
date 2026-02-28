import React from "react";
import styles from "./styles/buttonblack.module.css";

const ButtonBlack = ({ text, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={styles.buttonblack}
        >
            {text}
        </button>
    );
}

export default ButtonBlack;