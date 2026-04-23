import { useEffect, useState } from "react";
import { getProfile } from "../../api";
import API from "../../api";
import React from "react";
import NavBar from "../components/NavBar";
import styles from "../components/styles/admindashboard.module.css";
import CreateTournamentModal from "../components/CreateTournamentModal";
import TournamentCard from "../components/TournamentCard";

const Dashboard = () => {

    const [tournaments, setTournaments] = useState([]);

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


    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        new_users: 0,
    });

    useEffect(() => {
        getProfile()
            .then(res => console.log(res.data))
            .catch(err => console.error(err)); 
    }, []);

    const [open, setOpen] = useState(false);

    return (
        <NavBar>
            <div className={styles.tournamentGrid}>
                {tournaments.map((tournament) => (
                <TournamentCard 
                    key={tournament.id}
                    name={tournament.name}
                    info={tournament.description}
                    date={tournament.start_date}
                    accentColor={tournament.accent_color}
                    imageMode={tournament.image_mode}
                    // Передай інші потрібні пропси
                />
                ))}
            </div>
            <div className={styles.createBtnContainer}>
                <button 
                    onClick={() => 
                    setOpen(true)} 
                    className={styles.createBtn}
                    onSubmit={addTournament}
                >
                    + Створити турнір
                </button>
            </div>
            {open && (
            <CreateTournamentModal
                onClose={() => setOpen(false)}
                onCreate={addTournament}
                onSubmit={(data) => {
                console.log(data); // відправляй на Django API
                setOpen(false);
                }}
            />
            )}
        </NavBar>
  );
};

export default Dashboard