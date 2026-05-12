import { useState, useEffect } from "react";
import api from "../api";

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    api.get(`/tournaments/${cert.tournament_id}/certificates/${cert.id}/download/`)
      .then(({ data }) => setCertificates(data))
      .catch(() => setError("Не вдалося завантажити сертифікати"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload(cert) {
    try {
      const resp = await api.get(
        `/tournaments/${cert.template}/certificates/${cert.id}/download/`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate_${cert.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Помилка завантаження PDF");
    }
  }

  if (loading) return <p className="page-loading">Завантаження…</p>;
  if (error)   return <p className="page-error">{error}</p>;

  return (
    <div className="my-certificates">
      <h2 className="page-title">Мої сертифікати</h2>
      {certificates.length === 0 ? (
        <p className="text-muted">У вас ще немає сертифікатів.</p>
      ) : (
        <div className="cert-cards">
          {certificates.map((c) => (
            <div key={c.id} className="cert-card">
              <div className="cert-card__type">
                <span className="type-badge">{c.cert_type_display}</span>
              </div>
              <p className="cert-card__date">
                Видано: {new Date(c.issued_at).toLocaleDateString("uk-UA")}
              </p>
              {c.pdf_file ? (
                <button
                  className="btn btn--primary btn--small"
                  onClick={() => handleDownload(c)}
                >
                  Завантажити PDF
                </button>
              ) : (
                <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                  PDF генерується…
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}