import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "@shared/styles/landingBody.module.css";
import logotext from "@static/VectorLogoText.svg";
import Cableicon from "@static/icons/Cableicon.svg";
import Earthicon from "@static/icons/Earthicon.svg";
import Charticon from "@static/icons/Charticon.svg";
import Accounticon from "@static/icons/Accounticon.svg";
import HeroImage from "@static/HeroImage.png";
import HeroImage2 from "@static/HeroImage2.png";
import HelloS from "@static/stickers/HelloS.svg";
import YouCanS from "@static/stickers/YouCanS.svg";
import { BlackButton } from "./blackbutton";
import { WhiteButton } from "./WhiteButton";
import iPad from "@static/Ipad.png";
import { CopyPopup } from "./CopyPopup";
import joinStyles from "@features/tournaments/styles/JoinTournamentPage.module.css";

function extractToken(input) {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        const parts = url.pathname.split("/").filter(Boolean);
        const joinIdx = parts.indexOf("join");
        if (joinIdx !== -1 && parts[joinIdx + 1]) return parts[joinIdx + 1];
    } catch { }
    return trimmed;
}

// Хук для відстеження появи елементів у viewport
function useReveal(options = {}) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.15, ...options }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return [ref, visible];
}

const LandingBody = () => {
    const navigate = useNavigate();
    const email = "Vectorcommand6742@gmail.com";
    const phone = "+380 (68) 767 54 20";

    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinInput,     setJoinInput]     = useState("");
    const [joinError,     setJoinError]     = useState("");

    const handleJoinOpen  = () => { setJoinInput(""); setJoinError(""); setShowJoinModal(true); };
    const handleJoinClose = () => setShowJoinModal(false);
    const handleJoinSubmit = () => {
        const token = extractToken(joinInput);
        if (!token) { setJoinError("Введіть посилання або токен запрошення"); return; }
        navigate(`/join/${token}`);
    };

    // Refs для секцій
    const [title2Ref,    title2Visible]    = useReveal();
    const [feat1Ref,     feat1Visible]     = useReveal({ threshold: 0.2 });
    const [feat2Ref,     feat2Visible]     = useReveal({ threshold: 0.2 });
    const [feat3Ref,     feat3Visible]     = useReveal({ threshold: 0.2 });
    const [feat4Ref,     feat4Visible]     = useReveal({ threshold: 0.2 });
    const [img2Ref,      img2Visible]      = useReveal({ threshold: 0.1 });
    const [howTitleRef,  howTitleVisible]  = useReveal();
    const [step1Ref,     step1Visible]     = useReveal({ threshold: 0.2 });
    const [step2Ref,     step2Visible]     = useReveal({ threshold: 0.2 });
    const [step3Ref,     step3Visible]     = useReveal({ threshold: 0.2 });
    const [img3Ref,      img3Visible]      = useReveal({ threshold: 0.1 });
    const [contactRef,   contactVisible]   = useReveal({ threshold: 0.1 });

    const rv = (visible, extra = "") =>
        `${extra} ${styles.reveal} ${visible ? styles.revealVisible : ""}`.trim();

    return (
        <div>
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
                    <BlackButton text={"Приєднатися до турніру"} onClick={handleJoinOpen} />
                    <WhiteButton text={"Дізнатися більше"} onClick={() => window.location.href = "#info"}/>
                </div>

                <div className={styles.img1wrapper}>
                    <img className={styles.img1} src={iPad} alt="photo" />
                </div>
            </header>

            <main>
                <section className={styles.featureSec} id="info">

                    <p
                        ref={title2Ref}
                        className={`${styles.title2} ${styles.reveal} ${title2Visible ? styles.revealVisible : ""}`}
                    >
                        Vector - це платформа для проведення турнірів.
                    </p>

                    <div className={styles.features}>
                        <section ref={feat1Ref} className={`${styles.feature} ${styles.revealLeft} ${feat1Visible ? styles.revealVisible : ""}`}>
                            <img className={styles.icon} src={Cableicon} alt="Cable icon" />
                            <p className={styles.featureTitle}>Створюйте турніри</p>
                            <p className={styles.featureText}>Легко запускайте раунди з дедлайнами, завданнями та автоматичним керуванням етапами.</p>
                        </section>

                        <section ref={feat2Ref} className={`${styles.feature} ${styles.revealUp} ${feat2Visible ? styles.revealVisible : ""}`} style={{ transitionDelay: "0.1s" }}>
                            <img className={styles.icon} src={Earthicon} alt="Earth icon" />
                            <p className={styles.featureTitle}>Відстежуйте прогрес</p>
                            <p className={styles.featureText}>Переглядайте результати команд у реальному часі. Бали, статуси завдань і дедлайни — все в одному місці.</p>
                        </section>

                        <section ref={feat3Ref} className={`${styles.feature} ${styles.revealUp} ${feat3Visible ? styles.revealVisible : ""}`} style={{ transitionDelay: "0.22s" }}>
                            <img className={styles.icon} src={Accounticon} alt="Account icon" />
                            <p className={styles.featureTitle}>Перевіряйте роботи</p>
                            <p className={styles.featureText}>Учасники подають рішення прямо на платформі. Журі оцінює роботи, залишає коментарі та виставляє бали.</p>
                        </section>

                        <section ref={feat4Ref} className={`${styles.feature} ${styles.revealRight} ${feat4Visible ? styles.revealVisible : ""}`} style={{ transitionDelay: "0.34s" }}>
                            <img className={styles.icon} src={Charticon} alt="Chart icon" />
                            <p className={styles.featureTitle}>Гнучкі ролі та керування</p>
                            <p className={styles.featureText}>Ролі: учасник, журі, адміністратор. Кожен має свій функціонал і рівень доступу.</p>
                        </section>
                    </div>

                    <div ref={img2Ref} className={`${styles.img2wrapper} ${styles.revealScale} ${img2Visible ? styles.revealVisible : ""}`}>
                        <img src={HeroImage} alt="Hero Image" className={styles.img2} />
                    </div>
                </section>

                <section className={styles.howToStart} id="howToStart">
                    <p
                        ref={howTitleRef}
                        className={`${styles.howToStartTitle} ${styles.reveal} ${howTitleVisible ? styles.revealVisible : ""}`}
                    >
                        Як почати?
                    </p>

                    <div className={styles.steps}>
                        <section ref={step1Ref} className={`${styles.step} ${styles.revealUp} ${step1Visible ? styles.revealVisible : ""}`}>
                            <p className={styles.stepNumber}>01</p>
                            <p className={styles.stepTitle}>Зареєструйтесь</p>
                            <p className={styles.stepText}>Створіть акаунт як організатор, учасник або член журі. Це займає менше хвилини.</p>
                        </section>

                        <section ref={step2Ref} className={`${styles.step} ${styles.revealUp} ${step2Visible ? styles.revealVisible : ""}`} style={{ transitionDelay: "0.15s" }}>
                            <p className={styles.stepNumber}>02</p>
                            <p className={styles.stepTitle}>Приєднайтеся до турніру</p>
                            <p className={styles.stepText}>Організатор створює турнір і додає раунди. Команди приєднуються за запрошенням або кодом.</p>
                        </section>

                        <section ref={step3Ref} className={`${styles.step} ${styles.revealUp} ${step3Visible ? styles.revealVisible : ""}`} style={{ transitionDelay: "0.3s" }}>
                            <p className={styles.stepNumber}>03</p>
                            <p className={styles.stepTitle}>Проводьте та змагайтесь</p>
                            <p className={styles.stepText}>Завантажуйте завдання, подавайте рішення, виставляйте оцінки та відстежуйте результати в реальному часі.</p>
                        </section>
                    </div>

                    <div ref={img3Ref} className={`${styles.img3wrapper} ${styles.revealScale} ${img3Visible ? styles.revealVisible : ""}`}>
                        <img src={HeroImage2} alt="Hero Image 2" className={styles.img3} />
                    </div>
                </section>

                <section
                    ref={contactRef}
                    className={`${styles.contactUs} ${styles.reveal} ${contactVisible ? styles.revealVisible : ""}`}
                    id="contactUs"
                >
                    <p className={styles.contactUsTitle}>Зв'язатися з нами</p>
                    <p className={styles.contactUsText}>Маєте питання? Зв'яжіться з нами у будь-яку мить.</p>
                    <div className={styles.email}>
                        <CopyPopup label={email} copyText={email} />
                    </div>
                    <CopyPopup label={phone} copyText={phone} />
                </section>
            </main>

            {showJoinModal && (
                <div className={joinStyles.overlay} onClick={handleJoinClose}>
                    <div className={joinStyles.modal} onClick={(e) => e.stopPropagation()}>
                        <button className={joinStyles.closeBtn} onClick={handleJoinClose}>✕</button>
                        <h2 className={joinStyles.title}>Приєднатися до турніру</h2>
                        <p className={joinStyles.hint}>Вставте посилання-запрошення або токен, який вам надіслав організатор.</p>
                        <input
                            className={`${joinStyles.input} ${joinError ? joinStyles.inputError : ""}`}
                            type="text"
                            placeholder="https://... або токен"
                            value={joinInput}
                            onChange={(e) => { setJoinInput(e.target.value); setJoinError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleJoinSubmit()}
                            autoFocus
                            style={{ fontSize: 14, fontWeight: 400, letterSpacing: "normal", textAlign: "left" }}
                        />
                        {joinError && <p className={joinStyles.error}>{joinError}</p>}
                        <button className={joinStyles.btn} onClick={handleJoinSubmit}>
                            Перейти
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export { LandingBody };
