import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

function GererArchivesJuridiques() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retraitForm, setRetraitForm] = useState(getInitialRetraitForm());

  useEffect(() => {
    const timeout = setTimeout(fetchArchives, 250);
    return () => clearTimeout(timeout);
  }, [motCle]);

  const fetchArchives = async () => {
    try {
      const url = motCle.trim()
        ? `/api/acteursjudiciaires/archives?motCle=${encodeURIComponent(motCle.trim())}`
        : "/api/acteursjudiciaires/archives";
      const response = await axios.get(url);
      setItems(response.data);
      setError("");

      if (selectedItem) {
        const refreshed = response.data.find((item) => item.id === selectedItem.id);
        setSelectedItem(refreshed || null);
      }
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_chargement_archives_judiciaires")));
    }
  };

  const handleRetraitChange = (event) => {
    const { name, value } = event.target;
    setRetraitForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setRetraitForm(getInitialRetraitForm());
    setError("");
    setSuccess("");
  };

  const handleSaveRetrait = async (event) => {
    event.preventDefault();
    if (!selectedItem) return;

    if (!retraitForm.motifDeRetrait.trim()) {
      setError(t("erreur_motif_retrait_requis"));
      return;
    }

    try {
      const response = await axios.post(`/api/acteursjudiciaires/${selectedItem.id}/retraits`, {
        dateDeRetrait: retraitForm.dateDeRetrait
          ? new Date(retraitForm.dateDeRetrait).toISOString()
          : new Date().toISOString(),
        motifDeRetrait: retraitForm.motifDeRetrait.trim(),
        effectuePar: retraitForm.effectuePar.trim(),
        notes: retraitForm.notes.trim(),
      });

      setSelectedItem(response.data);
      setRetraitForm(getInitialRetraitForm());
      setSuccess(t("retrait_enregistre"));
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_retrait")));
    }
  };

  const handleSaveRetour = async (retraitId) => {
    if (!selectedItem) return;

    try {
      const response = await axios.put(`/api/acteursjudiciaires/retraits/${retraitId}/retour`, {
        dateDeRetour: new Date().toISOString(),
        notes: retraitForm.notes.trim(),
      });

      setSelectedItem(response.data);
      setSuccess(t("retour_enregistre"));
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_retour")));
    }
  };

  return (
    <div className="page-container" dir="rtl">
      <h1 className="page-title">{t("gestion_archives_judiciaires")}</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="registry-panel">
        <div className="registry-panel-header">
          <h3>{t("archives")}</h3>
        </div>

        <div className="filters">
          <input
            value={motCle}
            onChange={(event) => setMotCle(event.target.value)}
            placeholder={t("rechercher_archives_judiciaires")}
          />
          <button type="button" className="btn-secondary" onClick={() => setMotCle("")}>
            {t("reinitialiser")}
          </button>
        </div>

        <div className="data-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>{t("numero_dossier_appel")}</th>
                <th>{t("date")}</th>
                <th>{t("tribunal_source")}</th>
                <th>{t("objet")}</th>
                <th>{t("emplacement")}</th>
                <th>{t("retraits")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center" }}>{t("aucune_archive_judiciaire")}</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.numeroDossier || "-"}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.tribunalSource || "-"}</td>
                    <td>{item.sujet || "-"}</td>
                    <td>{item.emplacement || "-"}</td>
                    <td>{item.retraitsCount ?? 0}</td>
                    <td className="action-icons">
                      <button type="button" onClick={() => selectItem(item)}>
                        {t("gerer_retrait")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <div className="form-card archive-service-panel">
          <div className="registry-panel-header">
            <div>
              <h3>{t("gestion_retrait_retour")}</h3>
              <p>{selectedItem.numeroDossier || "-"} - {selectedItem.sujet || "-"}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setSelectedItem(null)}>
              {t("fermer")}
            </button>
          </div>

          <form onSubmit={handleSaveRetrait}>
            <div className="form-grid">
              <div className="form-field">
                <label>{t("date_retrait")}</label>
                <input
                  type="date"
                  name="dateDeRetrait"
                  value={retraitForm.dateDeRetrait}
                  onChange={handleRetraitChange}
                />
              </div>

              <div className="form-field">
                <label>{t("motif_retrait")} *</label>
                <input
                  name="motifDeRetrait"
                  value={retraitForm.motifDeRetrait}
                  onChange={handleRetraitChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>{t("effectue_par")}</label>
                <input
                  name="effectuePar"
                  value={retraitForm.effectuePar}
                  onChange={handleRetraitChange}
                />
              </div>

              <div className="form-field full-width">
                <label>{t("note")}</label>
                <textarea
                  name="notes"
                  value={retraitForm.notes}
                  onChange={handleRetraitChange}
                  rows="2"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">{t("enregistrer_retrait")}</button>
            </div>
          </form>

          <div className="data-table-wrapper">
            <h3>{t("registre_retraits")}</h3>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>{t("date_retrait")}</th>
                  <th>{t("motif")}</th>
                  <th>{t("effectue_par")}</th>
                  <th>{t("date_retour")}</th>
                  <th>{t("note")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {(selectedItem.retraits || []).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center" }}>{t("aucun_retrait")}</td></tr>
                ) : (
                  selectedItem.retraits.map((retrait) => (
                    <tr key={retrait.id}>
                      <td>{formatDate(retrait.dateDeRetrait)}</td>
                      <td>{retrait.motifDeRetrait || "-"}</td>
                      <td>{retrait.effectuePar || "-"}</td>
                      <td>{retrait.dateDeRetour ? formatDate(retrait.dateDeRetour) : "-"}</td>
                      <td>{retrait.notes || "-"}</td>
                      <td>
                        {!retrait.dateDeRetour ? (
                          <button type="button" onClick={() => handleSaveRetour(retrait.id)}>
                            {t("enregistrer_retour")}
                          </button>
                        ) : (
                          t("retour_effectue")
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getInitialRetraitForm() {
  return {
    dateDeRetrait: new Date().toISOString().slice(0, 10),
    motifDeRetrait: "",
    effectuePar: "",
    notes: "",
  };
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === "string") return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return fallback;
}

export default GererArchivesJuridiques;
