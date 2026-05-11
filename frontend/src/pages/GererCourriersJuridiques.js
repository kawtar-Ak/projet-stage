import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { DEFAULT_SERVICES } from "../constants/defaultServices";
import DocumentModal from "../components/DocumentModal";

const LEGACY_API_URL = process.env.REACT_APP_LEGACY_API_URL || "http://localhost:5127";
const BUREAU_ORDRE_SERVICE_ID = 2;
const OUVERTURE_DOSSIERS_SERVICE_ID = 3;

function GererCourriersJuridiques({ embedded = false }) {
  const { t } = useTranslation();
  const currentServiceId = Number(localStorage.getItem("idService") || 0);
  const isBureauOrdreService = currentServiceId === BUREAU_ORDRE_SERVICE_ID;
  const isOuvertureDossiersService = currentServiceId === OUVERTURE_DOSSIERS_SERVICE_ID;
  const [courriers, setCourriers] = useState([]);
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [consultedDocument, setConsultedDocument] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [dateRecherche, setDateRecherche] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [retraitMotCle, setRetraitMotCle] = useState("");
  const [retraitDate, setRetraitDate] = useState("");
  const [form, setForm] = useState(getInitialForm());
  const [selectedArchiveItem, setSelectedArchiveItem] = useState(null);
  const [retraitForm, setRetraitForm] = useState(getInitialRetraitForm());
  const [selectedTransferItem, setSelectedTransferItem] = useState(null);
  const [transferForm, setTransferForm] = useState(getInitialTransferForm());
  const filteredCourriers = useMemo(
    () => filterCourriersJudiciaires(courriers, motCle, dateRecherche),
    [courriers, motCle, dateRecherche]
  );
  const filteredArchiveRetraits = useMemo(
    () => filterRetraits(selectedArchiveItem?.retraits || [], retraitMotCle, retraitDate),
    [selectedArchiveItem, retraitMotCle, retraitDate]
  );

  useEffect(() => {
    fetchCourriers();
    fetchServices();
  }, []);

  const fetchCourriers = async () => {
    try {
      const response = await axios.get("/api/acteursjudiciaires");
      setCourriers(Array.isArray(response.data) ? response.data : []);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_chargement_courriers_judiciaires")));
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get("/api/services");
      const serviceList = response.data?.length > 0 ? response.data : DEFAULT_SERVICES;
      setServices(serviceList);
      if (serviceList.length > 0) {
        setForm((prev) => ({
          ...prev,
          idService: prev.idService || currentServiceId || serviceList[0].idService,
        }));
      }
    } catch (err) {
      setServices(DEFAULT_SERVICES);
      setForm((prev) => ({
        ...prev,
        idService: prev.idService || currentServiceId || DEFAULT_SERVICES[0].idService,
      }));
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

  const handleTransferChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTransferForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTransferServiceChange = (event) => {
    const serviceId = event.target.value;
    setTransferForm((prev) => ({ ...prev, serviceId }));
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

    const validationError = validateForm(form, t, isOuvertureDossiersService);
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
      numeroDossier: isBureauOrdreService ? "" : form.numeroDossier.trim(),
      estTransmissible: isOuvertureDossiersService
        ? hasCompleteNumeroDossier(form.numeroDossier)
        : Boolean(form.estTransmissible) && !isBureauOrdreService && hasCompleteNumeroDossier(form.numeroDossier),
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
    setIsEditModalOpen(true);
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
  };

  const handleConsult = (courrier) => {
    setConsultedDocument({
      idEntite: courrier.id,
      sujet: courrier.sujet,
      type: t("courrier_judiciaire"),
      dateCreation: courrier.date,
      source: courrier.tribunalSource,
      destinataire: courrier.destinataire,
      description: courrier.description,
      numeroCourrier: courrier.idBureauOrdre,
      numeroDossierJudiciaire: courrier.numeroDossier,
      etatArchive: courrier.etatArchive,
    });
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

  const openArchiveService = (courrier) => {
    setSelectedArchiveItem(courrier);
    setRetraitForm(getInitialRetraitForm());
    setRetraitMotCle("");
    setRetraitDate("");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeArchiveService = () => {
    setSelectedArchiveItem(null);
    setRetraitForm(getInitialRetraitForm());
  };

  const openTransferModal = (courrier) => {
    setSelectedTransferItem(courrier);
    setTransferForm(getInitialTransferForm(getDefaultTransferServiceId(courrier)));
    setError("");
    setSuccess("");
  };

  const closeTransferModal = () => {
    setSelectedTransferItem(null);
    setTransferForm(getInitialTransferForm());
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(getInitialForm(services, currentServiceId));
    setIsCreateModalOpen(true);
    setError("");
    setSuccess("");
  };

  const handleTransferSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTransferItem || !transferForm.serviceId) {
      setError(t("service_destinataire_requis"));
      return;
    }

    try {
      const isIncomplete = isIncompleteJudicialFile(selectedTransferItem);
      const destinationServiceId = isIncomplete
        ? OUVERTURE_DOSSIERS_SERVICE_ID
        : Number(transferForm.serviceId);
      const sourceServiceId = Number(selectedTransferItem.idService || currentServiceId);

      await axios.post("/api/transactions", {
        documentId: selectedTransferItem.id,
        documentType: "Judiciaire",
        sourceServiceId,
        destinationServiceId,
        destinationUserId: null,
        doitRevenir: transferForm.doitRevenir,
        dateEnvoi: new Date(transferForm.dateEnvoi).toISOString(),
        message: transferForm.message.trim(),
      });

      setSuccess(t("transaction_envoyee"));
      closeTransferModal();
      await fetchCourriers();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_transaction")));
    }
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
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
    setForm(getInitialForm(services, currentServiceId));
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

  const isFormVisible = embedded || isCreateModalOpen || Boolean(editingId);
  const isFormModal = isCreateModalOpen || (editingId && isEditModalOpen);

  return (
    <div className={embedded ? "courriers-juridiques-content" : "page-container"} dir="rtl">
      {!embedded && <h1 className="page-title">{t("gestion_courriers_judiciaires")}</h1>}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {isFormModal && <div className="modal-overlay" onClick={resetForm} />}
      {isFormVisible && (
      <div
        className={isFormModal ? "modal form-card edit-modal" : "form-card"}
        onClick={isFormModal ? (event) => event.stopPropagation() : undefined}
      >
        <h3>{editingId ? t("modifier") : t("ajouter")} {t("courrier_judiciaire")}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {!isBureauOrdreService && (
              <div className="form-field">
                <label>{t("numero_dossier_appel")}{isOuvertureDossiersService ? " *" : ""}</label>
                <input
                  name="numeroDossier"
                  value={form.numeroDossier}
                  onChange={handleChange}
                  placeholder="2026/15/3"
                  required={isOuvertureDossiersService}
                />
              </div>
            )}

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
                  disabled={isBureauOrdreService || isOuvertureDossiersService}
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
            {(editingId || isCreateModalOpen) && <button type="button" className="btn-secondary" onClick={resetForm}>{t("annuler")}</button>}
          </div>
        </form>
      </div>
      )}

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
            <div className="filters">
              <input
                value={retraitMotCle}
                onChange={(event) => setRetraitMotCle(event.target.value)}
                placeholder={translate(t, "rechercher_retraits", "Rechercher dans les retraits")}
              />
              <input
                type="date"
                value={retraitDate}
                onChange={(event) => setRetraitDate(event.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={() => {
                setRetraitMotCle("");
                setRetraitDate("");
              }}>
                {t("reinitialiser")}
              </button>
            </div>
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
                {filteredArchiveRetraits.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center" }}>{t("aucun_retrait")}</td></tr>
                ) : (
                  filteredArchiveRetraits.map((retrait) => (
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

      {selectedTransferItem && (
        <>
        <div className="modal-overlay" onClick={closeTransferModal} />
        <div className="modal form-card transfer-modal" onClick={(event) => event.stopPropagation()}>
          <div className="registry-panel-header">
            <div>
              <h3>{t("transferer_dossier")}</h3>
              <p>
                {selectedTransferItem.numeroDossier || "-"} - {selectedTransferItem.sujet || "-"}
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={closeTransferModal}>
              {t("fermer")}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleTransferSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>{t("service_destinataire")} *</label>
                <select name="serviceId" value={transferForm.serviceId} onChange={handleTransferServiceChange} required>
                  <option value="">-- {t("selectionner_service")} --</option>
                  {services
                    .filter((service) => isIncompleteJudicialFile(selectedTransferItem)
                      ? Number(service.idService) === OUVERTURE_DOSSIERS_SERVICE_ID
                      : Number(service.idService) !== Number(selectedTransferItem.idService))
                    .map((service) => (
                      <option key={service.idService} value={service.idService}>
                        {service.nomService}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-field">
                <label>{t("date")} *</label>
                <input
                  type="date"
                  name="dateEnvoi"
                  value={transferForm.dateEnvoi}
                  onChange={handleTransferChange}
                  required
                />
              </div>

              <div className="form-field">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    name="doitRevenir"
                    checked={transferForm.doitRevenir}
                    onChange={handleTransferChange}
                  />
                  {t("doit_revenir")}
                </label>
              </div>

              <div className="form-field full-width">
                <label>{t("message")}</label>
                <textarea name="message" value={transferForm.message} onChange={handleTransferChange} rows="3" />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">{t("envoyer")}</button>
              <button type="button" className="btn-secondary" onClick={closeTransferModal}>{t("annuler")}</button>
            </div>
          </form>
        </div>
        </>
      )}

      {!embedded && (
        <div className="registry-choice">
          <button type="button" className="choice-pill" onClick={openCreateModal}>
            {t("ajouter")} {t("courrier_judiciaire")}
          </button>
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
          <input type="date" value={dateRecherche} onChange={(e) => setDateRecherche(e.target.value)} />
          <button type="button" className="btn-secondary" onClick={() => {
            setMotCle("");
            setDateRecherche("");
          }}>{t("reinitialiser")}</button>
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
              {filteredCourriers.length === 0 ? (
                <tr><td colSpan="11" style={{ textAlign: "center" }}>{t("aucun_courrier_judiciaire")}</td></tr>
              ) : (
                filteredCourriers.map((courrier) => (
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
                      <button type="button" onClick={() => handleConsult(courrier)}>{t("consulter")}</button>
                      <button type="button" onClick={() => handleEdit(courrier)}>{t("modifier")}</button>
                      <button type="button" onClick={() => openTransferModal(courrier)} disabled={!canTransferCourrier(courrier)}>
                        {t("transferer")}
                      </button>
                      <button type="button" onClick={() => handleDelete(courrier.id)}>{t("supprimer")}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {consultedDocument && (
        <DocumentModal
          document={consultedDocument}
          onClose={() => setConsultedDocument(null)}
        />
      )}
    </div>
  );
}

function getInitialForm(services = [], currentServiceId = 0) {
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
    idService: currentServiceId || getDefaultServiceId(services),
    estTransmissible: false,
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

function getInitialTransferForm(serviceId = "") {
  return {
    serviceId,
    dateEnvoi: new Date().toISOString().slice(0, 10),
    doitRevenir: false,
    message: "",
  };
}

function getDefaultServiceId(services) {
  return services.length > 0 ? services[0].idService : "";
}

function validateForm(form, t, requireNumeroDossier = false) {
  if (!form.date) return t("erreur_date_requise");
  if (!form.tribunalSource.trim()) return t("erreur_tribunal_requis");
  if (requireNumeroDossier && !form.numeroDossier.trim()) return t("erreur_numero_dossier_requis");
  if (form.numeroDossier.trim() && !/^\d+(\/\d+){2}$/.test(form.numeroDossier.trim())) {
    return t("erreur_numero_dossier_format");
  }
  if (!form.sujet.trim()) return t("erreur_objet_requis");
  if (!form.idService) return t("erreur_service_requis");
  return "";
}

function hasCompleteNumeroDossier(value) {
  return /^\d+\/\d+\/\d+$/.test(String(value || "").trim());
}

function isIncompleteJudicialFile(courrier) {
  return !hasCompleteNumeroDossier(courrier?.numeroDossier);
}

function canTransferCourrier(courrier) {
  if (courrier?.estTransmissible) return true;
  return Number(courrier?.idService) === BUREAU_ORDRE_SERVICE_ID && isIncompleteJudicialFile(courrier);
}

function getDefaultTransferServiceId(courrier) {
  return canTransferCourrier(courrier) && isIncompleteJudicialFile(courrier)
    ? String(OUVERTURE_DOSSIERS_SERVICE_ID)
    : "";
}

function filterCourriersJudiciaires(courriers, motCle, dateRecherche) {
  const keyword = normalizeSearchText(motCle);

  return courriers.filter((courrier) => {
    const matchesDate = !dateRecherche || toDateInputValue(courrier.date) === dateRecherche;
    const matchesKeyword =
      !keyword ||
      [
        courrier.id,
        courrier.idBureauOrdre,
        courrier.numeroDossier,
        courrier.numeroDossierAnnee,
        courrier.numeroDossierNombre,
        courrier.numeroDossierSujet,
        courrier.tribunalSource,
        courrier.sujet,
        courrier.destinataire,
        courrier.description,
        courrier.etatArchive,
        courrier.emplacement,
        courrier.serviceNom,
        courrier.idService,
        courrier.lienPdf,
        courrier.retraitsCount
      ].some((value) => normalizeSearchText(value).includes(keyword));

    return matchesDate && matchesKeyword;
  });
}

function filterRetraits(retraits, motCle, dateRecherche) {
  const keyword = normalizeSearchText(motCle);

  return retraits.filter((retrait) => {
    const matchesDate =
      !dateRecherche ||
      toDateInputValue(retrait.dateDeRetrait) === dateRecherche ||
      toDateInputValue(retrait.dateDeRetour) === dateRecherche;
    const matchesKeyword =
      !keyword ||
      [
        retrait.id,
        retrait.motifDeRetrait,
        retrait.effectuePar,
        retrait.notes,
        formatDate(retrait.dateDeRetrait),
        formatDate(retrait.dateDeRetour)
      ].some((value) => normalizeSearchText(value).includes(keyword));

    return matchesDate && matchesKeyword;
  });
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function translate(t, key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
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
