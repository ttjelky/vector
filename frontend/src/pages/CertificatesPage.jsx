import { useState, useEffect, useRef } from "react";
import api from "@api";
import "@shared/styles/CertificatesPage.css";

const CERT_TYPES = [
  { value: "winner",      label: "Переможець (1 місце)" },
  { value: "top3",        label: "Призери (2–3 місце)" },
  { value: "participant", label: "Учасник" },
  { value: "jury",        label: "Журі" },
];

const STOCK_PREVIEWS = {
  classic: {
    label: "Класичний",
    description: "Мінімалістичний чорно-білий стиль з подвійною рамкою",
    svg: (
      <svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", borderRadius: 6 }}>
        <rect width="400" height="280" fill="#fff"/>
        <rect x="10" y="10" width="380" height="260" fill="none" stroke="#111" strokeWidth="4"/>
        <rect x="20" y="20" width="360" height="240" fill="none" stroke="#111" strokeWidth="1"/>
        <text x="200" y="68" textAnchor="middle" fontFamily="serif" fontSize="26" fontWeight="bold" fill="#111">СЕРТИФІКАТ</text>
        <line x1="60" y1="85" x2="340" y2="85" stroke="#ccc" strokeWidth="1"/>
        <text x="200" y="128" textAnchor="middle" fontFamily="serif" fontSize="18" fontWeight="bold" fill="#111">Іваненко Іван</text>
        <text x="200" y="163" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#555">За участь у турнірі «Приклад»</text>
        <line x1="60" y1="182" x2="340" y2="182" stroke="#ccc" strokeWidth="1"/>
        <text x="200" y="242" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#999">01.01.2026</text>
      </svg>
    ),
  },
  elegant: {
    label: "Елегантний",
    description: "Темний фон з золотистими акцентами",
    svg: (
      <svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", borderRadius: 6 }}>
        <rect width="400" height="280" fill="#1a1a2e"/>
        <rect x="12" y="12" width="376" height="256" fill="none" stroke="#c9a84c" strokeWidth="3"/>
        <rect x="20" y="20" width="360" height="240" fill="none" stroke="#c9a84c" strokeWidth="1"/>
        <text x="200" y="70" textAnchor="middle" fontFamily="serif" fontSize="26" fontWeight="bold" fill="#c9a84c">СЕРТИФІКАТ</text>
        <line x1="80" y1="90" x2="320" y2="90" stroke="#c9a84c" strokeWidth="1"/>
        <text x="200" y="135" textAnchor="middle" fontFamily="serif" fontSize="19" fontWeight="bold" fill="#fff">Іваненко Іван</text>
        <text x="200" y="168" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#c9a84c">«Приклад»</text>
        <text x="200" y="245" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#888">01.01.2026</text>
      </svg>
    ),
  },
  modern: {
    label: "Сучасний",
    description: "Геометричний дизайн у сірих тонах",
    svg: (
      <svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", borderRadius: 6 }}>
        <rect width="400" height="280" fill="#f5f5f5"/>
        <rect x="0" y="0" width="8" height="280" fill="#222"/>
        <rect x="12" y="0" width="4" height="280" fill="#aaa"/>
        <rect x="22" y="16" width="360" height="68" fill="#222"/>
        <text x="202" y="63" textAnchor="middle" fontFamily="sans-serif" fontSize="24" fontWeight="bold" fill="#fff">СЕРТИФІКАТ</text>
        <text x="202" y="108" textAnchor="middle" fontFamily="sans-serif" fontSize="13" fill="#444">За участь</text>
        <line x1="50" y1="125" x2="370" y2="125" stroke="#ccc" strokeWidth="1"/>
        <text x="202" y="162" textAnchor="middle" fontFamily="sans-serif" fontSize="17" fontWeight="bold" fill="#111">Іваненко Іван</text>
        <text x="202" y="192" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#333">«Приклад»</text>
        <line x1="50" y1="210" x2="370" y2="210" stroke="#ccc" strokeWidth="1"/>
        <text x="202" y="236" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#999">01.01.2026</text>
        <rect x="22" y="256" width="360" height="16" fill="#eee"/>
      </svg>
    ),
  },
};

// myRole: "owner" | "admin" | "participant" | "jury" | null
export default function CertificatesPage({ tournamentId, isAdmin, isTeamTournament, myRole }) {
  // Власник турніру або адміністратор бачать повний інтерфейс генерації
  if (isAdmin || myRole === "owner") {
    return (
      <AdminCertificates
        tournamentId={tournamentId}
        isAdmin={isAdmin}
        isTeamTournament={isTeamTournament}
      />
    );
  }

  // Всі інші (учасники, журі, капітани тощо) бачать тільки власні сертифікати
  return <ParticipantCertificates tournamentId={tournamentId} />;
}

/* ── Вигляд учасника — тільки його сертифікати ─────────────────────────────── */
function ParticipantCertificates({ tournamentId }) {
  const [certificates, setCertificates] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [message,      setMessage]      = useState(null);

  useEffect(() => {
    api.get(`/tournaments/${tournamentId}/certificates/`)
      .then(({ data }) => setCertificates(data))
      .catch(() => setMessage({ type: "error", text: "Не вдалося завантажити сертифікати" }))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  async function handleDownload(certId, recipientName) {
    try {
      const resp = await api.get(
        `/tournaments/${tournamentId}/certificates/${certId}/download/`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate_${recipientName.replace(/ /g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: "error", text: "Не вдалося завантажити PDF" });
    }
  }

  if (loading) return <p className="page-loading">Завантаження…</p>;

  return (
    <div className="certificates-page">
      <h2 className="page-title">Мої сертифікати</h2>

      {message && <div className={`alert alert--${message.type}`}>{message.text}</div>}

      {certificates.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">🎖</span>
          <p className="empty-state__text">У вас ще немає сертифікатів у цьому турнірі.</p>
        </div>
      ) : (
        <div className="cert-cards">
          {certificates.map(c => (
            <div key={c.id} className="cert-card">
              <div className="cert-card__icon">
                {c.cert_type === "winner" ? "🥇" : c.cert_type === "top3" ? "🥈" : "🎖"}
              </div>
              <div className="cert-card__type">
                <span className="type-badge">{c.cert_type_display}</span>
              </div>
              <p className="cert-card__date">
                {new Date(c.issued_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              {c.pdf_file ? (
                <button className="btn btn--primary btn--small" onClick={() => handleDownload(c.id, c.recipient_name)}>
                  Завантажити PDF
                </button>
              ) : (
                <span className="text-muted">PDF генерується…</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Вигляд адміна/власника — повний функціонал ────────────────────────────── */
function AdminCertificates({ tournamentId, isAdmin, isTeamTournament }) {
  const [templates,    setTemplates]    = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [teams,        setTeams]        = useState([]);
  const [activeTab,    setActiveTab]    = useState("templates");
  const [loading,      setLoading]      = useState(false);
  const [generating,   setGenerating]   = useState(null);
  const [message,      setMessage]      = useState(null);

  const tid = tournamentId;

  useEffect(() => {
    fetchTemplates();
    if (isAdmin) {
      fetchCertificates();
      if (isTeamTournament) {
        fetchTeams();
        fetchParticipants("jury"); // журі завжди завантажуємо окремо
      } else {
        fetchParticipants();
      }
    }
  }, [tid, isAdmin, isTeamTournament]);

  async function fetchTemplates() {
    try {
      const { data } = await api.get(`/tournaments/${tid}/certificates/templates/`);
      setTemplates(data);
    } catch {
      notify("error", "Не вдалося завантажити шаблони");
    }
  }

  async function fetchCertificates() {
    try {
      const { data } = await api.get(`/tournaments/${tid}/certificates/`);
      setCertificates(data);
    } catch {
      notify("error", "Не вдалося завантажити список сертифікатів");
    }
  }

  async function fetchParticipants(role = "participant") {
    try {
      const { data } = await api.get(`/tournaments/${tid}/members/`);
      setParticipants(data.filter(m => m.user_role === role));
    } catch {}
  }

  async function fetchTeams() {
    try {
      const { data } = await api.get(`/tournaments/${tid}/teams/`);
      setTeams(data.filter(t => t.status === "registered"));
    } catch {}
  }

  function notify(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleUploadTemplate(certType, file, settings) {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("cert_type", certType);
      form.append("template_image", file);
      Object.entries(settings).forEach(([k, v]) => form.append(k, v));
      await api.post(`/tournaments/${tid}/certificates/templates/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      notify("success", "Шаблон збережено");
      fetchTemplates();
    } catch (e) {
      notify("error", e.response?.data?.detail || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }

  async function handleStockGenerate({ certType, stockKey, userIds, teamIds }) {
    const key = `${certType}-${stockKey}`;
    setGenerating(key);
    try {
      const body = { cert_type: certType, stock_key: stockKey };
      // Для командного турніру з типом "jury" — відправляємо user_ids (не team_ids)
      if (isTeamTournament && certType !== "jury") body.team_ids = teamIds ?? [];
      else body.user_ids = userIds ?? [];
      const { data } = await api.post(`/tournaments/${tid}/certificates/stock-generate/`, body);
      notify("success", `Згенеровано ${data.generated} сертифікат(ів)${data.errors?.length ? `, помилок: ${data.errors.length}` : ""}`);
      fetchCertificates();
    } catch (e) {
      notify("error", e.response?.data?.detail || "Помилка генерації");
    } finally {
      setGenerating(null);
    }
  }

  async function handleDownload(certId, recipientName) {
    try {
      const resp = await api.get(`/tournaments/${tid}/certificates/${certId}/download/`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate_${recipientName.replace(/ /g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notify("error", "Не вдалося завантажити PDF");
    }
  }

  async function handleDeleteTemplate(tmplId) {
    if (!window.confirm("Видалити шаблон?")) return;
    try {
      await api.delete(`/tournaments/${tid}/certificates/templates/${tmplId}/`);
      notify("success", "Шаблон видалено");
      fetchTemplates();
    } catch {
      notify("error", "Не вдалося видалити шаблон");
    }
  }

  return (
    <div className="certificates-page">
      <h2 className="page-title">Сертифікати</h2>

      {message && <div className={`alert alert--${message.type}`}>{message.text}</div>}

      <div className="tabs">
        <button className={`tab ${activeTab === "templates" ? "tab--active" : ""}`} onClick={() => setActiveTab("templates")}>
          Власні шаблони
        </button>
        <button className={`tab ${activeTab === "stock" ? "tab--active" : ""}`} onClick={() => setActiveTab("stock")}>
          Стокові шаблони
        </button>
        {isAdmin && (
          <button className={`tab ${activeTab === "issued" ? "tab--active" : ""}`} onClick={() => setActiveTab("issued")}>
            Видані сертифікати
            {certificates.length > 0 && <span className="badge">{certificates.length}</span>}
          </button>
        )}
      </div>

      {activeTab === "templates" && (
        <div className="templates-grid">
          {CERT_TYPES.map(ct => {
            const tmpl = templates.find(t => t.cert_type === ct.value);
            return (
              <TemplateCard key={ct.value} certType={ct} template={tmpl}
                isAdmin={isAdmin} loading={loading}
                onUpload={handleUploadTemplate} onDelete={handleDeleteTemplate} />
            );
          })}
        </div>
      )}

      {activeTab === "stock" && (
        <StockTab
          isAdmin={isAdmin}
          isTeamTournament={isTeamTournament}
          participants={participants}
          teams={teams}
          generating={generating}
          onGenerate={handleStockGenerate}
          onFetchParticipants={fetchParticipants}
        />
      )}

      {activeTab === "issued" && isAdmin && (
        <CertificateTable certificates={certificates} onDownload={handleDownload} isTeamTournament={isTeamTournament} />
      )}
    </div>
  );
}

/* ── StockTab ──────────────────────────────────────────────────────────────── */
function StockTab({ isAdmin, isTeamTournament, participants, teams, generating, onGenerate, onFetchParticipants }) {
  const [certType,      setCertType]      = useState("participant");
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectedTeams, setSelectedTeams] = useState(new Set());
  const [selectMode,    setSelectMode]    = useState("all");

  // При зміні типу — перезавантажуємо список (учасники або журі)
  useEffect(() => {
    if (onFetchParticipants) {
      // Для командного турніру: при типі jury завантажуємо журі,
      // для інших типів — для командного список команд вже є, журі не потрібні
      if (isTeamTournament) {
        if (certType === "jury") onFetchParticipants("jury");
      } else {
        onFetchParticipants(certType === "jury" ? "jury" : "participant");
      }
    }
    // Скидаємо вибір при зміні типу
    setSelectedUsers(new Set());
    setSelectedTeams(new Set());
  }, [certType]); // eslint-disable-line

  const isGenerating = !!generating;
  const genKey = selectedStyle ? `${certType}-${selectedStyle}` : null;

  function toggleUser(id) {
    setSelectedUsers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleTeam(id) {
    setSelectedTeams(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAllUsers() {
    setSelectedUsers(prev => prev.size === participants.length ? new Set() : new Set(participants.map(p => p.user)));
  }
  function toggleAllTeams() {
    setSelectedTeams(prev => prev.size === teams.length ? new Set() : new Set(teams.map(t => t.id)));
  }

  function handleGenerate() {
    if (!selectedStyle) return;
    const isJuryInTeam = isTeamTournament && certType === "jury";
    onGenerate({
      certType,
      stockKey: selectedStyle,
      userIds: (!isTeamTournament || isJuryInTeam) && selectMode !== "all" ? [...selectedUsers] : [],
      teamIds: isTeamTournament && !isJuryInTeam && selectMode !== "all" ? [...selectedTeams] : [],
    });
  }

  const canGenerate = isAdmin && selectedStyle && (
    selectMode === "all" ||
    (isTeamTournament && certType !== "jury" ? selectedTeams.size > 0 : selectedUsers.size > 0)
  );

  return (
    <div>
      {/* Тип */}
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: "0.5rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Тип сертифіката
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {CERT_TYPES.map(ct => (
            <button key={ct.value}
              className={`btn ${certType === ct.value ? "btn--primary" : "btn--secondary"}`}
              onClick={() => setCertType(ct.value)}>
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Стиль */}
      <p style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Стиль сертифіката
      </p>
      <div className="templates-grid" style={{ marginBottom: "1.5rem" }}>
        {Object.entries(STOCK_PREVIEWS).map(([key, tmpl]) => (
          <div key={key} className="template-card"
            style={{ cursor: "pointer", outline: selectedStyle === key ? "2px solid #111" : "none", outlineOffset: 2 }}
            onClick={() => setSelectedStyle(key)}>
            <div className="template-card__header">
              <h3>{tmpl.label}</h3>
              {selectedStyle === key && (
                <span style={{ fontSize: "0.72rem", background: "#111", color: "#fff", padding: "2px 8px", borderRadius: 999 }}>✓ Обрано</span>
              )}
            </div>
            <div className="template-card__preview" style={{ padding: "0.5rem" }}>{tmpl.svg}</div>
            <p style={{ fontSize: "0.82rem", color: "#888", margin: 0 }}>{tmpl.description}</p>
          </div>
        ))}
      </div>

      {/* Отримувачі */}
      {isAdmin && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {isTeamTournament && certType !== "jury" ? "Команди" : certType === "jury" ? "Журі" : "Учасники"}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <button className={`btn ${selectMode === "all" ? "btn--primary" : "btn--secondary"}`}
              onClick={() => setSelectMode("all")}>
              {isTeamTournament && certType !== "jury" ? "Всі команди" : certType === "jury" ? "Все журі" : "Всі учасники"}
            </button>
            <button className={`btn ${selectMode === "select" ? "btn--primary" : "btn--secondary"}`}
              onClick={() => setSelectMode("select")}>
              Обрати вручну
            </button>
          </div>

          {selectMode === "select" && (
            <div style={{ border: "1px solid #e8e8e8", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem", background: "#f7f7f7", borderBottom: "1px solid #eee" }}>
                <input type="checkbox"
                  checked={
                    (isTeamTournament && certType !== "jury")
                      ? selectedTeams.size === teams.length && teams.length > 0
                      : selectedUsers.size === participants.length && participants.length > 0
                  }
                  onChange={
                    (isTeamTournament && certType !== "jury") ? toggleAllTeams : toggleAllUsers
                  }
                  style={{ cursor: "pointer" }} />
                <span style={{ fontSize: "0.8rem", color: "#555", fontWeight: 500 }}>
                  Обрати всіх ({
                    (isTeamTournament && certType !== "jury")
                      ? `${selectedTeams.size} / ${teams.length}`
                      : `${selectedUsers.size} / ${participants.length}`
                  })
                </span>
                {isTeamTournament && certType !== "jury" && selectedTeams.size > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#888" }}>
                    ~{teams.filter(t => selectedTeams.has(t.id)).reduce((acc, t) => acc + 1 + (t.members?.filter(m => m.status === "accepted").length ?? 0), 0)} сертифікатів
                  </span>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {(isTeamTournament && certType !== "jury") ? (
                  teams.length === 0
                    ? <div style={{ padding: "1.5rem", textAlign: "center", color: "#bbb", fontSize: "0.875rem" }}>Зареєстрованих команд немає</div>
                    : teams.map(team => {
                      const memberCount = 1 + (team.members?.filter(m => m.status === "accepted").length ?? 0);
                      const memberNames = [
                        team.captain_name,
                        ...(team.members?.filter(m => m.status === "accepted" && m.id !== team.captain_id).map(m => m.full_name) ?? [])
                      ].filter(Boolean);
                      return (
                        <div key={team.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem", cursor: "pointer" }}>
                            <input type="checkbox" checked={selectedTeams.has(team.id)} onChange={() => toggleTeam(team.id)} style={{ cursor: "pointer" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111" }}>{team.name}</div>
                              <div style={{ fontSize: "0.78rem", color: "#888", marginTop: 2 }}>
                                {memberNames.join(" · ")}
                              </div>
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "#bbb", whiteSpace: "nowrap" }}>
                              👥 {memberCount} серт.
                            </span>
                          </label>
                        </div>
                      );
                    })
                ) : (
                  participants.length === 0
                    ? <div style={{ padding: "1.5rem", textAlign: "center", color: "#bbb", fontSize: "0.875rem" }}>
                        {certType === "jury" ? "Журі немає" : "Учасників немає"}
                      </div>
                    : participants.map(p => {
                      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username || p.email;
                      return (
                        <label key={p.user} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem", borderBottom: "1px solid #f3f3f3", cursor: "pointer" }}>
                          <input type="checkbox" checked={selectedUsers.has(p.user)} onChange={() => toggleUser(p.user)} style={{ cursor: "pointer" }} />
                          <div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#111" }}>{name}</div>
                            {p.email && <div style={{ fontSize: "0.78rem", color: "#888" }}>{p.email}</div>}
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Кнопка */}
      {isAdmin && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button className="btn btn--primary"
            disabled={!canGenerate || isGenerating}
            onClick={handleGenerate}>
            {generating === genKey
              ? "Генерація…"
              : selectedStyle
                ? `Генерувати «${STOCK_PREVIEWS[selectedStyle]?.label}»`
                : "Спочатку оберіть стиль"}
          </button>
          {selectedStyle && (
            <span style={{ fontSize: "0.82rem", color: "#aaa" }}>
              {selectMode === "all"
                ? (isTeamTournament && certType !== "jury") ? `Всі команди (${teams.length})` : certType === "jury" ? `Все журі (${participants.length})` : `Всі учасники (${participants.length})`
                : (isTeamTournament && certType !== "jury") ? `Обрано команд: ${selectedTeams.size}` : `Обрано: ${selectedUsers.size}`}
              {" · "}{CERT_TYPES.find(c => c.value === certType)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── TemplateCard ──────────────────────────────────────────────────────────── */
function TemplateCard({ certType, template, isAdmin, loading, onUpload, onDelete }) {
  const fileRef = useRef();
  const [pendingFile,  setPendingFile]  = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    name_x_percent: 50, name_y_percent: 52, name_font_size: 72, name_font_color: "#1a1a1a",
    tournament_name_x_percent: 50, tournament_name_y_percent: 65, tournament_font_size: 36, tournament_font_color: "#444444",
    date_x_percent: 50, date_y_percent: 75, date_font_size: 28, date_font_color: "#666666",
  });

  useEffect(() => { if (template) setSettings(prev => ({ ...prev, ...template })); }, [template]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) { setPendingFile(file); setShowSettings(true); }
  }

  async function handleSave() {
    if (!pendingFile && !template) return;
    await onUpload(certType.value, pendingFile, settings);
    setPendingFile(null); setShowSettings(false);
  }

  function setSetting(key, val) { setSettings(prev => ({ ...prev, [key]: val })); }

  return (
    <div className="template-card">
      <div className="template-card__header">
        <h3>{certType.label}</h3>
        {template && isAdmin && (
          <button className="btn-icon" onClick={() => onDelete(template.id)} title="Видалити">✕</button>
        )}
      </div>
      <div className="template-card__preview">
        {(pendingFile || template?.template_image) ? (
          <img src={pendingFile ? URL.createObjectURL(pendingFile) : template.template_image} alt="Макет" className="template-card__img" />
        ) : (
          <div className="template-card__empty">
            <span className="template-card__empty-icon">🖼</span>
            <span>Макет не завантажено</span>
          </div>
        )}
      </div>
      {isAdmin && (
        <div className="template-card__actions">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={handleFileChange} />
          <button className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
            {template ? "Замінити макет" : "Завантажити макет"}
          </button>
          {template && (
            <button className="btn btn--secondary" onClick={() => setShowSettings(s => !s)}>
              {showSettings ? "Сховати" : "Позиції тексту"}
            </button>
          )}
          {(pendingFile || showSettings) && (
            <button className="btn btn--primary" onClick={handleSave} disabled={loading}>
              {loading ? "Збереження…" : "Зберегти"}
            </button>
          )}
        </div>
      )}
      {showSettings && (
        <div className="settings-panel">
          <p className="settings-panel__title">Позиції тексту</p>
          <SettingsGroup label="Ім'я отримувача">
            <NumberInput label="X, %" val={settings.name_x_percent} onChange={v => setSetting("name_x_percent", v)} />
            <NumberInput label="Y, %" val={settings.name_y_percent} onChange={v => setSetting("name_y_percent", v)} />
            <NumberInput label="Розмір" val={settings.name_font_size} onChange={v => setSetting("name_font_size", v)} />
            <ColorInput label="Колір" val={settings.name_font_color} onChange={v => setSetting("name_font_color", v)} />
          </SettingsGroup>
          <SettingsGroup label="Назва турніру">
            <NumberInput label="X, %" val={settings.tournament_name_x_percent} onChange={v => setSetting("tournament_name_x_percent", v)} />
            <NumberInput label="Y, %" val={settings.tournament_name_y_percent} onChange={v => setSetting("tournament_name_y_percent", v)} />
            <NumberInput label="Розмір" val={settings.tournament_font_size} onChange={v => setSetting("tournament_font_size", v)} />
            <ColorInput label="Колір" val={settings.tournament_font_color} onChange={v => setSetting("tournament_font_color", v)} />
          </SettingsGroup>
          <SettingsGroup label="Дата">
            <NumberInput label="X, %" val={settings.date_x_percent} onChange={v => setSetting("date_x_percent", v)} />
            <NumberInput label="Y, %" val={settings.date_y_percent} onChange={v => setSetting("date_y_percent", v)} />
            <NumberInput label="Розмір" val={settings.date_font_size} onChange={v => setSetting("date_font_size", v)} />
            <ColorInput label="Колір" val={settings.date_font_color} onChange={v => setSetting("date_font_color", v)} />
          </SettingsGroup>
        </div>
      )}
    </div>
  );
}

/* ── CertificateTable ──────────────────────────────────────────────────────── */
function CertificateTable({ certificates, onDownload, isTeamTournament }) {
  const [search, setSearch] = useState("");
  const filtered = certificates.filter(c =>
    c.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
    c.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
    (c.team_name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Групуємо по командах якщо командний турнір
  const grouped = isTeamTournament
    ? filtered.reduce((acc, c) => {
        const key = c.team_name || "—";
        if (!acc[key]) acc[key] = [];
        acc[key].push(c);
        return acc;
      }, {})
    : null;

  return (
    <div className="cert-table-wrap">
      <input className="search-input" type="text"
        placeholder={isTeamTournament ? "Пошук за ім'ям, email або командою…" : "Пошук за ім'ям або email…"}
        value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.length === 0 && search === "" ? (
        <div className="empty-state">
          <span className="empty-state__icon">📄</span>
          <p className="empty-state__text">Сертифікатів ще немає.</p>
        </div>
      ) : isTeamTournament ? (
        // ── Командний вигляд: згруповано по командах ──
        Object.entries(grouped).length === 0
          ? <p style={{ color: "#bbb", fontSize: "0.875rem" }}>Нічого не знайдено</p>
          : Object.entries(grouped).map(([teamName, certs]) => (
            <div key={teamName} style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>👥</span>
                <span>{teamName}</span>
                <span style={{ fontWeight: 400, color: "#ccc" }}>({certs.length})</span>
              </div>
              <table className="cert-table">
                <thead>
                  <tr><th>Учасник</th><th>Email</th><th>Тип</th><th>Дата</th><th>PDF</th></tr>
                </thead>
                <tbody>
                  {certs.map(c => (
                    <tr key={c.id}>
                      <td>{c.recipient_name}</td>
                      <td style={{ color: "#888" }}>{c.recipient_email}</td>
                      <td><span className="type-badge">{c.cert_type_display}</span></td>
                      <td style={{ color: "#888" }}>{new Date(c.issued_at).toLocaleDateString("uk-UA")}</td>
                      <td>
                        {c.pdf_file
                          ? <button className="btn btn--small btn--primary" onClick={() => onDownload(c.id, c.recipient_name)}>Завантажити</button>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
      ) : (
        // ── Звичайний вигляд ──
        <table className="cert-table">
          <thead>
            <tr><th>Отримувач</th><th>Email</th><th>Тип</th><th>Дата</th><th>PDF</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} className="cert-table__empty">Нічого не знайдено</td></tr>
              : filtered.map(c => (
                <tr key={c.id}>
                  <td>{c.recipient_name}</td>
                  <td style={{ color: "#888" }}>{c.recipient_email}</td>
                  <td><span className="type-badge">{c.cert_type_display}</span></td>
                  <td style={{ color: "#888" }}>{new Date(c.issued_at).toLocaleDateString("uk-UA")}</td>
                  <td>
                    {c.pdf_file
                      ? <button className="btn btn--small btn--primary" onClick={() => onDownload(c.id, c.recipient_name)}>Завантажити</button>
                      : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function SettingsGroup({ label, children }) {
  return (
    <div className="settings-group">
      <p className="settings-group__label">{label}</p>
      <div className="settings-group__fields">{children}</div>
    </div>
  );
}
function NumberInput({ label, val, onChange }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <input type="number" value={val} onChange={e => onChange(Number(e.target.value))} className="field-input" />
    </label>
  );
}
function ColorInput({ label, val, onChange }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <input type="color" value={val} onChange={e => onChange(e.target.value)} className="field-color" />
    </label>
  );
}