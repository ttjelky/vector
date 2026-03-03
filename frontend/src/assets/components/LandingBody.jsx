import React from "react";
import styles from "./styles/landingBody.module.css";
import logotext from "./static/VectorLogoText.svg";
import tabletphoto from "./static/TabletPhoto.png";
import Cableicon from "./static/icons/Cableicon.svg";
import Earthicon from "./static/icons/Earthicon.svg";
import Charticon from "./static/icons/Charticon.svg";
import Accounticon from "./static/icons/Accounticon.svg";

const LandingBody = () => {
    return (
    <div className={styles.LandingBodyAll}>

    <header className={styles.LandingHero}> 
            <h1 className={styles.LandingBodyTitle}>Вас вітає</h1>
            <img className={styles.LogoText} src={logotext} alt="Vector" />
            <img className={styles.TabletPhoto} src={tabletphoto} alt="Tablet Photo" />
    </header>

    <main>
        <section className={styles.LandingBodySection}>
        <p className={styles.LandingBodyText}>Vector - це платформа для <br />проведення турнірів.</p>
        <div className={styles.LandingBodyFeatures}>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Cableicon} alt="Cable icon" />
                <div>
                    <p>Створюйте турнірні раунди</p>
                    <p>Легко запускайте раунди з дедлайнами, завданнями та автоматичним керуванням етапами.</p>
                </div>
            </section>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Earthicon} alt="Earth icon" />
                <div>
                    <p>Відстежуйте прогрес</p>
                    <p>Переглядайте результати команд у реальному часі. Бали, статуси завдань і дедлайни — все в одному місці.</p>
                </div>
            </section>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Accounticon} alt="Account icon" />
                <div>
                    <p>Перевіряйте роботи</p>
                    <p>Учасники подають рішення прямо на платформі. Журі оцінює роботи, залишає коментарі та виставляє бали.</p>
                </div>
            </section>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Charticon} alt="Chart icon" />
                <div>
                    <p>Гнучкі ролі та керування</p>
                    <p>Ролі: учасник, журі, адміністратор. Кожен має свій функціонал і рівень доступу.</p>
                </div>
            </section>
        </div>
        </section>
    </main>
    
    </div>
    );
}

export default LandingBody;