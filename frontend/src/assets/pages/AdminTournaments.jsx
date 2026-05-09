import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTabs } from "../../TabsContext";
import API from "../../api";
import React from "react";
import NavBar from "../components/NavBar";
import styles from "../components/styles/admindashboard.module.css";
import CreateTournamentModal from "../components/CreateTournamentModal";
import TournamentCard from "../components/TournamentCard";
import { computeStatus } from "../components/tournamentHelpers";

const AdminTournaments = () => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState([]);
    const { addTab } = useTabs();

    const addTournament = (newTournament) => {
        setTournaments((prev) => [...prev, newTournament]);
    };

    const fetchTournaments = async () => {
        try {
            const response = await API.get('/tournaments/');
            setTournaments(response.data);
        } catch (error) {
            console.error("Помилка при завантаженні турнірів:", error);
        }
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    const [open, setOpen] = useState(false);

    return (
        <NavBar>
            <div className={styles.contentArea}>
                <div className={styles.tournamentGrid}>
                    {tournaments.map((tournament) => (
                        <div
                            className={styles.tournamentCard}
                            key={tournament.id}
                            onClick={() => {
                                addTab({ id: tournament.id, name: tournament.name });
                                navigate(`/tournament/${tournament.id}`);
                            }}
                        >
                            <TournamentCard
                                key={tournament.id}
                                name={tournament.name}
                                info={tournament.description}
                                date={tournament.start_date}
                                accentColor={tournament.accent_color}
                                imageMode={tournament.image_mode}
                                stockImage={tournament.stock_image}
                                customImage={tournament.custom_image ?? null}
                                status={computeStatus(tournament)}
                            />
                        </div>
                    ))}
                </div>
                <div className={styles.createBtnContainer}>
                    <button
                        onClick={() => setOpen(true)}
                        className={styles.createBtn}
                    >
                        + Створити турнір
                    </button>
                </div>
                {open && (
                    <CreateTournamentModal
                        onClose={() => setOpen(false)}
                        onCreate={addTournament}
                        onSubmit={(data) => {
                            console.log(data);
                            setOpen(false);
                        }}
                    />
                )}
            </div>
        </NavBar>
    );
};

export default AdminTournaments;
