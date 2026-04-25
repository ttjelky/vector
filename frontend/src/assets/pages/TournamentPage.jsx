import { useState, useEffect } from "react";
import styles from "../components/styles/TournamentPage.module.css";
import NavBar from "../components/NavBar";
import { useParams } from "react-router-dom";
import API from "../../api";

// Mock data
const mockTournament = {
  id: "1",
  name: "Авіва",
  description: "іваaві — міжшкільний турнір з програмування для учнів 8–11 класів. Беріть участь у командах, вирішуйте задачі та змагайтеся за призи!",
  rules: "1. Кожна команда складається з 2–4 учасників.\n2. Забороняється використання зовнішньої допомоги під час раунду.\n3. Рішення надсилаються у форматі .zip або .pdf.\n4. Жюрі залишає за собою право змінити умови раундів.",
  format: "Командний",
  status: "Реєстрація відкрита",
  startDate: "10 травня 2025",
  endDate: "25 травня 2025",
  registrationStart: "24 квітня 2025",
  registrationEnd: "5 травня 2025",
  coverImage: null,
};

const mockTeams = [
  { id: "1", name: "CodeStorm", members: 3, joinedAt: "24 квітня" },
  { id: "2", name: "ByteForce", members: 4, joinedAt: "24 квітня" },
  { id: "3", name: "NullPointers", members: 2, joinedAt: "23 квітня" },
  { id: "4", name: "AlgoRhythm", members: 4, joinedAt: "22 квітня" },
];

const mockRounds = [
  {
    id: "1",
    title: "Раунд 1 — Вступний",
    dateRange: "10–12 травня",
    status: "Майбутній",
    description: "Перший раунд з базовими задачами на логіку та алгоритми. Мета — відсів команд, які не готові до основного змагання.",
    tasks: [
      { id: "t1", title: "Задача А: Сортування", description: "Відсортуйте масив за зростанням за O(n log n)." },
      { id: "t2", title: "Задача Б: Рядки", description: "Знайдіть найдовший паліндром у рядку." },
    ],
    submissions: [
      { team: "CodeStorm", file: "solution_round1.zip", submittedAt: "11 травня, 14:32", status: "Перевірено" },
      { team: "ByteForce", file: "byteforce_r1.pdf", submittedAt: "12 травня, 09:15", status: "Очікує" },
    ],
  },
  {
    id: "2",
    title: "Раунд 2 — Основний",
    dateRange: "17–20 травня",
    status: "Майбутній",
    description: "Основний раунд з підвищеною складністю. Використовуються задачі на динамічне програмування та графи.",
    tasks: [
      { id: "t3", title: "Задача В: Граф", description: "Знайдіть найкоротший шлях між усіма парами вершин." },
    ],
    submissions: [],
  },
  {
    id: "3",
    title: "Фінал",
    dateRange: "23–25 травня",
    status: "Майбутній",
    description: "Фінальний раунд для топ-3 команд. Умови задач оголошуються у день змагання.",
    tasks: [],
    submissions: [],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return <span className={styles.badge}>{status}</span>;
}

function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab({ tournament }) {
  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Про турнір</h2>
        <p className={styles.description}>{tournament.description}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Деталі</h2>
        <div className={styles.infoGrid}>
          <InfoRow label="Формат" value={tournament.format} />
          <InfoRow label="Статус" value={<StatusBadge status={tournament.status} />} />
          <InfoRow label="Початок турніру" value={tournament.startDate} />
          <InfoRow label="Кінець турніру" value={tournament.endDate} />
          <InfoRow label="Початок реєстрації" value={tournament.registrationStart} />
          <InfoRow label="Кінець реєстрації" value={tournament.registrationEnd} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Правила</h2>
        <div className={styles.rulesBox}>
          {tournament.rules.split("\n").map((line, i) => (
            <p key={i} className={styles.ruleLine}>{line}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function ParticipantsTab({ teams }) {
  const [copied, setCopied] = useState(false);

  const handleInvite = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.participantsHeader}>
        <span className={styles.teamCount}>{teams.length} команд</span>
        <button className={styles.inviteBtn} onClick={handleInvite}>
          {copied ? "✓ Скопійовано!" : "+ Запросити команду"}
        </button>
      </div>

      <div className={styles.teamList}>
        {teams.map((team, idx) => (
          <div key={team.id} className={styles.teamCard}>
            <div className={styles.teamIndex}>{idx + 1}</div>
            <div className={styles.teamInfo}>
              <span className={styles.teamName}>{team.name}</span>
              <span className={styles.teamMeta}>{team.members} учасник{team.members === 1 ? "" : team.members < 5 ? "и" : "ів"}</span>
            </div>
            <div className={styles.teamDate}>{team.joinedAt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoundsTab({ rounds }) {
  const [openRound, setOpenRound] = useState(null);
  const [activeSection, setActiveSection] = useState({});

  const toggleRound = (id) => {
    setOpenRound(openRound === id ? null : id);
    setActiveSection((s) => ({ ...s, [id]: s[id] || "tasks" }));
  };

  const setSection = (roundId, section) =>
    setActiveSection((s) => ({ ...s, [roundId]: section }));

  return (
    <div className={styles.tabContent}>
      <div className={styles.roundList}>
        {rounds.map((round) => {
          const isOpen = openRound === round.id;
          const section = activeSection[round.id] || "tasks";

          return (
            <div key={round.id} className={`${styles.roundCard} ${isOpen ? styles.roundCardOpen : ""}`}>
              <button className={styles.roundHeader} onClick={() => toggleRound(round.id)}>
                <div className={styles.roundHeaderLeft}>
                  <span className={styles.roundTitle}>{round.title}</span>
                  <span className={styles.roundDate}>{round.dateRange}</span>
                </div>
                <div className={styles.roundHeaderRight}>
                  <span className={styles.roundStatus}>{round.status}</span>
                  <span className={styles.roundChevron}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className={styles.roundBody}>
                  <p className={styles.roundDescription}>{round.description}</p>

                  <div className={styles.roundTabs}>
                    <button
                      className={`${styles.roundTab} ${section === "tasks" ? styles.roundTabActive : ""}`}
                      onClick={() => setSection(round.id, "tasks")}
                    >
                      Завдання
                    </button>
                    <button
                      className={`${styles.roundTab} ${section === "submissions" ? styles.roundTabActive : ""}`}
                      onClick={() => setSection(round.id, "submissions")}
                    >
                      Здані роботи
                    </button>
                  </div>

                  {section === "tasks" && (
                    <div className={styles.taskList}>
                      {round.tasks.length === 0 ? (
                        <p className={styles.empty}>Завдання ще не додані.</p>
                      ) : (
                        round.tasks.map((task) => (
                          <div key={task.id} className={styles.taskCard}>
                            <span className={styles.taskTitle}>{task.title}</span>
                            <p className={styles.taskDesc}>{task.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {section === "submissions" && (
                    <div className={styles.submissionList}>
                      {round.submissions.length === 0 ? (
                        <p className={styles.empty}>Жодних здач ще немає.</p>
                      ) : (
                        round.submissions.map((sub, i) => (
                          <div key={i} className={styles.submissionCard}>
                            <div className={styles.submissionInfo}>
                              <span className={styles.submissionTeam}>{sub.team}</span>
                              <span className={styles.submissionFile}>📎 {sub.file}</span>
                              <span className={styles.submissionDate}>{sub.submittedAt}</span>
                            </div>
                            <span className={`${styles.submissionStatus} ${sub.status === "Перевірено" ? styles.submissionStatusDone : ""}`}>
                              {sub.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TournamentPage() {
  const [activeTab, setActiveTab] = useState("overview");

 const { id } = useParams();
    const [tournament, setTournament] = useState(null); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                const response = await API.get(`/tournaments/${id}/`);
                setTournament(response.data);
            } catch (error) {
                console.error("Помилка:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTournament();
    }, [id]);

    if (loading) return <div>Завантаження...</div>;
    if (!tournament) return <div>Турнір не знайдено</div>;

  const tabs = [
    { id: "overview", label: "Основна сторінка" },
    { id: "rounds", label: "Раунди" },
    { id: "participants", label: "Учасники" },
  ];

  return (
    <NavBar>
    <div className={styles.page}>
      {/* Cover */}
      <div className={styles.cover}>
        <div className={styles.coverInner}>
          <span className={styles.coverPlaceholder}>Зображення турніру</span>
        </div>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>{tournament.name}</h1>
            <p className={styles.subtitle}>{tournament.description.slice(0, 80)}…</p>
          </div>
          <StatusBadge status={tournament.status} />
        </div>
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.content}>
        {activeTab === "overview" && <OverviewTab tournament={tournament} />}
        {activeTab === "rounds" && <RoundsTab rounds={mockRounds} />}
        {activeTab === "participants" && <ParticipantsTab teams={mockTeams} />}
      </div>
    </div>
    </NavBar>
  );
}
