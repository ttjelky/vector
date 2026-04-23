import React from "react";
import styles from "./styles/CreateTournamentModal.module.css";
import { useState } from "react";

const TournamentCard = ({ name, info, date, accentColor, image, imageMode }) => {
    
    const formatDate = (dateValue) => {
        const d = (dateValue && typeof dateValue === 'string' && dateValue.trim() !== "") 
        ? new Date(dateValue) 
        : new Date();

        if (isNaN(d.getTime())) {
        return new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
        }

        return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
    };
    return (
        <div>
            <div className={styles.previewCard} style={{ '--accent': accentColor }}>
                <div className={styles.previewImage}>
                    {imageMode === "none" && <div className={styles.imagePlaceholder}>Зображення турніру</div>}
                    {/* Тут буде логіка для стокових або завантажених фото */}
                </div>
        
                <div className={styles.previewContent}>
                    <div className={styles.previewHeader}>
                        <h3 className={styles.previewName}>
                        {name || "Назва вашого турніру"}
                        </h3>
                        <div className={styles.previewBadge}>Реєстрація відкрита</div>
                    </div>
                    <p className={styles.previewInfo}>
                        {info 
                        ? (info.length > 100 
                        ? info.substring(0, 100) + "..." 
                        : info)
                        : "Детальний опис вашого турніру, який буде видно учасникам. Можете розповісти про призи, умови або просто привітатися!"
                        }
                    </p>
                    <div className={styles.previewFooter}>
                        <span className={styles.previewDate}>
                            {formatDate(date)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentCard;