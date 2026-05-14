import React from "react";
import { useState, useRef, useEffect } from "react";
import { NavBar } from "@shared/components/NavBar";
import styles from "@shared/styles/Help.module.css"
import { CopyPopup } from "@shared/components/CopyPopup";
import { X } from "lucide-react";

function FAQItem({ item, isOpen, onToggle }) {
      const contentRef = useRef(null);
      const [height, setHeight] = useState(0);
    
      useEffect(() => {
        if (contentRef.current) {
          setHeight(isOpen ? contentRef.current.scrollHeight : 0);
        }
      }, [isOpen]);
    
      return (
        <div className={styles.faqItem}>
          <button onClick={onToggle} className={styles.faqQuestion}>
            {item.question}
          <span className={`${styles.cross} ${isOpen ? styles.active : ""}`}><X size={30} /></span>
          </button>
          <div
            ref={contentRef}
            style={{ maxHeight: `${height}px`, overflow: "hidden", transition: "max-height 0.3s ease" }}
            className={styles.faqAnswer}
          >
            <p>{item.answer}</p>
          </div>
        </div>
      );
    }

const Help = () => {
    const [openId, setOpenId] = useState(null);
    const email = "Vectorcommand6742@gmail.com";
    const phone = "+380 (68) 767 54 20";
    
    const faqData = [
      {
        id: 1,
        question: "Хто може брати участь у турнірах?",
        answer: "Будь хто, хто встиг зареєструватися за назвою або спеціальним кодом.",
      },
      {
        id: 2,
        question: "Чи можна змінити дані профілю?",
        answer: "Так, прейшовши у вкладку \"Профіль\". Деякі зміни можуть вимагати повторної верифікації або підтвердження через email.",
      },
      {
        id: 3,
        question: "Як створити або приєднатися до команди?",
        answer: "Перейдіть у вкладку \"Турніри\", натисніть на кнопку \"Моя команда\", а потім створіть або приєднайтеся до команди за кодом.",
      },
      {
        id: 4,
        question: "Чи можна редагувати склад команди?",
        answer: "До початку турніру - так, а після - за дозволом організатора.",
      },
      {
        id: 5,
        question: "Як здати роботу?",
        answer: "У вкладці \"Турніри\" оберіть потрібний вам турнір, після цього натисніть \"Здати роботу\", прикріпивши файли, GitHub репозиторій або ін. (умови задає організатор).",
      },
      {
        id: 6,
        question: "Як зв'язатися з підтримкою?",
        answer: "Нижче прикріплені email та телефон підтримки платформи (підтримка платформи не має відношення до організаторів вашого турніру).",
      },
    ];
    
    return (
      <NavBar>
        <div className={styles.contentArea}>
          <div className={styles.faqSection}>
            <h2 className={styles.faqtitle}>Найпоширеніші питання</h2>
            <div className={styles.faqContainer}>
              {faqData.map((item) => (
                <FAQItem
                  key={item.id}
                  item={item}
                  isOpen={openId === item.id}
                  onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                />
              ))}
            </div>
          </div>
          <section className={styles.contactUs} id="contactUs">
            <h2 className={styles.contactUsTitle}>Не знайшли відповіді?</h2>
            <p className={styles.contactUsText}>Зв'яжіться з нами у будь-яку мить.</p>
          
            <div className={styles.email}>
              <CopyPopup label={email} copyText={email} />
            </div>
            <CopyPopup label={phone} copyText={phone} />
            </section>
        </div>
      </NavBar>
    );
};

export { Help };