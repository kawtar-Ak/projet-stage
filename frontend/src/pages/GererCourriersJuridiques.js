import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

const LEGACY_API_URL = process.env.REACT_APP_LEGACY_API_URL || "http://localhost:5127";

function GererCourriersJuridiques({ embedded = false }) {
  const { t } = useTranslation();
  const [courriers, setCourriers] = useState([]);
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(getInitialForm());
  const [selectedArchiveItem, setSelectedArchiveItem] = useState(null);
  const [retraitForm, setRetraitForm] = useState(getInitialRetraitForm());

  useEffect(() => {
    fetchCourriers();
    fetchServices();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchCourriers, 250);
    return () => clearTimeout(timeout);
  }, [motCle]);

  const fetchCourriers = async () => {
    try {
      const url = motCle.trim()
        ? `/api/acteursjudiciaires/search?motCle=${encodeURIComponent(motCle.trim())}`
        : "/api/acteursjudiciaires";
      const response = await axios.get(url);
      setCourriers(response.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_chargement_courriers_judiciaires")));
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get("/api/services");
      setServices(response.data);
      if (response.data.length > 0) {
        setForm((prev) => ({
          ...prev,
          idService: prev.idService || response.data[0].idService,
        }));
      }
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_chargement_services")));
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "idService" ? Number(value) : value,
    }));
  };

  const handleRetraitChange = (event) => {
    const { name, value } = event.target;
    setRetraitForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("/api/acteursjudiciaires/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, lienPdf: response.data.lienPdf || "" }));
      setSuccess(t("document_upload_success"));
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_upload_document")));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      idBureauOrdre: form.idBureauOrdre.trim(),
      date: new Date(form.date).toISOString(),
      tribunalSource: form.tribunalSource.trim(),
      sujet: form.sujet.trim(),
      direction: form.direction,
      destinataire: form.destinataire.trim(),
      description: form.description.trim(),
      etatArchive: form.etatArchive,
      emplacement: form.emplacement.trim(),
      lienPdf: form.lienPdf.trim(),
      idService: Number(form.idService),
      numeroDossier: form.numeroDossier.trim(),
      estTransmissible: Boolean(form.estTransmissible),
    };

    try {
      if (editingId) {
        await axios.put(`/api/acteursjudiciaires/${editingId}`, payload);
        setSuccess(t("courrier_judiciaire_modifie"));
      } else {
        await axios.post("/api/acteursjudiciaires", payload);
        setSuccess(t("courrier_judiciaire_ajoute"));
      }

      resetForm();
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_courrier_judiciaire")));
    }
  };

  const handleEdit = (courrier) => {
    setEditingId(courrier.id);
    setForm({
      idBureauOrdre: courrier.idBureauOrdre || "",
      date: courrier.date ? courrier.date.slice(0, 10) : "",
      tribunalSource: courrier.tribunalSource || "",
      numeroDossier: courrier.numeroDossier || "",
      sujet: courrier.sujet || "",
      direction: courrier.direction || "Entrant",
      destinataire: courrier.destinataire || "",
      description: courrier.description || "",
      etatArchive: courrier.etatArchive || "Nouveau",
      emplacement: courrier.emplacement || "",
      lienPdf: courrier.lienPdf || "",
      idService: courrier.idService || getDefaultServiceId(services),
      estTransmissible: Boolean(courrier.estTransmissible),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("confirmation_supprimer_courrier_judiciaire"))) return;

    try {
      await axios.delete(`/api/acteursjudiciaires/${id}`);
      setSuccess(t("courrier_judiciaire_supprime"));
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_supprimer_courrier_judiciaire")));
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm(t("confirmation_archiver_courrier_judiciaire"))) return;

    try {
      await axios.put(`/api/acteursjudiciaires/archiver/${id}`);
      setSuccess(t("courrier_judiciaire_archive"));
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_archiver_courrier_judiciaire")));
    }
  };

  const openArchiveService = (courrier) => {
    setSelectedArchiveItem(courrier);
    setRetraitForm(getInitialRetraitForm());
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeArchiveService = () => {
    setSelectedArchiveItem(null);
    setRetraitForm(getInitialRetraitForm());
  };

  const handleSaveRetrait = async (event) => {
    event.preventDefault();
    if (!selectedArchiveItem) return;

    if (!retraitForm.motifDeRetrait.trim()) {
      setError(t("erreur_motif_retrait_requis"));
      return;
    }

    try {
      const payload = {
        dateDeRetrait: retraitForm.dateDeRetrait
          ? new Date(retraitForm.dateDeRetrait).toISOString()
          : new Date().toISOString(),
        motifDeRetrait: retraitForm.motifDeRetrait.trim(),
        effectuePar: retraitForm.effectuePar.trim(),
        notes: retraitForm.notes.trim(),
      };

      const response = await axios.post(`/api/acteursjudiciaires/${selectedArchiveItem.id}/retraits`, payload);
      setSelectedArchiveItem(response.data);
      setRetraitForm(getInitialRetraitForm());
      setSuccess(t("retrait_enregistre"));
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_retrait")));
    }
  };

  const handleSaveRetour = async (retraitId) => {
    try {
      const response = await axios.put(`/api/acteursjudiciaires/retraits/${retraitId}/retour`, {
        dateDeRetour: new Date().toISOString(),
        notes: retraitForm.notes.trim(),
      });
      setSelectedArchiveItem(response.data);
      setSuccess(t("retour_enregistre"));
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_retour")));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(getInitialForm(services));
    setError("");
  };

  const exportToExcel = async () => {
    try {
      const response = await axios.get("/api/acteursjudiciaires/export/excel", { responseType: "blob" });
      downloadBlob(response.data, "courriers-juridiques.xlsx");
    } catch (err) {
      setError(t("erreur_export"));
    }
    return;

    fetch(`/api/acteursjudiciaires/export/excel`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error(t("erreur_export"));
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "courriers-juridiques.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError(t("erreur_export")));
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("/api/acteursjudiciaires/import/excel", formData);
      const imported = response.data?.imported || 0;
      const errors = response.data?.errors || [];
      setSuccess(t("import_lignes_ajoutees", { count: imported }));
      if (errors.length > 0) setError(errors.join(" | "));
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_import")));
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className={embedded ? "courriers-juridiques-content" : "page-container"} dir="rtl">
      {!embedded && <h1 className="page-title">{t("gestion_courriers_judiciaires")}</h1>}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-card">
        <h3>{editingId ? t("modifier") : t("ajouter")} {t("courrier_judiciaire")}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>{t("numero_dossier_appel")} *</label>
              <input name="numeroDossier" value={form.numeroDossier} onChange={handleChange} placeholder="2026/15/3" required />
            </div>

            <div className="form-field">
              <label>{t("date")} *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>{t("tribunal_source")} *</label>
              <input name="tribunalSource" value={form.tribunalSource} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>{t("numero_bureau_ordre")}</label>
              <input name="idBureauOrdre" value={form.idBureauOrdre} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label>{t("objet")} *</label>
              <input name="sujet" value={form.sujet} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label>{t("destinataire")}</label>
              <input name="destinataire" value={form.destinataire} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label>{t("service")} *</label>
              <select name="idService" value={form.idService} onChange={handleChange} >
                <option value="">-- {t("selectionner_service")} --</option>
                {services.map((service) => (
                  <option key={service.idService} value={service.idService}>
                    {service.nomService}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>{t("etat")}</label>
              <select name="etatArchive" value={form.etatArchive} onChange={handleChange}>
                <option value="Nouveau">{t("etat_nouveau")}</option>
                <option value="En cours">{t("etat_en_cours")}</option>
                <option value="Traite">{t("etat_traite")}</option>
                <option value="Archive">{t("etat_archive")}</option>
              </select>
            </div>

            <div className="form-field">
              <label>{t("transmissible")}</label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="estTransmissible"
                  checked={form.estTransmissible}
                  onChange={handleChange}
                />
                {t("oui")}
              </label>
            </div>

            <div className="form-field">
              <label>{t("emplacement")}</label>
              <input name="emplacement" value={form.emplacement} onChange={handleChange} />
            </div>

            <div className="form-field full-width">
              <label>{t("document_pdf_word")}</label>
              <div className="document-control">
                <label className="document-upload-button">
                  {uploading ? t("upload_en_cours") : t("choisir_fichier")}
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleDocumentSelect} />
                </label>
                <div className={form.lienPdf ? "document-link-preview filled" : "document-link-preview"}>
                  <span title={form.lienPdf || ""}>{form.lienPdf ? getDocumentName(form.lienPdf) : t("aucun_fichier_selectionne")}</span>
                  {form.lienPdf && (
                    <a href={getDocumentHref(form.lienPdf)} target="_blank" rel="noreferrer">
                      {t("ouvrir")}
                    </a>
                  )}
                </div>
                <div className="document-link-input">
                  <input name="lienPdf" value={form.lienPdf} onChange={handleChange} placeholder="/uploads/documents/..." />
                  {form.lienPdf && (
                    <a href={getDocumentHref(form.lienPdf)} target="_blank" rel="noreferrer">
                      {t("ouvrir")}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="form-field full-width">
              <label>{t("note")}</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows="3" />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? t("modifier") : t("ajouter")}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>{t("annuler")}</button>}
          </div>
        </form>
      </div>

      {selectedArchiveItem && (
        <div className="form-card archive-service-panel">
          <div className="registry-panel-header">
            <div>
              <h3>{t("service_archive_retrait_retour")}</h3>
              <p>
                {selectedArchiveItem.numeroDossier || "-"} - {selectedArchiveItem.sujet || "-"}
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={closeArchiveService}>
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
                {(selectedArchiveItem.retraits || []).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center" }}>{t("aucun_retrait")}</td></tr>
                ) : (
                  selectedArchiveItem.retraits.map((retrait) => (
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

      <div className="registry-panel">
        <div className="registry-panel-header">
          <h3>{t("recherche_registre")}</h3>
          <div className="registry-tools">
            <button type="button" className="btn-primary" onClick={exportToExcel}>{t("exporter_excel")}</button>
            <label className="btn-secondary import-label">
              {importing ? t("import_en_cours") : t("importer_excel")}
              <input type="file" accept=".xlsx" onChange={handleImportExcel} />
            </label>
          </div>
        </div>

        <div className="filters">
          <input value={motCle} onChange={(e) => setMotCle(e.target.value)} placeholder={t("rechercher_courriers_judiciaires")} />
          <button type="button" className="btn-secondary" onClick={() => setMotCle("")}>{t("reinitialiser")}</button>
        </div>

        <div className="data-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("tribunal_source")}</th>
                <th>{t("numero_dossier_appel")}</th>
                <th>{t("objet")}</th>
                <th>{t("destinataire")}</th>
                <th>{t("service")}</th>
                <th>{t("etat")}</th>
                <th>{t("emplacement")}</th>
                <th>{t("retraits")}</th>
                <th>{t("pdf")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {courriers.length === 0 ? (
                <tr><td colSpan="11" style={{ textAlign: "center" }}>{t("aucun_courrier_judiciaire")}</td></tr>
              ) : (
                courriers.map((courrier) => (
                  <tr key={courrier.id}>
                    <td>{formatDate(courrier.date)}</td>
                    <td>{courrier.tribunalSource || "-"}</td>
                    <td>{courrier.numeroDossier || "-"}</td>
                    <td>{courrier.sujet || "-"}</td>
                    <td>{courrier.destinataire || "-"}</td>
                    <td>{courrier.serviceNom || courrier.idService || "-"}</td>
                    <td>{formatEtat(courrier.etatArchive, t)}</td>
                    <td>{courrier.emplacement || "-"}</td>
                    <td>{courrier.retraitsCount ?? 0}</td>
                    <td>{courrier.lienPdf ? <a href={getDocumentHref(courrier.lienPdf)} target="_blank" rel="noreferrer">{t("ouvrir")}</a> : "-"}</td>
                    <td className="action-icons">
                      <button type="button" onClick={() => handleEdit(courrier)}>{t("modifier")}</button>
                      <button type="button" onClick={() => openArchiveService(courrier)}>{t("service_archive")}</button>
                      <button type="button" onClick={() => handleArchive(courrier.id)}>{t("archiver")}</button>
                      <button type="button" onClick={() => handleDelete(courrier.id)}>{t("supprimer")}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getInitialForm(services = []) {
  return {
    idBureauOrdre: "",
    date: "",
    tribunalSource: "",
    numeroDossier: "",
    sujet: "",
    direction: "Entrant",
    destinataire: "",
    description: "",
    etatArchive: "Nouveau",
    emplacement: "",
    lienPdf: "",
    idService: getDefaultServiceId(services),
    estTransmissible: true,
  };
}

function getInitialRetraitForm() {
  return {
    dateDeRetrait: new Date().toISOString().slice(0, 10),
    motifDeRetrait: "",
    effectuePar: "",
    notes: "",
  };
}

function getDefaultServiceId(services) {
  return services.length > 0 ? services[0].idService : "";
}

function validateForm(form, t) {
  if (!form.date) return t("erreur_date_requise");
  if (!form.tribunalSource.trim()) return t("erreur_tribunal_requis");
  if (!form.numeroDossier.trim()) return t("erreur_numero_dossier_requis");
  if (!/^\d+(\/\d+){0,2}$/.test(form.numeroDossier.trim())) {
    return t("erreur_numero_dossier_format");
  }
  if (!form.sujet.trim()) return t("erreur_objet_requis");
  if (!form.idService) return t("erreur_service_requis");
  return "";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getDocumentHref(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedValue = value.startsWith("/") ? value : `/${value}`;
  const isReactDevServer = window.location.hostname === "localhost" && window.location.port === "3000";

  return isReactDevServer ? `http://localhost:5127${normalizedValue}` : normalizedValue;
}

function getDocumentName(value) {
  if (!value) return "";
  const cleanValue = String(value).split("?")[0].split("#")[0];
  return decodeURIComponent(cleanValue.split("/").filter(Boolean).pop() || cleanValue);
}

function formatEtat(value, t) {
  if (value === "En cours") return t("etat_en_cours");
  if (value === "Traite") return t("etat_traite");
  if (value === "Archive") return t("etat_archive");
  return t("etat_nouveau");
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === "string") return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return fallback;
}

export default GererCourriersJuridiques;
