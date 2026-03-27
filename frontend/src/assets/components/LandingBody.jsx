import React from "react";
import styles from "./styles/landingBody.module.css";
import logotext from "./static/VectorLogoText.svg";
import Cableicon from "./static/icons/Cableicon.svg";
import Earthicon from "./static/icons/Earthicon.svg";
import Charticon from "./static/icons/Charticon.svg";
import Accounticon from "./static/icons/Accounticon.svg";
import TopLandingPhoto from "./static/TopLandingPhoto.png";
import HeroImage from "./static/HeroImage.png";
import HeroImage2 from "./static/HeroImage2.png";
import HelloS from "./static/stickers/HelloS.svg";
import YouCanS from "./static/stickers/YouCanS.svg";
import BlackButton from "./blackbutton";
import WhiteButton from "./WhiteButton";
import iPad from "./static/Ipad.png";
import CopyPopup from "./CopyPopup";

const LandingBody = () => {
    const email = "Vectorcommand6742@gmail.com";
    const phone = "+380 (68) 767 54 20";
return (
    <div>
        <img src={TopLandingPhoto} alt="Top Landing Photo" className={styles.TopPhoto} />

        <header className={styles.header} id="main"> 

            <div className={styles.animate}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>Змагайтеся із</h1>
                    <img className={styles.LogoText} src={logotext} alt="Vector" />
                    <img src={HelloS} className={styles.HelloS}/>
                    <img src={YouCanS} className={styles.YouCanS}/>
                </div>
            </div>

                <p className={styles.subtitle}>Завдання, дедлайни, оцінювання, прогрес — все в одному місці.</p>

                <div className={styles.buttons}>
                    <BlackButton text={"Приєднатися до турніру"} />
                    <WhiteButton text={"Дізнатися більше"} onClick={() => window.location.href = "#info"}/>
                </div>

                <div className={styles.img1wrapper}>
                    <img className={styles.img1} src={iPad} alt="photo" />
                </div>

        </header>

        <main>
            <section className={styles.featureSec} id="info">
                <p className={styles.title2}>Vector - це платформа для проведення турнірів.</p>
                <div className={styles.features}>

                    <section className={styles.feature}>
                        <img className={styles.icon} src={Cableicon} alt="Cable icon" />
                        <p className={styles.featureTitle}>Створюйте турніри</p>
                        <p className={styles.featureText}>Легко запускайте раунди з дедлайнами, завданнями та автоматичним керуванням етапами.</p>
                    </section>

                    <section className={styles.feature}>
                        <img className={styles.icon} src={Earthicon} alt="Earth icon" />
                        <p className={styles.featureTitle}>Відстежуйте прогрес</p>
                        <p className={styles.featureText}>Переглядайте результати команд у реальному часі. Бали, статуси завдань і дедлайни — все в одному місці.</p>
                    </section>

                    <section className={styles.feature}>
                        <img className={styles.icon} src={Accounticon} alt="Account icon" />
                        <p className={styles.featureTitle}>Перевіряйте роботи</p>
                        <p className={styles.featureText}>Учасники подають рішення прямо на платформі. Журі оцінює роботи, залишає коментарі та виставляє бали.</p>
                    </section>

                    <section className={styles.feature}>
                        <img className={styles.icon} src={Charticon} alt="Chart icon" />
                        <p className={styles.featureTitle}>Гнучкі ролі та керування</p>
                        <p className={styles.featureText}>Ролі: учасник, журі, адміністратор. Кожен має свій функціонал і рівень доступу.</p>
                    </section>

                </div>

                <div className={styles.img2wrapper}>
                    <img src={HeroImage} alt="Hero Image"/>
                </div>
            </section>

            <section className={styles.howToStart} id="howToStart">
                <p className={styles.howToStartTitle}>Як почати?</p>

                <div className={styles.steps}>
                    <section className={styles.step}>
                        <p className={styles.stepNumber}>01</p>
                        <p className={styles.stepTitle}>Зареєструйтесь</p>
                        <p className={styles.stepText}>Створіть акаунт як організатор, учасник або член журі. Це займає менше хвилини.</p>
                    </section>

                    <section className={styles.step}>
                        <p className={styles.stepNumber}>02</p>
                        <p className={styles.stepTitle}>Приєднайтеся до турніру</p>
                        <p className={styles.stepText}>Організатор створює турнір і додає раунди. Команди приєднуються за запрошенням або кодом.</p>
                    </section>

                    <section className={styles.step}>
                        <p className={styles.stepNumber}>03</p>
                        <p className={styles.stepTitle}>Проводьте та змагайтесь</p>
                        <p className={styles.stepText}>Завантажуйте завдання, подавайте рішення, виставляйте оцінки та відстежуйте результати в реальному часі.</p>
                    </section>
                </div>

                <div className={styles.img3wrapper}>
                    <img src={HeroImage2} alt="Hero Image 2" className={styles.img3} />
                </div>
            </section>

            <section className={styles.contactUs} id="contactUs">
                <p className={styles.contactUsTitle}>Зв'язатися з нами</p>
                <p className={styles.contactUsText}>Маєте питання? Зв'яжіться з нами у будь-яку мить.</p>

                <div className={styles.email}>
                    <CopyPopup label={email} copyText={email} />
                </div>
                <CopyPopup label={phone} copyText={phone} />
            </section>
        </main>
    </div>
    );
}

export default LandingBody;