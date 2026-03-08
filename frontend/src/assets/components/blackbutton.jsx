import React from "react";
import styles from "./styles/blackbutton.module.css"

function BlackButton({text, onClick}) {
    return (
        <button onClick={onClick} className={styles.blackbutton}>
            {text}
        </button>
    )
}

export default BlackButton