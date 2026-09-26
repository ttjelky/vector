import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Globe } from "lucide-react";
import { API } from '@api';
import { NavBar } from "@shared/components/NavBar";
import { TournamentCard } from "../components/TournamentCard";
import { RegistrationFormRenderer } from "../components/RegistrationFormBuilder";
import { computeStatus, pluralize } from "../components/tournamentHelpers";
import styles from "../styles/tournaments.module.css";

const STATUS_ORDER = { ongoing: 0, registration: 1, upcoming: 2, finished: 3 };
const STATUS_LABELS = {
  ongoing: "Триває", registration: "Реєстрація", upcoming: "Скоро", finished: "Завершено",
};

function sortTournaments(list, sortBy, sortAsc) {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") {
      cmp = new Date(a.start_date ?? 0) - new Date(b.start_date ?? 0);
    } else if (sortBy === "status") {
      cmp = (STATUS_ORDER[computeStatus(a)] ?? 99) - (STATUS_ORDER[computeStatus(b)] ?? 99);
    } else {
      cmp = (a.name ?? "").localeCompare(b.name ?? "", "uk");
    }
    return sortAsc ? cmp : -cmp;
  });
}

const PublicTournaments = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all"); // all | solo | team
  const [statusFilter, setStatusFilter] = useState("all");

  // Join modal
  const [selected, setSelected] = useState(null);
  const [regFields, setRegFields] = useState([]);
  const [answers, setAnswers] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinedId, setJoinedId] = useState(null);

  const fetchPublic = async () => {
    setLoading(true);
    try {
      const res = await API.get("/tournaments/public/");
      setTournaments(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPublic(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tournaments;
    if (q) {
      list = list.filter((t) =>
        t.name?.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().replace(/<[^>]*>/g, "").includes(q)
      );
    }
    if (typeFilter !== "all") list = list.filter((t) => t.tournament_type === typeFilter);
    if (statusFilter !== "all") list = list.filter((t) => computeStatus(t) === statusFilter);
    return sortTournaments(list, sortBy, sortAsc);
  }, [tournaments, search, typeFilter, statusFilter, sortBy, sortAsc]);

  const openJoin = async (t) => {
    setSelected(t);
    setAnswers({});
    setFormErrors({});
    setJoinError("");
    setRegFields([]);
    // Статус реєстрації (registration_open/message) вже є в картці зі списку.
    try {
      const r = await API.get(`/tournaments/${t.id}/registration-form/`).catch(() => ({ data: [] }));
      setRegFields(r.data || []);
    } catch {
      setRegFields([]);
    }
  };

  const handleJoin = async () => {
    if (!selected) return;
    setJoining(true);
    setJoinError("");
    setFormErrors({});
    try {
      const payload = Object.keys(answers).length ? { answers } : {};
      const res = await API.post(`/tournaments/${selected.id}/join-public/`, payload);
      setJoinedId(selected.id);
      setTimeout(() => {
        setSelected(null);
        setJoinedId(null);
        navigate(`/tournament/${res.data.tournament_id}`);
      }, 1200);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && typeof data.errors === "object") setFormErrors(data.errors);
      else {
        setJoinError(data?.detail || "Не вдалось приєднатися.");
        // Якщо бекенд каже що закрито (stale картки) — оновлюємо статус модалки
        if (data?.reason) {
          setSelected((prev) => prev ? {
            ...prev,
            registration_open: false,
            registration_reason: data.reason,
            registration_message: data.detail,
          } : prev);
        }
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <NavBar>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Globe size={24} /> Публічні турніри
            </h1>
            <p className={styles.pageSubtitle}>
              {pluralize(filtered.length, "доступний турнір", "доступні турніри", "доступних турнірів")}
              {" — приєднання в 1 клік без посилання"}
            </p>
          </div>
        </div>

        <div className={styles.toolbar} style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 220 }}>
            <Search size={16} style={{ color: "#888" }} />
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Пошук за назвою або описом…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className={styles.sortSelect} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Всі формати</option>
            <option value="solo">Одиночні</option>
            <option value="team">Командні</option>
          </select>

          <select className={styles.sortSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Всі статуси</option>
            <option value="registration">Реєстрація</option>
            <option value="ongoing">Тривають</option>
            <option value="upcoming">Скоро</option>
            <option value="finished">Завершені</option>
          </select>

          <div className={styles.sortRow}>
            <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">За датою</option>
              <option value="status">За статусом</option>
              <option value="name">За назвою</option>
            </select>
            <button className={styles.sortOrderBtn} onClick={() => setSortAsc((v) => !v)}>
              {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard} style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Публічних турнірів немає</p>
            <p className={styles.emptyText}>Спробуйте змінити пошук або фільтри</p>
          </div>
        ) : (
          <div className={styles.tournamentGrid}>
            {filtered.map((t) => (
              <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className={styles.tournamentCard} onClick={() => openJoin(t)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") openJoin(t); }}>
                  <TournamentCard
                    name={t.name}
                    info={t.description}
                    date={t.start_date}
                    accentColor={t.accent_color}
                    imageMode={t.image_mode}
                    stockImage={t.stock_image}
                    customImage={t.custom_image ?? null}
                    status={computeStatus(t)}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#666", padding: "0 4px", flexWrap: "wrap" }}>
                  <span style={{
                    background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d",
                    borderRadius: 100, padding: "2px 8px", fontWeight: 700,
                  }}>{STATUS_LABELS[computeStatus(t)] || computeStatus(t)}</span>
                  <span>{t.tournament_type === "team" ? "👥 Командний" : "👤 Одиночний"}</span>
                  {t.registration_open === false ? (
                    <span title={t.registration_message || "Реєстрація закрита"} style={{
                      background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309",
                      borderRadius: 100, padding: "2px 8px", fontWeight: 700,
                    }}>🔒 Реєстрація закрита</span>
                  ) : (
                    <span style={{
                      background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8",
                      borderRadius: 100, padding: "2px 8px", fontWeight: 700,
                    }}>✅ Реєстрація відкрита</span>
                  )}
                  <button className="btn-primary btn-sm" style={{ marginLeft: "auto" }}
                    onClick={() => openJoin(t)}>Приєднатися →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className={styles.modalOverlay || ""} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20,
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: "#fff", borderRadius: 20, padding: 24, maxWidth: 520,
            width: "100%", maxHeight: "90vh", overflowY: "auto",
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{selected.name}</h2>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
              Публічний турнір · приєднання в 1 клік
            </p>
            {selected.registration_open === false && (
              <p style={{ color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
                🔒 {selected.registration_message || "Реєстрація в цей турнір зараз закрита."}
              </p>
            )}
            {selected.registration_open !== false && regFields.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 700 }}>Заповніть форму реєстрації:</p>
                <RegistrationFormRenderer
                  fields={regFields}
                  values={answers}
                  onChange={setAnswers}
                  errors={formErrors}
                />
              </>
            )}
            {joinError && <p style={{ color: "#d04d3e", fontSize: 13 }}>{joinError}</p>}
            {joinedId === selected.id && (
              <p style={{ color: "#15803d", fontSize: 13, fontWeight: 700 }}>✅ Ви приєдналися! Переходимо…</p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Скасувати</button>
              <button className="btn-primary"
                style={{ background: "#18181b", color: "#fff" }}
                onClick={handleJoin} disabled={joining || selected.registration_open === false}>
                {selected.registration_open === false ? "Реєстрація закрита" : joining ? "Приєднання…" : "Приєднатися"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NavBar>
  );
};

export { PublicTournaments };
