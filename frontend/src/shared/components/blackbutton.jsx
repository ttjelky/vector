import React from "react";
import styles from "@shared/styles/blackbutton.module.css"

function BlackButton({text, onClick}) {
    return (
        <button onClick={onClick} className={styles.blackbutton}>
            {text}
        </button>
    )
}

export default BlackButton