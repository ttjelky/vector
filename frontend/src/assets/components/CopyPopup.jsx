import React from "react";
import { useState } from "react";
import styles from "./styles/copyPopup.module.css";

export default function CopyPopup({ label, copyText, duration = 1000 }) {
  const [visible, setVisible] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(copyText)
      .then(() => {
        setVisible(true);
        setTimeout(() => setVisible(false), duration);
      })
      .catch(err => console.error("Не вдалося скопіювати:", err));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={handleClick} className={styles.button}>
        {label}
      </button>

      <div className={`${styles["copy-popup"]} ${visible ? styles.show : ""}`}>
        Скопійовано!
      </div>
    </div>
  );
}