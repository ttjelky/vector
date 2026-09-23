import { useNavigate } from "react-router-dom";
import { BlackButton } from "@shared/components/blackbutton";
import { WhiteButton } from "@shared/components/WhiteButton";
import { getAccessToken, getUserRole } from "../api";
import { ROLE_HOME } from "../navConfig";
import styles from "./NotFound.module.css";

const NotFound = () => {
  const navigate = useNavigate();
  const isAuthed = Boolean(getAccessToken());
  const role = getUserRole() ?? localStorage.getItem("userRole");
  const homePath = isAuthed ? (ROLE_HOME[role] ?? "/tournaments") : "/";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.code} aria-label="Помилка 404">
          404
        </h1>
        <p className={styles.description}>
          Схоже, цю сторінку переміщено
          <br />
          або вона не існує.
        </p>
        <div className={styles.actions}>
          <BlackButton text="На головну" onClick={() => navigate(homePath)} />
          <WhiteButton
            text="До турнірів"
            onClick={() => navigate(isAuthed ? "/tournaments" : "/")}
          />
        </div>
      </div>
    </div>
  );
};

export { NotFound };
export default NotFound;
