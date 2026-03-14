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
    <div className={styles.LandingBodyAll}>

        <div className={styles.TopLandingPhotoContainer}>
        <img src={TopLandingPhoto} alt="Top Landing Photo" className={styles.TopLandingPhoto} />
        </div>

    <header className={styles.LandingHero} id="main"> 
        <div className={styles.animate}>
        <div className={styles.LandingHeroContent}>
            <h1 className={styles.LandingBodyTitle}>Змагайтеся із</h1>
            <img className={styles.LogoText} src={logotext} alt="Vector" />
            <img src={HelloS} className={styles.HelloSticker}/>
            <img src={YouCanS} className={styles.YouCanSticker}/>
        </div>
        </div>
            <p className={styles.UnderTitle}>Завдання, дедлайни, оцінювання, прогрес — все в одному місці.</p>
            <div className={styles.UnderTitleButtons}>
            <BlackButton text={"Приєднатися до турніру"} />
            <WhiteButton text={"Дізнатися більше"} onClick={() => window.location.href = "#info"}/>
            </div>
            <div className={styles.TabletPhotoWrapper}>
            <img className={styles.TabletPhoto} src={iPad} alt="Tablet Photo" />
            </div>
    </header>
    <main>
    <section className={styles.LandingBodySection} id="info">
        <p className={styles.LandingBodyText}>Vector - це платформа для проведення турнірів.</p>
        <div className={styles.LandingBodyFeatures}>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Cableicon} alt="Cable icon" />
                <div>
                    <p className={styles.LandingBodyFeatureTitle}>Створюйте турніри</p>
                    <p className={styles.LandingBodyFeatureText}>Легко запускайте раунди з дедлайнами, завданнями та автоматичним керуванням етапами.</p>
                </div>
            </section>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Earthicon} alt="Earth icon" />
                <div>
                    <p className={styles.LandingBodyFeatureTitle}>Відстежуйте прогрес</p>
                    <p className={styles.LandingBodyFeatureText}>Переглядайте результати команд у реальному часі. Бали, статуси завдань і дедлайни — все в одному місці.</p>
                </div>
            </section>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Accounticon} alt="Account icon" />
                <div>
                    <p className={styles.LandingBodyFeatureTitle}>Перевіряйте роботи</p>
                    <p className={styles.LandingBodyFeatureText}>Учасники подають рішення прямо на платформі. Журі оцінює роботи, залишає коментарі та виставляє бали.</p>
                </div>
            </section>
            <section className={styles.LandingBodyFeature}>
                <img className={styles.LandingBodyIcon} src={Charticon} alt="Chart icon" />
                <div>
                    <p className={styles.LandingBodyFeatureTitle}>Гнучкі ролі та керування</p>
                    <p className={styles.LandingBodyFeatureText}>Ролі: учасник, журі, адміністратор. Кожен має свій функціонал і рівень доступу.</p>
                </div>
            </section>
        </div>
        <div className={styles.HeroImageContainer}>
            <img src={HeroImage} alt="Hero Image" className={styles.HeroImage} />
        </div>
        </section>
        <section className={styles.LandingBodyHowToStart} id="howToStart">
            <p className={styles.LandingBodyHowToStartTitle}>Як почати?</p>
            <div className={styles.LandingBodyHowToStartSteps}>
                <section className={styles.LandingBodyHowToStartStep}>
                    <p className={styles.LandingBodyHowToStartStepNumber}>01</p>
                    <div>
                        <p className={styles.LandingBodyHowToStartStepTitle}>Зареєструйтесь</p>
                        <p className={styles.LandingBodyHowToStartStepText}>Створіть акаунт як організатор, учасник або член журі. Це займає менше хвилини.</p>
                    </div>
                </section>
                <section className={styles.LandingBodyHowToStartStep}>
                    <p className={styles.LandingBodyHowToStartStepNumber}>02</p>
                    <div>
                        <p className={styles.LandingBodyHowToStartStepTitle}>Приєднайтеся до турніру</p>
                        <p className={styles.LandingBodyHowToStartStepText}>Організатор створює турнір і додає раунди. Команди приєднуються за запрошенням або кодом.</p>
                    </div>
                </section>
                <section className={styles.LandingBodyHowToStartStep}>
                    <p className={styles.LandingBodyHowToStartStepNumber}>03</p>
                    <div>
                        <p className={styles.LandingBodyHowToStartStepTitle}>Проводьте та змагайтесь</p>
                        <p className={styles.LandingBodyHowToStartStepText}>Завантажуйте завдання, подавайте рішення, виставляйте оцінки та відстежуйте результати в реальному часі.</p>
                    </div>
                </section>
            </div>
            <div className={styles.HeroImage2Container}>
            <img src={HeroImage2} alt="Hero Image 2" className={styles.HeroImage2} />
            </div>
        </section>
        <section className={styles.LandingBodyContactUs} id="contactUs">
            <p className={styles.LandingBodyContactUsTitle}>Зв'язатися з нами</p>
            <p className={styles.LandingBodyContactUsText}>Маєте питання? Зв'яжіться з нами у будь-яку мить.</p>
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