// ==========================================================
// BLOC 1 : IMPORTATIONS
// ==========================================================
// React : bibliothèque utilisée pour construire l'interface.
// useState : permet de stocker des valeurs qui changent.
// useEffect : permet d'exécuter du code au chargement de la page.
// useMemo : permet de calculer une valeur seulement quand certaines données changent.
// axios : utilisé pour communiquer avec le backend/API.
// GererCourriersJuridiques : composant séparé pour gérer les courriers juridiques.

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import GererCourriersJuridiques from "./GererCourriersJuridiques";

const LEGACY_API_URL = process.env.REACT_APP_LEGACY_API_URL || "http://localhost:5127";

// ==========================================================
// BLOC 2 : CONSTANTES
// ==========================================================
// Ces constantes permettent d'éviter d'écrire directement les textes plusieurs fois.
// Cela rend le code plus propre et plus facile à modifier.

const TYPE_WARIDAT = "Waridat";                 // Type : الواردات
const TYPE_MORASALAT = "Morasalat";             // Type : المراسلات
const MODE_LIEE = "Liee";                       // Morasalat liée à une Warida
const MODE_INDEPENDANTE = "Independante";       // Morasalat indépendante
const CORRESPONDANCE_SORTANTE = "Sortante";     // مراسلة صادرة
const CORRESPONDANCE_ENTRANTE = "Entrante";     // مراسلة واردة


// ==========================================================
// BLOC 3 : COMPOSANT PRINCIPAL
// ==========================================================
// Ce composant représente toute la page de gestion des courriers.
// Il contient :
// - le formulaire d'ajout/modification,
// - le tableau des courriers,
// - la recherche,
// - l'import/export Excel,
// - l'upload de documents,
// - le passage entre administratif et juridique.

function GererCourriers() {
  const { t } = useTranslation();

  // ==========================================================
  // BLOC 3.1 : STATES PRINCIPAUX
  // ==========================================================

  // Détermine le registre actif : administratif ou juridique.
  const [activeRegistre, setActiveRegistre] = useState("administratif");

  // Stocke la liste des courriers affichés dans le tableau.
  const [courriers, setCourriers] = useState([]);

  // Stocke uniquement les courriers de type Waridat.
  // Cette liste est utilisée pour créer des Morasalat liées.
  const [waridat, setWaridat] = useState([]);

  // Stocke la liste des services récupérés depuis le backend.
  const [services, setServices] = useState([]);

  // Si editingId = null => mode ajout.
  // Si editingId contient un id => mode modification.
  const [editingId, setEditingId] = useState(null);


  // ==========================================================
  // BLOC 3.2 : STATES DE RECHERCHE
  // ==========================================================

  // Mot clé utilisé pour chercher par source, sujet, état...
  const [motCle, setMotCle] = useState("");

  // Numéro de bureau d'ordre utilisé dans la recherche.
  const [numeroRecherche, setNumeroRecherche] = useState("");

  // Date utilisée dans la recherche.
  const [dateRecherche, setDateRecherche] = useState("");


  // ==========================================================
  // BLOC 3.3 : MESSAGES ET CHARGEMENTS
  // ==========================================================

  // Message d'erreur affiché à l'utilisateur.
  const [error, setError] = useState("");

  // Message de succès affiché à l'utilisateur.
  const [success, setSuccess] = useState("");

  // Indique si un fichier Excel est en cours d'importation.
  const [importing, setImporting] = useState(false);

  // Indique si un document PDF/Word est en cours d'upload.
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Indique si on est en train de sauvegarder une Warida
  // avant d'ajouter une Morasalat liée.
  const [savingLinked, setSavingLinked] = useState(false);


  // ==========================================================
  // BLOC 3.4 : FORMULAIRE
  // ==========================================================

  // Stocke toutes les informations saisies dans le formulaire.
  const [form, setForm] = useState(getInitialForm());


  // ==========================================================
  // BLOC 3.5 : WARIDA PARENT SÉLECTIONNÉE
  // ==========================================================
  // Si une Morasalat est liée à une Warida,
  // cette variable retrouve la Warida correspondante.

  const selectedParent = useMemo(
    () => waridat.find((item) => String(item.id) === String(form.parentId)),
    [waridat, form.parentId]
  );


  // ==========================================================
  // BLOC 3.6 : VARIABLES CALCULÉES POUR L'AFFICHAGE
  // ==========================================================

  // Vérifie si le type actuel est Morasalat.
  const isMorasalat = form.typeRegistre === TYPE_MORASALAT;

  // Vérifie si c'est une Morasalat liée à une Warida.
  const isLinkedMorasalat = isMorasalat && form.morasalatMode === MODE_LIEE;

  // Vérifie si une recherche est active.
  const hasActiveSearch = Boolean(
    motCle.trim() || numeroRecherche.trim() || dateRecherche
  );

  // Si la Morasalat est liée, on ne saisit pas le numéro de bureau d'ordre,
  // car il sera récupéré automatiquement depuis la Warida liée.
  const showIdBureauOrdreInput = !isLinkedMorasalat;

  // Numéro de bureau d'ordre affiché dans le cas d'une Morasalat liée.
  const displayedIdBureauOrdre = isLinkedMorasalat
    ? selectedParent?.idBureauOrdre || form.parentIdBureauOrdre || ""
    : form.idBureauOrdre;


  // ==========================================================
  // BLOC 4 : CHARGEMENT INITIAL DES DONNÉES
  // ==========================================================
  // Ce useEffect s'exécute une seule fois au chargement de la page.
  // Il récupère :
  // - les courriers,
  // - les Waridat,
  // - les services.

  useEffect(() => {
    fetchCourriers();
    fetchWaridat();
    fetchServices();
  }, []);


  // ==========================================================
  // BLOC 5 : RÉCUPÉRATION DES COURRIERS
  // ==========================================================
  // Cette fonction récupère tous les courriers depuis le backend.

  const fetchCourriers = async () => {
    try {
      const response = await axios.get("/api/courriers");
      setCourriers(response.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_chargement_courriers")));
    }
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


  // ==========================================================
  // BLOC 6 : RÉCUPÉRATION DES WARIDAT
  // ==========================================================
  // Cette fonction récupère seulement les courriers entrants Waridat.
  // Ils sont utilisés pour créer des Morasalat liées.

  const fetchWaridat = async () => {
    try {
      const response = await axios.get("/api/courriers/waridat");
      setWaridat(response.data);
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_chargement_waridat")));
    }
  };


  // ==========================================================
  // BLOC 7 : RÉCUPÉRATION DES SERVICES
  // ==========================================================
  // Cette fonction récupère les services depuis le backend.
  // Elle remplit aussi automatiquement le premier service par défaut
  // si aucun service n'est encore sélectionné.

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


  // ==========================================================
  // BLOC 8 : SÉLECTION DU TYPE WARIDAT
  // ==========================================================
  // Cette fonction prépare le formulaire pour ajouter une Warida.
  // La direction devient automatiquement "Entrant".

  const selectWaridat = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...getInitialForm(services),
      idService: prev.idService || getDefaultServiceId(services),
      typeRegistre: TYPE_WARIDAT,
      morasalatMode: MODE_INDEPENDANTE,
      parentLocked: false,
      parentIdBureauOrdre: "",
      typeCorrespondance: CORRESPONDANCE_SORTANTE,
      direction: "Entrant",
    }));
    setError("");
    setSuccess("");
  };


  // ==========================================================
  // BLOC 9 : SÉLECTION DU TYPE MORASALAT
  // ==========================================================
  // Cette fonction prépare le formulaire pour ajouter une Morasalat.
  // Par défaut, elle est indépendante et sortante.

  const selectMorasalat = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...getInitialForm(services),
      idService: prev.idService || getDefaultServiceId(services),
      typeRegistre: TYPE_MORASALAT,
      morasalatMode: MODE_INDEPENDANTE,
      parentLocked: false,
      parentIdBureauOrdre: "",
      typeCorrespondance: prev.typeCorrespondance || CORRESPONDANCE_SORTANTE,
      direction: "Sortant",
    }));
    setError("");
    setSuccess("");
  };


  // ==========================================================
  // BLOC 10 : CHOIX DU TYPE DE CORRESPONDANCE
  // ==========================================================
  // Cette fonction permet de choisir entre :
  // - Morasalat sortante,
  // - Morasalat entrante.
  // Elle ajuste automatiquement la direction.

  const selectCorrespondance = (typeCorrespondance) => {
    setForm((prev) => ({
      ...prev,
      typeRegistre: TYPE_MORASALAT,
      morasalatMode: prev.parentLocked ? MODE_LIEE : MODE_INDEPENDANTE,
      parentId: prev.parentLocked ? prev.parentId : "",
      parentIdBureauOrdre: prev.parentLocked ? prev.parentIdBureauOrdre : "",
      typeCorrespondance,
      direction:
        typeCorrespondance === CORRESPONDANCE_SORTANTE ? "Sortant" : "Interne",
    }));
  };


  // ==========================================================
  // BLOC 11 : GESTION DES CHANGEMENTS DANS LE FORMULAIRE
  // ==========================================================
  // Cette fonction est appelée à chaque changement dans un input.
  // Elle met à jour automatiquement la valeur correspondante dans form.
  // Pour une checkbox, elle stocke true ou false.
  // Pour idService, elle convertit la valeur en nombre.

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "idService"
          ? Number(value)
          : value,
    }));
  };


  // ==========================================================
  // BLOC 12 : RÉINITIALISATION DU FORMULAIRE
  // ==========================================================
  // Cette fonction vide le formulaire et quitte le mode modification.

  const resetForm = () => {
    setEditingId(null);
    setForm(getInitialForm(services, form.typeRegistre, form.typeCorrespondance));
    setError("");
    setSuccess("");
  };


  // ==========================================================
  // BLOC 13 : SOUMISSION DU FORMULAIRE
  // ==========================================================
  // Cette fonction est exécutée quand l'utilisateur clique sur Ajouter/Modifier.
  // Elle appelle saveCurrentCourrier pour enregistrer les données.
  // Ensuite, elle recharge le tableau.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await saveCurrentCourrier();

      setSuccess(
        editingId ? t("enregistrement_modifie") : t("enregistrement_ajoute")
      );

      resetForm();
      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_donnees")));
    }
  };


  // ==========================================================
  // BLOC 14 : ENREGISTREMENT OU MODIFICATION D'UN COURRIER
  // ==========================================================
  // Cette fonction prépare les données puis les envoie au backend.
  // Si editingId existe, on fait une modification avec PUT.
  // Sinon, on fait un ajout avec POST.

  const saveCurrentCourrier = async () => {
    const validationError = validateForm(form, isLinkedMorasalat, t);

    if (validationError) {
      throw new Error(validationError);
    }

    const dataToSend = {
      // Si la Morasalat est liée, le numéro de bureau d'ordre vient de la Warida.
      // Sinon, on envoie le numéro saisi dans le formulaire.
      idBureauOrdre: isLinkedMorasalat ? "" : form.idBureauOrdre.trim(),

      // Conversion de la date en format ISO pour le backend.
      date: new Date(form.date).toISOString(),

      source: form.source.trim(),
      sujet: form.sujet.trim(),
      destinataire: form.destinataire.trim(),
      description: form.description.trim(),
      etat: form.etat,
      lienPdf: form.lienPdf.trim(),

      // Direction calculée automatiquement.
      direction: getDirection(form),

      typeRegistre: form.typeRegistre,

      // Le type de correspondance concerne uniquement Morasalat.
      typeCorrespondance: isMorasalat ? form.typeCorrespondance : null,

      // parentId est rempli seulement si la Morasalat est liée à une Warida.
      parentId: isLinkedMorasalat ? Number(form.parentId) : null,

      idService: Number(form.idService),

      numeroDeCourrier: String(form.numeroDeCourrier || "").trim(),

      // Convertit la case cochée en booléen.
      estTransmissible: Boolean(form.estTransmissible),
    };

    if (editingId) {
      const response = await axios.put(`/api/courriers/${editingId}`, dataToSend);
      return response.data;
    }

    const response = await axios.post("/api/courriers", dataToSend);
    return response.data;
  };


  // ==========================================================
  // BLOC 15 : SAUVEGARDER WARIDA ET AJOUTER MORASALAT LIÉE
  // ==========================================================
  // Cette fonction permet de :
  // 1. sauvegarder une Warida,
  // 2. ouvrir directement le formulaire pour ajouter une Morasalat liée.
  // Si une Warida avec le même numéro existe déjà, elle est réutilisée.

  const handleSaveWaridatAndAddMorasalat = async () => {
    if (savingLinked) return;

    setError("");
    setSuccess("");

    if (form.typeRegistre !== TYPE_WARIDAT) return;

    try {
      setSavingLinked(true);

      const existingWarida = !editingId
        ? findMainWaridatByNumero(courriers, form.idBureauOrdre)
        : null;

      const savedWarida = existingWarida || (await saveCurrentCourrier());

      await fetchCourriers();
      await fetchWaridat();

      handleAddMorasalat(savedWarida);

      setSuccess(
        existingWarida
          ? t("warida_existante_formulaire_ouvert")
          : t("warida_enregistree_ajouter_morasalat")
      );
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_enregistrer_warida")));
    } finally {
      setSavingLinked(false);
    }
  };


  // ==========================================================
  // BLOC 16 : MODIFIER UN COURRIER
  // ==========================================================
  // Quand l'utilisateur clique sur "تعديل",
  // cette fonction remplit le formulaire avec les données du courrier choisi.

  const handleEdit = (courrier) => {
    const typeRegistre =
      courrier.typeRegistre || (courrier.parentId ? TYPE_MORASALAT : TYPE_WARIDAT);

    const typeCorrespondance =
      courrier.typeCorrespondance || CORRESPONDANCE_SORTANTE;

    const morasalatMode =
      typeRegistre === TYPE_MORASALAT && courrier.parentId
        ? MODE_LIEE
        : MODE_INDEPENDANTE;

    setEditingId(courrier.id);

    setForm({
      idBureauOrdre: courrier.idBureauOrdre || "",
      date: courrier.date ? courrier.date.slice(0, 10) : "",
      source: courrier.source || "",
      sujet: courrier.sujet || "",
      destinataire: courrier.destinataire || "",
      description: courrier.description || "",
      etat: courrier.etat || "Nouveau",
      lienPdf: courrier.lienPdf || "",
      direction: courrier.direction || "Entrant",
      idService: courrier.idService || getDefaultServiceId(services),
      numeroDeCourrier: courrier.numeroDeCourrier || "",
      typeRegistre,
      morasalatMode,
      parentId: courrier.parentId || "",
      parentLocked: Boolean(courrier.parentId),
      parentIdBureauOrdre: courrier.parentId ? courrier.idBureauOrdre || "" : "",
      typeCorrespondance,
      estTransmissible: Boolean(courrier.estTransmissible),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  // ==========================================================
  // BLOC 17 : AJOUTER UNE MORASALAT LIÉE
  // ==========================================================
  // Cette fonction est appelée lorsqu'on veut ajouter une Morasalat
  // attachée à une Warida précise.

  const handleAddMorasalat = (warida) => {
    const parentId = warida.id || warida.idEntite;

    if (!parentId) {
      setError(t("erreur_warida_liee_introuvable"));
      return;
    }

    setEditingId(null);

    setForm({
      ...getInitialForm(services, TYPE_MORASALAT, CORRESPONDANCE_SORTANTE),
      idBureauOrdre: "",
      parentId,
      parentLocked: true,
      parentIdBureauOrdre: warida.idBureauOrdre || "",
      morasalatMode: MODE_LIEE,
      typeRegistre: TYPE_MORASALAT,
      typeCorrespondance: CORRESPONDANCE_SORTANTE,
      direction: "Sortant",
      idService: warida.idService || getDefaultServiceId(services),
    });

    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  // ==========================================================
  // BLOC 18 : SUPPRESSION D'UN COURRIER
  // ==========================================================
  // Cette fonction supprime un courrier après confirmation.

  const handleDelete = async (id) => {
    if (!window.confirm(t("confirmation_supprimer_registre"))) return;

    try {
      await axios.delete(`/api/courriers/${id}`);
      setSuccess(t("registre_supprime"));
      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_supprimer")));
    }
  };


  // ==========================================================
  // BLOC 19 : ARCHIVAGE D'UN COURRIER
  // ==========================================================
  // Cette fonction archive un courrier sans le supprimer définitivement.

  const handleArchive = async (id) => {
    if (!window.confirm(t("confirmation_archiver_registre"))) return;

    try {
      await axios.put(`/api/courriers/archiver/${id}`);
      setSuccess(t("registre_archive"));
      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_archiver")));
    }
  };


  // ==========================================================
  // BLOC 20 : RECHERCHE MANUELLE
  // ==========================================================
  // Cette fonction est appelée quand on soumet le formulaire de recherche.

  const handleSearch = async (e) => {
    e.preventDefault();
    await runSearch();
  };


  // ==========================================================
  // BLOC 21 : EXÉCUTION DE LA RECHERCHE
  // ==========================================================
  // Cette fonction cherche les courriers selon :
  // - mot clé,
  // - numéro de bureau d'ordre,
  // - date.
  // Si aucun filtre n'est rempli, elle recharge tous les courriers.

  const runSearch = async () => {
    try {
      if (!motCle.trim() && !numeroRecherche.trim() && !dateRecherche) {
        await fetchCourriers();
        return;
      }

      const params = new URLSearchParams();

      if (motCle.trim()) {
        params.append("motCle", motCle.trim());
      }

      if (numeroRecherche.trim()) {
        params.append("numeroBureauOrdre", numeroRecherche.trim());
      }

      if (dateRecherche) {
        params.append("date", dateRecherche);
      }

      const response = await axios.get(
        `/api/courriers/search?${params.toString()}`
      );

      setCourriers(response.data);
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_recherche")));
    }
  };


  // ==========================================================
  // BLOC 22 : RECHERCHE AUTOMATIQUE
  // ==========================================================
  // Ce useEffect lance automatiquement la recherche 250 ms
  // après la modification d'un filtre.
  // Cela évite d'envoyer une requête à chaque frappe immédiatement.

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      runSearch();
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [motCle, numeroRecherche, dateRecherche]);


  // ==========================================================
  // BLOC 23 : EXPORT EXCEL
  // ==========================================================
  // Cette fonction télécharge les courriers administratifs
  // sous forme d'un fichier Excel.

  const exportToExcel = async () => {
    try {
      const response = await axios.get("/api/courriers/export/excel", { responseType: "blob" });
      downloadBlob(response.data, "courriers-administratifs.xlsx");
    } catch (err) {
      setError(t("erreur_export"));
    }
    return;

    fetch(`/api/courriers/export/excel`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(t("erreur_export"));
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "courriers-administratifs.xlsx";
        a.click();

        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError(t("erreur_export")));
  };


  // ==========================================================
  // BLOC 24 : IMPORT EXCEL
  // ==========================================================
  // Cette fonction permet d'importer plusieurs courriers
  // depuis un fichier Excel .xlsx.

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("/api/courriers/import/excel", formData);

      const imported = response.data?.imported || 0;
      const errors = response.data?.errors || [];

      setSuccess(t("import_registres", { count: imported }));

      if (errors.length > 0) {
        setError(t("import_termine_avec_erreurs", { errors: errors.join(" | ") }));
      }

      await fetchCourriers();
      await fetchWaridat();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_import")));
    } finally {
      setImporting(false);

      // Permet de choisir à nouveau le même fichier si nécessaire.
      e.target.value = "";
    }
  };


  // ==========================================================
  // BLOC 25 : UPLOAD DOCUMENT PDF / WORD
  // ==========================================================
  // Cette fonction envoie un document au backend.
  // Le backend retourne le lien du fichier.
  // Ce lien est ensuite stocké dans le formulaire.

  const handleDocumentSelect = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingDocument(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        "/api/courriers/upload-document",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setForm((prev) => ({
        ...prev,
        lienPdf: response.data?.lienPdf || "",
      }));

      setSuccess(t("document_upload_success"));
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_upload_document")));
    } finally {
      setUploadingDocument(false);
      e.target.value = "";
    }
  };


  // ==========================================================
  // BLOC 26 : TABLEAU DES COURRIERS
  // ==========================================================
  // Cette fonction affiche le tableau contenant les courriers.
  // Elle affiche aussi les actions :
  // - Ajouter Morasalat,
  // - Modifier,
  // - Archiver,
  // - Supprimer.

  const renderCourriersTable = () => (
    <div className="data-table-wrapper search-results-table">
      <h3>
        {hasActiveSearch
          ? t("resultats_recherche", { count: courriers.length })
          : t("registre_count", { count: courriers.length })}
      </h3>

      <table className="modern-table">
        <thead>
          <tr>
            <th>{t("numero_bureau_ordre")}</th>
            <th>{t("type_registre")}</th>
            <th>{t("liaison")}</th>
            <th>{t("date")}</th>
            <th>{t("source")}</th>
            <th>{t("objet")}</th>
            <th>{t("destinataire")}</th>
            <th>{t("service")}</th>
            <th>{t("etat")}</th>
            <th>{t("transmissible")}</th>
            <th>{t("pdf")}</th>
            <th>{t("actions")}</th>
          </tr>
        </thead>

        <tbody>
          {courriers.length === 0 ? (
            <tr>
              <td colSpan="12" style={{ textAlign: "center" }}>
                {t("aucun_registre")}
              </td>
            </tr>
          ) : (
            courriers.map((courrier) => (
              <tr key={courrier.id}>
                <td>{courrier.idBureauOrdre || "-"}</td>
                <td>{formatRegistre(courrier, t)}</td>
                <td>{courrier.parentId ? t("detail_lie") : t("ligne_principale")}</td>
                <td>
                  {courrier.date
                    ? new Date(courrier.date).toLocaleDateString()
                    : "-"}
                </td>
                <td>{courrier.source || "-"}</td>
                <td>{courrier.sujet || "-"}</td>
                <td>{courrier.destinataire || "-"}</td>
                <td>{courrier.serviceNom || courrier.idService}</td>
                <td>{formatEtat(courrier.etat, t)}</td>

                {/* Affiche Oui si le courrier est transmissible, sinon Non. */}
                <td>{courrier.estTransmissible ? t("oui") : t("non")}</td>

                <td>
                  {courrier.lienPdf ? (
                    <a
                      href={getDocumentHref(courrier.lienPdf)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("voir")}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="action-icons">
                  {isMainWaridat(courrier) && (
                    <button
                      type="button"
                      onClick={() => handleAddMorasalat(courrier)}
                      title={t("ajouter_morasalat")}
                    >
                      {t("ajouter_morasalat")}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleEdit(courrier)}
                    title={t("modifier")}
                  >
                    {t("modifier")}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleArchive(courrier.id)}
                    title={t("archiver")}
                  >
                    {t("archiver")}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(courrier.id)}
                    title={t("supprimer")}
                  >
                    {t("supprimer")}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );


  // ==========================================================
  // BLOC 27 : AFFICHAGE DU REGISTRE JURIDIQUE
  // ==========================================================
  // Si l'utilisateur choisit le registre juridique,
  // on affiche le composant GererCourriersJuridiques.

  if (activeRegistre === "juridique") {
    return (
      <div className="page-container" dir="rtl">
        <h1 className="page-title">{t("gestion_courriers")}</h1>

        <div className="registry-choice">
          <button
            type="button"
            className="choice-pill"
            onClick={() => setActiveRegistre("administratif")}
          >
            {t("gestion_courriers_admin")}
          </button>

          <button
            type="button"
            className="choice-pill active"
            onClick={() => setActiveRegistre("juridique")}
          >
            {t("courriers_judiciaires")}
          </button>
        </div>

        <GererCourriersJuridiques embedded />
      </div>
    );
  }


  // ==========================================================
  // BLOC 28 : AFFICHAGE PRINCIPAL DU REGISTRE ADMINISTRATIF
  // ==========================================================
  // Cette partie contient :
  // - les boutons administratif/juridique,
  // - le formulaire,
  // - la recherche,
  // - l'import/export,
  // - le tableau des courriers.

  return (
    <div className="page-container" dir="rtl">
      <h1 className="page-title">{t("gestion_courriers")}</h1>

      <div className="registry-choice">
        <button
          type="button"
          className="choice-pill active"
          onClick={() => setActiveRegistre("administratif")}
        >
          {t("gestion_courriers_admin")}
        </button>

        <button
          type="button"
          className="choice-pill"
          onClick={() => setActiveRegistre("juridique")}
        >
          {t("courriers_judiciaires")}
        </button>
      </div>

      <h2 className="page-title">{t("gestion_courriers_admin")}</h2>

      {/* Affichage des messages d'erreur et de succès */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Choix entre Waridat et Morasalat */}
      <div className="registry-choice">
        <button
          type="button"
          className={
            form.typeRegistre === TYPE_WARIDAT
              ? "choice-pill active"
              : "choice-pill"
          }
          onClick={selectWaridat}
        >
          {t("waridat")}
        </button>

        <button
          type="button"
          className={
            form.typeRegistre === TYPE_MORASALAT
              ? "choice-pill active"
              : "choice-pill"
          }
          onClick={selectMorasalat}
        >
          {t("morasalat")}
        </button>
      </div>

      {/* Si le type est Morasalat, on affiche le choix Sortante/Entrante */}
      {isMorasalat && (
        <div className="registry-choice sub-choice">
          <button
            type="button"
            className={
              form.typeCorrespondance === CORRESPONDANCE_SORTANTE
                ? "choice-pill active"
                : "choice-pill"
            }
            onClick={() => selectCorrespondance(CORRESPONDANCE_SORTANTE)}
          >
            {t("morasalat_sortantes")}
          </button>

          <button
            type="button"
            className={
              form.typeCorrespondance === CORRESPONDANCE_ENTRANTE
                ? "choice-pill active"
                : "choice-pill"
            }
            onClick={() => selectCorrespondance(CORRESPONDANCE_ENTRANTE)}
          >
            {t("morasalat_entrantes")}
          </button>
        </div>
      )}

      {/* ======================================================
          FORMULAIRE D'AJOUT / MODIFICATION
      ====================================================== */}
      <div className="form-card">
        <h3>
          {editingId ? t("modifier") : t("ajouter")} {formatFormTitle(form, t)}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Numéro de bureau d'ordre */}
            {showIdBureauOrdreInput ? (
              <div className="form-field">
                <label>{t("numero_bureau_ordre")} *</label>
                <input
                  type="text"
                  name="idBureauOrdre"
                  value={form.idBureauOrdre}
                  onChange={handleChange}
                  placeholder={t("placeholder_numero_bureau_exemple")}
                  required
                />
              </div>
            ) : (
              <div className="form-field">
                <label>{t("numero_bureau_ordre")}</label>
                <input
                  type="text"
                  value={
                    displayedIdBureauOrdre || t("numero_pris_depuis_warida")
                  }
                  readOnly
                />
              </div>
            )}

            {/* Date */}
            <div className="form-field">
              <label>{t("date")} *</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            {/* Source */}
            <div className="form-field">
              <label>
                {isMorasalat &&
                form.typeCorrespondance === CORRESPONDANCE_SORTANTE
                  ? t("expediteur")
                  : t("source")}{" "}
                *
              </label>
              <input
                type="text"
                name="source"
                value={form.source}
                onChange={handleChange}
                placeholder={t("placeholder_source")}
                required
              />
            </div>

            {/* Sujet */}
            <div className="form-field">
              <label>
                {isMorasalat &&
                form.typeCorrespondance === CORRESPONDANCE_ENTRANTE
                  ? t("reponse_objet")
                  : t("objet")}{" "}
                *
              </label>
              <input
                type="text"
                name="sujet"
                value={form.sujet}
                onChange={handleChange}
                placeholder={t("placeholder_objet")}
                required
              />
            </div>

            {/* Destinataire */}
            <div className="form-field">
              <label>{t("destinataire")}</label>
              <input
                type="text"
                name="destinataire"
                value={form.destinataire}
                onChange={handleChange}
                placeholder={t("placeholder_destinataire")}
              />
            </div>

            {/* Service */}
            <div className="form-field">
              <label>{t("service_concerne")} *</label>
              <select
                name="idService"
                value={form.idService}
                onChange={handleChange}
                required
              >
                <option value="">{t("selectionner_service")}</option>

                {services.map((service) => (
                  <option key={service.idService} value={service.idService}>
                    {service.nomService}
                  </option>
                ))}
              </select>
            </div>

            {/* État */}
            <div className="form-field">
              <label>{t("etat")}</label>
              <select name="etat" value={form.etat} onChange={handleChange}>
                <option value="Nouveau">{t("etat_nouveau")}</option>
                <option value="En cours">{t("etat_en_cours")}</option>
                <option value="Traite">{t("etat_traite")}</option>
                <option value="Archive">{t("etat_archive")}</option>
              </select>
            </div>

            {/* Numéro interne */}
            <div className="form-field">
              <label>{t("numero_interne")}</label>
              <input
                type="text"
                name="numeroDeCourrier"
                value={form.numeroDeCourrier}
                onChange={handleChange}
              />
            </div>

            {/* Document PDF / Word */}
            <div className="form-field full-width">
              <label>{t("document_pdf_word")}</label>

              <div className="document-control">
                <label className="document-upload-button">
                  {uploadingDocument ? t("upload_en_cours") : t("choisir_fichier")}

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleDocumentSelect}
                  />
                </label>

                <div
                  className={
                    form.lienPdf
                      ? "document-link-preview filled"
                      : "document-link-preview"
                  }
                >
                  <span title={form.lienPdf || ""}>
                    {form.lienPdf
                      ? getDocumentName(form.lienPdf)
                      : t("aucun_fichier_selectionne")}
                  </span>

                  {form.lienPdf && (
                    <a
                      href={getDocumentHref(form.lienPdf)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("ouvrir")}
                    </a>
                  )}
                </div>

                <div className="document-link-input">
                  <input
                    type="text"
                    name="lienPdf"
                    value={form.lienPdf}
                    onChange={handleChange}
                    placeholder={t("placeholder_lien_pdf")}
                  />

                  {form.lienPdf && (
                    <a
                      href={getDocumentHref(form.lienPdf)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("ouvrir")}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Transmissible */}
            <div className="form-field">
              <label>{t("transmissible")}</label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="estTransmissible"
                  checked={form.estTransmissible}
                  onChange={handleChange}
                />
                {t("transmissible")}
              </label>
            </div>

            {/* Description */}
            <div className="form-field full-width">
              <label>{t("note")}</label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder={t("placeholder_notes")}
              />
            </div>
          </div>

          {/* Boutons du formulaire */}
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? t("modifier") : t("ajouter")}
            </button>

            {form.typeRegistre === TYPE_WARIDAT && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveWaridatAndAddMorasalat}
                disabled={savingLinked}
              >
                {savingLinked ? t("sauvegarde_en_cours") : t("ajouter_morasalat_liee")}
              </button>
            )}

            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                {t("annuler")}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ======================================================
          RECHERCHE + IMPORT/EXPORT + TABLEAU
      ====================================================== */}
      <div className="registry-panel">
        <div className="registry-panel-header">
          <h3>{t("recherche_registre")}</h3>

          <div className="registry-tools">
            <button
              type="button"
              className="btn-primary"
              onClick={exportToExcel}
            >
              {t("exporter_excel")}
            </button>

            <label className="btn-secondary import-label">
              {importing ? t("import_en_cours") : t("importer_excel")}

              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>

        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={motCle}
              onChange={(e) => setMotCle(e.target.value)}
              placeholder={t("placeholder_recherche_courriers")}
            />

            <input
              type="text"
              value={numeroRecherche}
              onChange={(e) => setNumeroRecherche(e.target.value)}
              placeholder={t("numero_bureau_ordre")}
            />

            <input
              type="date"
              value={dateRecherche}
              onChange={(e) => setDateRecherche(e.target.value)}
            />

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMotCle("");
                setNumeroRecherche("");
                setDateRecherche("");
                fetchCourriers();
              }}
            >
              {t("reinitialiser")}
            </button>
          </form>
        </div>

        {renderCourriersTable()}
      </div>
    </div>
  );
}


// ==========================================================
// BLOC 29 : INITIALISATION DU FORMULAIRE
// ==========================================================
// Cette fonction retourne un formulaire vide avec des valeurs par défaut.

function getInitialForm(
  services = [],
  typeRegistre = TYPE_WARIDAT,
  typeCorrespondance = CORRESPONDANCE_SORTANTE
) {
  return {
    idBureauOrdre: "",
    date: "",
    source: "",
    sujet: "",
    destinataire: "",
    description: "",
    etat: "Nouveau",
    lienPdf: "",

    // La direction dépend du type de courrier.
    direction:
      typeRegistre === TYPE_MORASALAT &&
      typeCorrespondance === CORRESPONDANCE_SORTANTE
        ? "Sortant"
        : "Entrant",

    idService: getDefaultServiceId(services),
    numeroDeCourrier: "",
    typeRegistre,
    morasalatMode: MODE_INDEPENDANTE,
    parentId: "",
    parentLocked: false,
    parentIdBureauOrdre: "",
    typeCorrespondance,

    // Par défaut, le courrier n'est pas transmissible.
    estTransmissible: false,
  };
}


// ==========================================================
// BLOC 30 : SERVICE PAR DÉFAUT
// ==========================================================
// Retourne l'id du premier service si la liste existe.

function getDefaultServiceId(services) {
  return services.length > 0 ? services[0].idService : "";
}


// ==========================================================
// BLOC 31 : VALIDATION DU FORMULAIRE
// ==========================================================
// Vérifie que les champs obligatoires sont remplis
// avant d'envoyer les données au backend.

function validateForm(form, isLinkedMorasalat, t) {
  if (!isLinkedMorasalat && !form.idBureauOrdre.trim()) {
    return t("erreur_numero_bureau_requis_ligne");
  }

  if (isLinkedMorasalat && !form.parentId) {
    return t("erreur_warida_liee_requise");
  }

  if (!form.date) return t("erreur_date_requise");
  if (!form.source.trim()) return t("erreur_source_requise");
  if (!form.sujet.trim()) return t("erreur_objet_requis");
  if (!form.idService) return t("erreur_service_concerne_requis");

  return "";
}


// ==========================================================
// BLOC 32 : DÉTERMINATION DE LA DIRECTION
// ==========================================================
// Retourne la direction du courrier :
// - Waridat => Entrant
// - Morasalat sortante => Sortant
// - Morasalat entrante => Interne

function getDirection(form) {
  if (form.typeRegistre === TYPE_WARIDAT) return "Entrant";

  return form.typeCorrespondance === CORRESPONDANCE_SORTANTE
    ? "Sortant"
    : "Interne";
}


// ==========================================================
// BLOC 33 : TITRE DU FORMULAIRE
// ==========================================================
// Retourne le titre affiché dans le formulaire.

function formatFormTitle(form, t) {
  if (form.typeRegistre === TYPE_WARIDAT) return t("waridat");

  return form.typeCorrespondance === CORRESPONDANCE_ENTRANTE
    ? t("morasalat_entrantes")
    : t("morasalat_sortantes");
}


// ==========================================================
// BLOC 34 : FORMATAGE DU TYPE DE REGISTRE
// ==========================================================
// Convertit les valeurs techniques en texte arabe affichable.

function formatRegistre(courrier, t) {
  if (courrier.typeRegistre === TYPE_MORASALAT) {
    return courrier.typeCorrespondance === CORRESPONDANCE_ENTRANTE
      ? t("morasalat_entrantes")
      : t("morasalat_sortantes");
  }

  return t("waridat");
}


// ==========================================================
// BLOC 35 : FORMATAGE DE L'ÉTAT
// ==========================================================
// Convertit l'état stocké dans la base en texte arabe.

function formatEtat(etat, t) {
  if (etat === "En cours") return t("etat_en_cours");
  if (etat === "Traite" || etat === "Traité") return t("etat_traite");
  if (etat === "Archive" || etat === "Archivé") return t("etat_archive");

  return t("etat_nouveau");
}


// ==========================================================
// BLOC 36 : VÉRIFIER SI LE COURRIER EST UNE WARIDA PRINCIPALE
// ==========================================================
// Une Warida principale est un courrier de type Waridat
// qui n'est pas lié à un autre courrier.

function isMainWaridat(courrier) {
  const typeRegistre =
    courrier.typeRegistre || (courrier.parentId ? TYPE_MORASALAT : TYPE_WARIDAT);

  return typeRegistre === TYPE_WARIDAT && !courrier.parentId;
}


// ==========================================================
// BLOC 37 : CHERCHER UNE WARIDA PAR NUMÉRO
// ==========================================================
// Cette fonction vérifie s'il existe déjà une Warida principale
// avec le même numéro de bureau d'ordre.

function findMainWaridatByNumero(courriers, idBureauOrdre) {
  const numero = (idBureauOrdre || "").trim();

  if (!numero) return null;

  return (
    courriers.find(
      (courrier) =>
        isMainWaridat(courrier) &&
        (courrier.idBureauOrdre || "").trim() === numero
    ) || null
  );
}


// ==========================================================
// BLOC 38 : GÉNÉRER LE LIEN DU DOCUMENT
// ==========================================================
// Cette fonction prépare le bon lien pour ouvrir un document.
// Si le lien est externe, elle le retourne directement.
// Sinon, elle construit un lien local compatible avec le backend.

function getDocumentHref(value) {
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  const normalizedValue = value.startsWith("/") ? value : `/${value}`;

  const isReactDevServer =
    window.location.hostname === "localhost" && window.location.port === "3000";

  return isReactDevServer
    ? `http://localhost:5127${normalizedValue}`
    : normalizedValue;
}


// ==========================================================
// BLOC 39 : RÉCUPÉRER LE NOM DU DOCUMENT
// ==========================================================
// Cette fonction récupère seulement le nom du fichier depuis son chemin.

function getDocumentName(value) {
  if (!value) return "";

  const cleanValue = String(value).split("?")[0].split("#")[0];

  return decodeURIComponent(
    cleanValue.split("/").filter(Boolean).pop() || cleanValue
  );
}


// ==========================================================
// BLOC 40 : GESTION DES MESSAGES D'ERREUR
// ==========================================================
// Cette fonction récupère le message d'erreur exact retourné par l'API.
// Si aucun message précis n'existe, elle affiche un message par défaut.

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === "string") return error.response.data;

  if (error.response?.data?.message) return error.response.data.message;

  if (error.message) return error.message;

  return fallback;
}


// ==========================================================
// BLOC 41 : EXPORT DU COMPOSANT
// ==========================================================
// Permet d'utiliser ce composant dans d'autres fichiers React.

export default GererCourriers;
