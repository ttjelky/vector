import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "../../TabsContext";
import API from "../../api";
import NavBar from "../components/NavBar";
import TournamentCard from "../components/TournamentCard";
import JoinByCodeModal from "../components/JoinByCodeModal";
import styles from "../components/styles/admindashboard.module.css";

const ParticipantTournaments = () => {
  const navigate = useNavigate();
  const { addTab } = useTabs();
  const [tournaments, setTournaments] = useState([]);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    API.get("/tournaments/")
      .then((res) => setTournaments(res.data))
      .catch((err) => console.error("Помилка завантаження турнірів:", err));
  }, []);

  return (
    <NavBar>
      <div className={styles.contentArea}>
        <div className={styles.tournamentGrid}>
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className={styles.tournamentCard}
              onClick={() => {
                addTab({ id: tournament.id, name: tournament.name });
                navigate(`/tournament/${tournament.id}`);
              }}
            >
              <TournamentCard
                name={tournament.name}
                info={tournament.description}
                date={tournament.start_date}
                accentColor={tournament.accent_color}
                imageMode={tournament.image_mode}
                stockImage={tournament.stock_image}
                customImage={tournament.custom_image ?? null}
              />
            </div>
          ))}
        </div>

        <div className={styles.createBtnContainer}>
          <button
            className={styles.createBtn}
            onClick={() => setShowJoin(true)}
          >
            + Приєднатися до турніру
          </button>
        </div>
      </div>

      {showJoin && <JoinByCodeModal onClose={() => setShowJoin(false)} />}
    </NavBar>
  );
};

export default ParticipantTournaments;
