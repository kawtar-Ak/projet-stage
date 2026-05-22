import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { DEFAULT_SERVICES } from "../constants/defaultServices";
import ActionIcon from "../components/ActionIcon";

function GererArchivesJuridiques() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRetrait, setSelectedRetrait] = useState(null);
  const [selectedRetourRetrait, setSelectedRetourRetrait] = useState(null);
  const [showRetraitModal, setShowRetraitModal] = useState(false);
  const [motCle, setMotCle] = useState("");
  const [dateRecherche, setDateRecherche] = useState("");
  const [retraitMotCle, setRetraitMotCle] = useState("");
  const [retraitDate, setRetraitDate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [services, setServices] = useState([]);
  const [retraitForm, setRetraitForm] = useState(getInitialRetraitForm());
  const [retourForm, setRetourForm] = useState(getInitialRetourForm());
  const [importFile, setImportFile] = useState(null);
  const [importHeaders, setImportHeaders] = useState([]);
  const [showImportMapping, setShowImportMapping] = useState(false);
  const [importMapping, setImportMapping] = useState({ colIdentifiant: "", colCabinet: "", colEmplacement: "", colDate: "" });
  const filteredRetraits = useMemo(
    () => filterRetraits(selectedItem?.retraits || [], retraitMotCle, retraitDate),
    [selectedItem, retraitMotCle, retraitDate]
  );
  const filteredItems = useMemo(
    () => filterArchivesByDate(items, dateRecherche),
    [items, dateRecherche]
  );

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchArchives, 250);
    return () => clearTimeout(timeout);
  }, [motCle]);

  const fetchServices = async () => {
    try {
      const response = await axios.get("/api/services");
      setServices(response.data?.length > 0 ? response.data : DEFAULT_SERVICES);
    } catch (err) {
      setServices(DEFAULT_SERVICES);
    }
  };

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
        setSelectedItem(refreshed || response.data[0] || null);
      } else {
        setSelectedItem(response.data[0] || null);
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
    setRetraitMotCle("");
    setRetraitDate("");
    setError("");
    setSuccess("");
  };

  const openRetraitModal = (item) => {
    setSelectedItem(item);
    setRetraitForm(getInitialRetraitForm());
    setShowRetraitModal(true);
    setError("");
    setSuccess("");
  };

  const closeRetraitModal = () => {
    setShowRetraitModal(false);
  };

  const openRetourModal = (retrait) => {
    setSelectedRetourRetrait(retrait);
    setRetourForm({
      dateDeRetour: retrait.dateDeRetour
        ? new Date(retrait.dateDeRetour).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      notes: retrait.notes || "",
    });
    setError("");
    setSuccess("");
  };

  const closeRetourModal = () => {
    setSelectedRetourRetrait(null);
    setRetourForm(getInitialRetourForm());
  };

  const handleSaveRetrait = async (event) => {
    event.preventDefault();
    if (!selectedItem) return;

    if (hasActiveRetrait(selectedItem)) {
      setError(translate(t, "retrait_deja_en_cours", "Ce dossier a deja un retrait actif. Enregistrez le retour avant un nouveau retrait."));
      return;
    }

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
        dateDeRetour: retraitForm.dateDeRetour ? new Date(retraitForm.dateDeRetour).toISOString() : null,
        notes: retraitForm.notes.trim(),
      });

      setSelectedItem(response.data);
      setRetraitForm(getInitialRetraitForm());
      setShowRetraitModal(false);
      setSuccess(t("retrait_enregistre"));
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_retrait")));
    }
  };

  const exportRetraits = async () => {
    if (!selectedItem) return;

    try {
      const response = await axios.get(`/api/acteursjudiciaires/${selectedItem.id}/retraits/export/excel`, {
        responseType: "blob",
      });
      const numero = selectedItem.numeroDossier ? selectedItem.numeroDossier.replaceAll("/", "-") : selectedItem.id;
      downloadBlob(response.data, `registre-retraits-${numero}.xlsx`);
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_export")));
    }
  };

  const exportArchives = async () => {
    try {
      const response = await axios.get("/api/acteursjudiciaires/export/archives", {
        responseType: "blob",
      });
      downloadBlob(response.data, "archives-juridiques.xlsx");
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_export")));
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get("/api/acteursjudiciaires/template-excel", {
        responseType: "blob",
      });
      downloadBlob(response.data, "modele-import-archives.xlsx");
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_telechargement_modele")));
    }
  };

  const handleImportFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post("/api/acteursjudiciaires/import-archive/preview", formData);
      setImportFile(file);
      setImportHeaders(Array.isArray(response.data) ? response.data : []);
      setImportMapping({ colIdentifiant: "", colCabinet: "", colEmplacement: "", colDate: "" });
      setShowImportMapping(true);
      setError("");
      setSuccess("");
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_lecture_fichier")));
    } finally {
      event.target.value = "";
    }
  };

  const executeArchiveImport = async () => {
    if (!importFile || !importMapping.colIdentifiant) {
      setError(translate(t, "colonne_identifiant_requise", "La colonne Identifiant est obligatoire."));
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);
    const params = new URLSearchParams({
      colIdentifiant: importMapping.colIdentifiant,
      colCabinet: importMapping.colCabinet || "",
      colEmplacement: importMapping.colEmplacement || "",
      colDate: importMapping.colDate || "",
    });

    try {
      const response = await axios.post(`/api/acteursjudiciaires/import-archive/execute?${params.toString()}`, formData);
      const archived = response.data?.archived ?? 0;
      const errors = response.data?.errors || [];
      setSuccess(`${archived} dossier(s) archive(s).${errors.length ? ` ${errors.length} erreur(s).` : ""}`);
      if (errors.length) {
        alert(`${archived} dossier(s) archive(s).\n\n${errors.join("\n")}`);
      }
      setShowImportMapping(false);
      setImportFile(null);
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_import")));
    }
  };

  const handleSaveRetour = async (event) => {
    event.preventDefault();
    if (!selectedItem) return;
    if (!selectedRetourRetrait) return;

    try {
      const response = await axios.put(`/api/acteursjudiciaires/retraits/${selectedRetourRetrait.id}/retour`, {
        dateDeRetour: retourForm.dateDeRetour
          ? new Date(retourForm.dateDeRetour).toISOString()
          : new Date().toISOString(),
        notes: retourForm.notes.trim(),
      });

      setSelectedItem(response.data);
      setSuccess(t("retour_enregistre"));
      closeRetourModal();
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_retour")));
    }
  };

  const handleCancelRetrait = async (retrait) => {
    if (!window.confirm(translate(t, "confirmation_annuler_retrait", "Annuler ce retrait ?"))) return;

    try {
      await axios.delete(`/api/acteursjudiciaires/retraits/${retrait.id}`);
      setSuccess(translate(t, "retrait_annule", "Retrait annule"));
      await fetchArchives();
    } catch (err) {
      setError(getErrorMessage(err, translate(t, "erreur_annulation_retrait", "Erreur lors de l'annulation du retrait")));
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
          <div className="registry-tools">
            <button type="button" className="btn-primary" onClick={exportArchives}>
              {t("exporter_excel")}
            </button>
            <label className="btn-secondary import-label">
              {t("importer_excel")}
              <input type="file" accept=".xlsx" onChange={handleImportFileSelect} />
            </label>
            <button type="button" className="btn-secondary" onClick={downloadTemplate}>
              {t("telecharger_modele")}
            </button>
          </div>
        </div>

        <div className="filters">
          <input
            value={motCle}
            onChange={(event) => setMotCle(event.target.value)}
            placeholder={t("rechercher_archives_judiciaires")}
          />
          <input
            type="date"
            value={dateRecherche}
            onChange={(event) => setDateRecherche(event.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={() => {
            setMotCle("");
            setDateRecherche("");
          }}>
            {t("reinitialiser")}
          </button>
        </div>

        {showImportMapping && (
          <div className="mapping-panel">
            <h4>{translate(t, "associer_colonnes", "Associer les colonnes")}</h4>
            <div className="form-grid">
              <div className="form-field">
                <label>{translate(t, "colonne_identifiant", "Colonne Identifiant")} *</label>
                <select
                  value={importMapping.colIdentifiant}
                  onChange={(event) => setImportMapping((prev) => ({ ...prev, colIdentifiant: event.target.value }))}
                >
                  <option value="">--</option>
                  {importHeaders.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>{translate(t, "colonne_cabinet", "Colonne cabinet")}</label>
                <select
                  value={importMapping.colCabinet}
                  onChange={(event) => setImportMapping((prev) => ({ ...prev, colCabinet: event.target.value }))}
                >
                  <option value="">--</option>
                  {importHeaders.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>{translate(t, "colonne_emplacement", "Colonne emplacement")}</label>
                <select
                  value={importMapping.colEmplacement}
                  onChange={(event) => setImportMapping((prev) => ({ ...prev, colEmplacement: event.target.value }))}
                >
                  <option value="">--</option>
                  {importHeaders.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>{translate(t, "colonne_date_archivage", "Colonne date")}</label>
                <select
                  value={importMapping.colDate}
                  onChange={(event) => setImportMapping((prev) => ({ ...prev, colDate: event.target.value }))}
                >
                  <option value="">--</option>
                  {importHeaders.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-primary" onClick={executeArchiveImport}>{t("importer")}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowImportMapping(false)}>{t("annuler")}</button>
            </div>
          </div>
        )}

        <div className="data-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>{t("numero_dossier_appel")}</th>
                <th>{translate(t, "numero_premiere_instance", "Numero premiere instance")}</th>
                <th>{t("date")}</th>
                <th>{translate(t, "date_archivage", "Date archivage")}</th>
                <th>{t("tribunal_source")}</th>
                <th>{t("objet")}</th>
                <th>{t("emplacement")}</th>
                <th>{translate(t, "cabinet", "Cabinet")}</th>
                <th>{t("etat")}</th>
                <th>{t("retraits")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr><td colSpan="11" style={{ textAlign: "center" }}>{t("aucune_archive_judiciaire")}</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} onClick={() => selectItem(item)}>
                    <td>{item.numeroDossier || "-"}</td>
                    <td>{item.numeroPremiereInstance || "-"}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{formatDate(item.dateArchivage)}</td>
                    <td>{item.tribunalSource || "-"}</td>
                    <td>{item.sujet || "-"}</td>
                    <td>{item.emplacement || "-"}</td>
                    <td>{item.cabinet || "-"}</td>
                    <td>{formatEtat(item.etatArchive, t)}</td>
                    <td>{item.retraitsCount ?? 0}</td>
                    <td className="action-icons">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRetraitModal(item);
                        }}
                        title={t("gerer_retrait")}
                        aria-label={t("gerer_retrait")}
                        className="action-icon action-archive"
                      >
                        <ActionIcon name="archive" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-card archive-service-panel">
        <div className="registry-panel-header">
          <div>
            <h3>{t("registre_retraits")}</h3>
            <p>{selectedItem ? `${selectedItem.numeroDossier || "-"} - ${selectedItem.sujet || "-"}` : "-"}</p>
          </div>
          <button type="button" className="btn-primary" onClick={exportRetraits} disabled={!selectedItem}>
            {t("exporter_excel")}
          </button>
        </div>

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

        <div className="data-table-wrapper">
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
              {!selectedItem || filteredRetraits.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center" }}>{t("aucun_retrait")}</td></tr>
              ) : (
                filteredRetraits.map((retrait) => (
                  <tr key={retrait.id}>
                    <td>{formatDate(retrait.dateDeRetrait)}</td>
                    <td>{retrait.motifDeRetrait || "-"}</td>
                    <td>{retrait.effectuePar || "-"}</td>
                    <td>{retrait.dateDeRetour ? formatDate(retrait.dateDeRetour) : "-"}</td>
                    <td>{retrait.notes || "-"}</td>
                    <td className="action-icons">
                      <button type="button" onClick={() => setSelectedRetrait(retrait)} title={t("consulter")} aria-label={t("consulter")} className="action-icon action-view">
                        <ActionIcon name="view" />
                      </button>
                      {!retrait.dateDeRetour ? (
                        <>
                          <button type="button" onClick={() => openRetourModal(retrait)} title={t("enregistrer_retour")} aria-label={t("enregistrer_retour")} className="action-icon action-return">
                            <ActionIcon name="return" />
                          </button>
                          <button type="button" onClick={() => handleCancelRetrait(retrait)} title={translate(t, "annuler_retrait", "Annuler retrait")} aria-label={translate(t, "annuler_retrait", "Annuler retrait")} className="action-icon action-delete">
                            <ActionIcon name="delete" />
                          </button>
                        </>
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

      {selectedItem && showRetraitModal && (
        <div className="modal-overlay" onClick={closeRetraitModal}>
          <div className="modal archive-retrait-modal" onClick={(event) => event.stopPropagation()}>
            <div className="registry-panel-header">
              <div>
                <h3>{t("gestion_retrait_retour")}</h3>
                <p>{selectedItem.numeroDossier || "-"} - {selectedItem.sujet || "-"}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={closeRetraitModal}>
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
                  <select
                    name="effectuePar"
                    value={retraitForm.effectuePar}
                    onChange={handleRetraitChange}
                  >
                    <option value="">--</option>
                    {services.map((service) => (
                      <option key={service.idService} value={service.nomService}>
                        {service.nomService}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>{t("date_retour")}</label>
                  <input
                    type="date"
                    name="dateDeRetour"
                    value={retraitForm.dateDeRetour}
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
          </div>
        </div>
      )}

      {selectedRetourRetrait && (
        <div className="modal-overlay" onClick={closeRetourModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="registry-panel-header">
              <div>
                <h3>{t("enregistrer_retour")}</h3>
                <p>{selectedItem ? `${selectedItem.numeroDossier || "-"} - ${selectedItem.sujet || "-"}` : "-"}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={closeRetourModal}>
                {t("fermer")}
              </button>
            </div>

            <form onSubmit={handleSaveRetour}>
              <div className="form-grid">
                <div className="form-field">
                  <label>{t("date_retour")}</label>
                  <input
                    type="date"
                    value={retourForm.dateDeRetour}
                    onChange={(event) => setRetourForm((prev) => ({ ...prev, dateDeRetour: event.target.value }))}
                  />
                </div>

                <div className="form-field full-width">
                  <label>{t("note")}</label>
                  <textarea
                    value={retourForm.notes}
                    onChange={(event) => setRetourForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">{t("enregistrer_retour")}</button>
                <button type="button" className="btn-secondary" onClick={closeRetourModal}>{t("annuler")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRetrait && (
        <div className="modal-overlay" onClick={() => setSelectedRetrait(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="registry-panel-header">
              <h3>{t("details_retrait")}</h3>
              <button type="button" className="btn-secondary" onClick={() => setSelectedRetrait(null)}>
                {t("fermer")}
              </button>
            </div>
            <div className="form-grid">
              <div className="form-field"><label>{t("date_retrait")}</label><span>{formatDate(selectedRetrait.dateDeRetrait)}</span></div>
              <div className="form-field"><label>{t("motif")}</label><span>{selectedRetrait.motifDeRetrait || "-"}</span></div>
              <div className="form-field"><label>{t("effectue_par")}</label><span>{selectedRetrait.effectuePar || "-"}</span></div>
              <div className="form-field"><label>{t("date_retour")}</label><span>{selectedRetrait.dateDeRetour ? formatDate(selectedRetrait.dateDeRetour) : "-"}</span></div>
              <div className="form-field full-width"><label>{t("note")}</label><span>{selectedRetrait.notes || "-"}</span></div>
            </div>
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
    dateDeRetour: "",
    notes: "",
  };
}

function getInitialRetourForm() {
  return {
    dateDeRetour: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

function hasActiveRetrait(item) {
  return (item?.retraits || []).some((retrait) => !retrait.dateDeRetour);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function filterArchivesByDate(items, dateRecherche) {
  if (!dateRecherche) return items;

  return items.filter((item) =>
    toDateInputValue(item.date) === dateRecherche ||
    toDateInputValue(item.dateArchivage) === dateRecherche ||
    toDateInputValue(item.creationTime) === dateRecherche
  );
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

function downloadBlob(data, fileName) {
  const blob = data instanceof Blob
    ? data
    : new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatEtat(value, t) {
  if (value === "Archive") return t("etat_archive");
  if (value === "EnCours" || value === "En cours") return t("etat_en_cours");
  if (value === "Traite" || value === "Traité") return t("etat_traite");
  if (value === "Nouveau") return t("etat_nouveau");
  return value || "-";
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === "string") return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return fallback;
}

export default GererArchivesJuridiques;
