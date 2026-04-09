import React from "react";
import styles from "./styles/whitebutton.module.css"

function WhiteButton({text, onClick}) {
    return (
        <button onClick={onClick} className={styles.whitebutton}>
            {text}
        </button>
    )
}

export default WhiteButton