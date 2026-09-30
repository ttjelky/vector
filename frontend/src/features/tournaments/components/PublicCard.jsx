import { Users, User } from "lucide-react";
import { mediaUrl } from "@api";
import { TournamentCard } from "./TournamentCard";
import { StatusBadge } from "./TournamentShared";
import { RegistrationFormRenderer } from "./RegistrationFormBuilder";
import { computeStatus } from "./tournamentHelpers";
import styles from "../styles/tournaments.module.css";

export function FormatMark({ type }) {
  const Icon = type === "team" ? Users : User;
  return (
    <span className={styles.pubFormat}>
      <Icon size={14} strokeWidth={2} />
      {type === "team" ? "Командний" : "Одиночний"}
    </span>
  );
}

export function RegMark({ open, message }) {
  return open === false ? (
    <span
      className={`${styles.regMark} ${styles.regClosed}`}
      title={message || "Реєстрація закрита"}
    >
      Реєстрація закрита
    </span>
  ) : (
    <span className={`${styles.regMark} ${styles.regOpen}`}>
      Реєстрація відкрита
    </span>
  );
}

// Картка каталогу: превʼю + мета-рядок з дією. cellClass — styles.cell
// для стрічок, styles.gridCell для вертикальних сіток.
export function PublicCell({ t, dimmed, cellClass, onJoin }) {
  const status = computeStatus(t);
  const custom = t.custom_image
    ? (String(t.custom_image).startsWith("http")
      ? t.custom_image
      : mediaUrl(t.custom_image))
    : null;
  return (
    <div className={styles.pubCell}>
      <div
        className={`${cellClass} ${dimmed ? styles.cellDimmed : ""}`}
        onClick={() => onJoin(t)}
        role="button"
        tabIndex={0}
        aria-label={`Приєднатися до турніру ${t.name}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onJoin(t); } }}
      >
        <TournamentCard
          name={t.name}
          info={t.description}
          date={t.start_date}
          accentColor={t.accent_color}
          imageMode={t.image_mode}
          stockImage={t.stock_image}
          customImage={custom}
          status={status}
        />
      </div>
      <div className={styles.pubMeta}>
        <StatusBadge status={status} />
        <FormatMark type={t.tournament_type} />
        <RegMark open={t.registration_open} message={t.registration_message} />
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => onJoin(t)}
        >
          Приєднатися
        </button>
      </div>
    </div>
  );
}

export function PublicJoinDialog({ join }) {
  const {
    selected, regFields, answers, setAnswers, formErrors,
    joining, joinError, joinedId, closeJoin, handleJoin,
  } = join;
  if (!selected) return null;
  return (
    <div className={styles.modalOverlay} onClick={closeJoin}>
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{selected.name}</h2>
        <p className={styles.modalSub}>Публічний турнір · приєднання в 1 клік</p>
        {selected.registration_open === false && (
          <p className={styles.modalWarn}>
            {selected.registration_message || "Реєстрація в цей турнір зараз закрита."}
          </p>
        )}
        {selected.registration_open !== false && regFields.length > 0 && (
          <>
            <p className={styles.modalFormLabel}>Заповніть форму реєстрації:</p>
            <RegistrationFormRenderer
              fields={regFields}
              values={answers}
              onChange={setAnswers}
              errors={formErrors}
            />
          </>
        )}
        {joinError && <p className={styles.modalError}>{joinError}</p>}
        {joinedId === selected.id && (
          <p className={styles.modalSuccess}>Ви приєдналися! Переходимо…</p>
        )}
        <div className={styles.modalActions}>
          <button type="button" className="btn-secondary" onClick={closeJoin}>
            Скасувати
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleJoin}
            disabled={joining || selected.registration_open === false}
          >
            {selected.registration_open === false ? "Реєстрація закрита" : joining ? "Приєднання…" : "Приєднатися"}
          </button>
        </div>
      </div>
    </div>
  );
}
