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
import ActionIcon from "../components/ActionIcon";
import DocumentModal from "../components/DocumentModal";
import ConseillerRapporteurSelect, { isConseillerRapporteurService } from "../components/ConseillerRapporteurSelect";
import { ABP_API_URL } from "../api/axiosConfig";
import { getLookupItems, itemsToOptions } from "../api/lookups";

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
const DESTINATAIRE_WARIDAT_DEFAULT = "محكمة الاستئناف الإدارية فاس";
const WARIDAT_SOURCES = [
  "المحكمة الابتدائية فاس",
  "المحكمة الابتدائية وجدة",
  "آخر"
];


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
  const currentServiceId = Number(localStorage.getItem("idService") || 0);

  // ==========================================================
  // BLOC 3.1 : STATES PRINCIPAUX
  // ==========================================================

  // Détermine le registre actif : administratif ou juridique.
  const [activeRegistre, setActiveRegistre] = useState("administratif");

  // Stocke la liste des courriers affichés dans le tableau.
  const [courriers, setCourriers] = useState([]);
  const [allCourriers, setAllCourriers] = useState([]);

  // Stocke uniquement les courriers de type Waridat.
  // Cette liste est utilisée pour créer des Morasalat liées.
  const [waridat, setWaridat] = useState([]);

  // Stocke la liste des services récupérés depuis le backend.
  const [services, setServices] = useState([]);
  const [etatOptions, setEtatOptions] = useState(getDefaultCourrierEtatOptions(t));
  const [sourceOptions, setSourceOptions] = useState(WARIDAT_SOURCES.map((source) => ({ value: source, label: source })));

  // Si editingId = null => mode ajout.
  // Si editingId contient un id => mode modification.
  const [editingId, setEditingId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [consultedDocument, setConsultedDocument] = useState(null);
  const [selectedTransferItem, setSelectedTransferItem] = useState(null);
  const [transferForm, setTransferForm] = useState(getInitialTransferForm());
  const [transferServiceSearch, setTransferServiceSearch] = useState("");
  const [sentAdministrativeDocumentIds, setSentAdministrativeDocumentIds] = useState(new Set());


  // ==========================================================
  // BLOC 3.2 : STATES DE RECHERCHE
  // ==========================================================

  // Mot clé utilisé pour chercher par source, sujet, état...
  const [motCle, setMotCle] = useState("");

  // Numéro de bureau d'ordre utilisé dans la recherche.
  // Date utilisée dans la recherche.
  const [dateRecherche, setDateRecherche] = useState("");
  const [registreFilter, setRegistreFilter] = useState("all");
  const [selectedExportIds, setSelectedExportIds] = useState([]);


  // ==========================================================
  // BLOC 3.3 : MESSAGES ET CHARGEMENTS
  // ==========================================================

  // Message d'erreur affiché à l'utilisateur.
  const [error, setError] = useState("");

  // Message de succès affiché à l'utilisateur.
  const [success, setSuccess] = useState("");

  // Indique si un fichier Excel est en cours d'importation.
  const [importing, setImporting] = useState(false);
  const [administrativeImportType, setAdministrativeImportType] = useState(TYPE_WARIDAT);

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
  const isMorasalatResponseMode = isMorasalat && form.typeCorrespondance === CORRESPONDANCE_ENTRANTE;
  const isStructuredAdminForm = form.typeRegistre === TYPE_WARIDAT || isMorasalat;

  // Vérifie si c'est une Morasalat liée à une Warida.
  const isLinkedMorasalat = isMorasalat && form.morasalatMode === MODE_LIEE;

  // Vérifie si une recherche est active.
  const hasActiveSearch = Boolean(
    motCle.trim() || dateRecherche || registreFilter !== "all"
  );
  const filteredCourriers = useMemo(
    () => filterCourriers(allCourriers, motCle, dateRecherche, registreFilter),
    [allCourriers, motCle, dateRecherche, registreFilter]
  );
  const visibleCourriers = useMemo(
    () => getVisibleAdministrativeRows(filteredCourriers, allCourriers),
    [filteredCourriers, allCourriers]
  );
  const selectedExportIdSet = useMemo(
    () => new Set(selectedExportIds.map((id) => String(id))),
    [selectedExportIds]
  );
  const visibleExportIds = useMemo(
    () => visibleCourriers.map((courrier) => courrier.id).filter(Boolean),
    [visibleCourriers]
  );
  const allVisibleSelected =
    visibleExportIds.length > 0 &&
    visibleExportIds.every((id) => selectedExportIdSet.has(String(id)));

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
    fetchLookups();
    fetchSentAdministrativeTransactions();
  }, []);


  // ==========================================================
  // BLOC 5 : RÉCUPÉRATION DES COURRIERS
  // ==========================================================
  // Cette fonction récupère tous les courriers depuis le backend.

  const fetchCourriers = async () => {
    try {
      const response = await axios.get("/api/courriers");
      const items = Array.isArray(response.data) ? response.data : [];
      setCourriers(items);
      setAllCourriers(items);
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

  const fetchLookups = async () => {
    try {
      const [etats, sources] = await Promise.all([
        getLookupItems("courrier.etat"),
        getLookupItems("administratif.source")
      ]);
      setEtatOptions(itemsToOptions(etats, getDefaultCourrierEtatOptions(t)));
      setSourceOptions(itemsToOptions(sources, WARIDAT_SOURCES.map((source) => ({ value: source, label: source }))));
    } catch (err) {
      setEtatOptions(getDefaultCourrierEtatOptions(t));
      setSourceOptions(WARIDAT_SOURCES.map((source) => ({ value: source, label: source })));
    }
  };

  const fetchSentAdministrativeTransactions = async () => {
    try {
      const response = await axios.get("/api/transactions/outgoing");
      const transactions = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];
      setSentAdministrativeDocumentIds(
        new Set(
          transactions
            .filter((transaction) =>
              String(transaction.documentType || "").toLowerCase() === "administratif" &&
              Number(transaction.sourceServiceId) === currentServiceId &&
              isPendingTransactionStatus(transaction.statut)
            )
            .map((transaction) => String(transaction.documentId))
        )
      );
    } catch (err) {
      setSentAdministrativeDocumentIds(new Set());
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
      destinataire: prev.destinataire || DESTINATAIRE_WARIDAT_DEFAULT,
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
      destinataire: prev.destinataire || DESTINATAIRE_WARIDAT_DEFAULT,
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

  const showMorasalatResponseFields = () => {
    setIsEditModalOpen(true);
    setForm((prev) => ({
      ...prev,
      typeRegistre: TYPE_MORASALAT,
      typeCorrespondance: CORRESPONDANCE_ENTRANTE,
      direction: "Interne",
      idBureauOrdre: prev.idBureauOrdre,
      date: prev.date || "",
      dateMessage: "",
      dateArrivee: "",
      destinataire: prev.destinataire || DESTINATAIRE_WARIDAT_DEFAULT,
      source: prev.source || DESTINATAIRE_WARIDAT_DEFAULT,
      sujet: prev.sujet || "",
      estTransmissible: true,
    }));
  };

  const openFichiersAdministratifs = () => {
    setActiveRegistre("juridique");
    setError("");
    setSuccess("");
  };

  const openWaridatAdministratives = () => {
    setActiveRegistre("administratif");
    selectWaridat();
  };

  const openMorasalatAdministratives = () => {
    setActiveRegistre("administratif");
    selectMorasalat();
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
    setIsEditModalOpen(false);
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

    const effectiveIdBureauOrdre = isLinkedMorasalat
      ? (displayedIdBureauOrdre || form.parentIdBureauOrdre || "").trim()
      : formatBureauOrdreWithCurrentYear(form.idBureauOrdre);

    const dataToSend = {
      // Si la Morasalat est liée, le numéro de bureau d'ordre vient de la Warida.
      // Sinon, on envoie le numéro saisi dans le formulaire.
      idBureauOrdre: effectiveIdBureauOrdre,

      // Conversion de la date en format ISO pour le backend.
      date: new Date(getEffectiveDate(form)).toISOString(),

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
        ? findMainWaridatByNumero(allCourriers, formatBureauOrdreWithCurrentYear(form.idBureauOrdre))
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
    setIsEditModalOpen(true);

    setForm({
      idBureauOrdre: courrier.idBureauOrdre || "",
      date: courrier.date ? courrier.date.slice(0, 10) : "",
      dateMessage: courrier.dateMessage || "",
      dateArrivee: courrier.date ? courrier.date.slice(0, 10) : "",
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
  };

  const handleConsult = (courrier) => {
    setConsultedDocument({
      idEntite: courrier.id,
      sujet: courrier.sujet,
      type: formatRegistre(courrier, t),
      dateCreation: courrier.date,
      idBureauOrdre: courrier.idBureauOrdre,
      source: courrier.source,
      destinataire: courrier.destinataire,
      description: courrier.description,
      numeroCourrier: courrier.numeroDeCourrier || courrier.idBureauOrdre,
      etat: courrier.etat,
      lienPdf: courrier.lienPdf,
    });
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
    setIsEditModalOpen(true);

    setForm({
      ...getInitialForm(services, TYPE_MORASALAT, CORRESPONDANCE_SORTANTE),
      idBureauOrdre: warida.idBureauOrdre || "",
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
  };

  const handleAddMorasalatResponse = (morasala) => {
    const parentId = morasala.id || morasala.idEntite;

    if (!parentId) {
      setError(t("erreur_warida_liee_introuvable"));
      return;
    }

    setEditingId(null);
    setIsEditModalOpen(true);

    setForm({
      ...getInitialForm(services, TYPE_MORASALAT, CORRESPONDANCE_ENTRANTE),
      idBureauOrdre: morasala.idBureauOrdre || "",
      parentId,
      parentLocked: true,
      parentIdBureauOrdre: morasala.idBureauOrdre || "",
      morasalatMode: MODE_LIEE,
      typeRegistre: TYPE_MORASALAT,
      typeCorrespondance: CORRESPONDANCE_ENTRANTE,
      direction: "Interne",
      date: "",
      dateMessage: "",
      dateArrivee: "",
      source: morasala.destinataire || DESTINATAIRE_WARIDAT_DEFAULT,
      destinataire: morasala.source || DESTINATAIRE_WARIDAT_DEFAULT,
      sujet: "",
      etat: "",
      idService: morasala.idService || getDefaultServiceId(services),
    });

    setError("");
    setSuccess("");
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

  const openTransferModal = (courrier) => {
    setSelectedTransferItem(courrier);
    setTransferForm(getInitialTransferForm());
    setTransferServiceSearch("");
    setError("");
    setSuccess("");
  };

  const closeTransferModal = () => {
    setSelectedTransferItem(null);
    setTransferForm(getInitialTransferForm());
    setTransferServiceSearch("");
  };

  const handleTransferChange = (event) => {
    const { name, value, type, checked } = event.target;

    setTransferForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleIdBureauOrdreBlur = () => {
    setForm((prev) => ({
      ...prev,
      idBureauOrdre: formatBureauOrdreWithCurrentYear(prev.idBureauOrdre),
    }));
  };

  const handleTransferServiceChange = (event) => {
    setTransferForm((prev) => ({
      ...prev,
      serviceId: event.target.value,
      destinationUserId: isConseillerRapporteurService(event.target.value) ? prev.destinationUserId : "",
    }));
  };

  const handleTransferModeChange = (mode) => {
    setTransferForm((prev) => ({
      ...prev,
      mode,
      serviceIds: mode === "multiple" ? [] : prev.serviceIds,
    }));
    setTransferServiceSearch("");
  };

  const handleTransferServiceToggle = (serviceId) => {
    setTransferForm((prev) => {
      const value = String(serviceId);
      const serviceIds = prev.serviceIds.includes(value)
        ? prev.serviceIds.filter((id) => id !== value)
        : [...prev.serviceIds, value];

      return {
        ...prev,
        serviceIds,
        destinationUserId: serviceIds.some(isConseillerRapporteurService) ? prev.destinationUserId : "",
      };
    });
  };

  const handleTransferSubmit = async (event) => {
    event.preventDefault();

    if (!selectedTransferItem) return;

    const destinationServiceIds = transferForm.mode === "multiple"
      ? transferForm.serviceIds
      : [transferForm.serviceId].filter(Boolean);

    if (destinationServiceIds.length === 0) {
      setError(t("service_destinataire_requis"));
      return;
    }

    try {
      const sourceServiceId = Number(
        selectedTransferItem.idService || currentServiceId
      );

      await Promise.all(
        destinationServiceIds.map((serviceId) =>
          axios.post("/api/transactions", {
            documentId: selectedTransferItem.id,
            documentType: "Administratif",
            sourceServiceId,
            destinationServiceId: Number(serviceId),
            destinationUserId: isConseillerRapporteurService(serviceId)
              ? Number(transferForm.destinationUserId)
              : null,
            doitRevenir: transferForm.doitRevenir,
            dateEnvoi: new Date(transferForm.dateEnvoi).toISOString(),
            message: transferForm.message.trim(),
          })
        )
      );

      setSuccess(translate(t, "transaction_envoyee_message", "Transaction envoyee avec succes."));
      closeTransferModal();
      await fetchCourriers();
      await fetchWaridat();
      await fetchSentAdministrativeTransactions();
    } catch (err) {
      setError(getErrorMessage(err, t("erreur_transaction")));
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
      if (allCourriers.length === 0) {
        await fetchCourriers();
      }
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
  }, [motCle, dateRecherche]);

  // ==========================================================
  // BLOC 23 : EXPORT EXCEL
  // ==========================================================
  // Cette fonction télécharge les courriers administratifs
  // sous forme d'un fichier Excel.

  const exportToExcel = async () => {
    const visibleIdSet = new Set(filteredCourriers.map((courrier) => String(courrier.id)));
    const idsToExport = selectedExportIds
      .filter((id) => visibleIdSet.has(String(id)))
      .map((id) => String(id));
    const selectedCourriers = filteredCourriers.filter((courrier) =>
      idsToExport.includes(String(courrier.id))
    );

    if (selectedCourriers.length === 0) {
      setError(t("selection_requise"));
      return;
    }

    try {
      const workbookHtml = buildAdministrativeSelectionWorkbook(selectedCourriers, allCourriers, t);
      const blob = new Blob([workbookHtml], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      downloadBlob(blob, "courriers-administratifs-selection.xls");
    } catch (err) {
      setError(t("erreur_export"));
    }
  };

  const toggleCourrierSelection = (id) => {
    setSelectedExportIds((prev) =>
      prev.some((selectedId) => String(selectedId) === String(id))
        ? prev.filter((selectedId) => String(selectedId) !== String(id))
        : [...prev, id]
    );
  };

  const clearExportSelection = () => {
    setSelectedExportIds([]);
  };

  const toggleVisibleSelection = () => {
    if (allVisibleSelected) {
      const visibleIdSet = new Set(visibleExportIds.map((id) => String(id)));
      setSelectedExportIds((prev) =>
        prev.filter((id) => !visibleIdSet.has(String(id)))
      );
      return;
    }

    setSelectedExportIds((prev) => {
      const next = new Set(prev.map((id) => String(id)));
      visibleExportIds.forEach((id) => next.add(String(id)));
      return Array.from(next);
    });
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
      const params = new URLSearchParams();
      if (administrativeImportType === "MorasalatEntrante") {
        params.set("typeRegistre", TYPE_MORASALAT);
        params.set("typeCorrespondance", CORRESPONDANCE_ENTRANTE);
      } else if (administrativeImportType === "MorasalatSortante") {
        params.set("typeRegistre", TYPE_MORASALAT);
        params.set("typeCorrespondance", CORRESPONDANCE_SORTANTE);
      } else {
        params.set("typeRegistre", TYPE_WARIDAT);
      }

      const response = await axios.post(`/api/courriers/import/excel?${params.toString()}`, formData);

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
      <div className="data-table-header">
        <h3>
          {hasActiveSearch
            ? t("resultats_recherche", { count: visibleCourriers.length })
            : t("registre_count", { count: visibleCourriers.length })}
        </h3>

        <div className="registry-tools table-registry-tools">
          <button
            type="button"
            className="btn-primary icon-only-button"
            data-tooltip={t("exporter_excel")}
            aria-label={t("exporter_excel")}
            onClick={exportToExcel}
            disabled={selectedExportIds.length === 0}
          >
            <ActionIcon name="download" />
          </button>

          <select
            className="export-scope-select"
            value={administrativeImportType}
            onChange={(event) => setAdministrativeImportType(event.target.value)}
            disabled={importing}
          >
            <option value={TYPE_WARIDAT}>{translate(t, "import_entrees", "Entrées")}</option>
            <option value="MorasalatEntrante">{translate(t, "import_correspondances_entrantes", "Correspondances entrantes")}</option>
            <option value="MorasalatSortante">{translate(t, "import_correspondances_sortantes", "Correspondances sortantes")}</option>
          </select>

          <label className="btn-secondary import-label icon-only-button" data-tooltip={importing ? t("import_en_cours") : t("importer_excel")} aria-label={importing ? t("import_en_cours") : t("importer_excel")}>
            <ActionIcon name="upload" />

            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>

      <table className="modern-table registry-table">
        <thead>
          <tr>
            <th className="selection-column">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleVisibleSelection}
                aria-label={t("selectionner")}
              />
            </th>
            <th>{t("numero_bureau_ordre")}</th>
            <th>{t("type_document")}</th>
            <th>{t("liaison")}</th>
            <th>{t("date")}</th>
            <th>{t("source")}</th>
            <th>{t("objet")}</th>
            <th>{t("destinataire")}</th>
            <th>{t("service")}</th>
            <th>{t("etat")}</th>
            <th>{t("transmissible")}</th>
            <th>{t("pdf")}</th>
            <th>{t("morasalat_entrantes")}</th>
            <th>{t("actions")}</th>
          </tr>
        </thead>

        <tbody>
          {visibleCourriers.length === 0 ? (
            <tr>
              <td colSpan="14" style={{ textAlign: "center" }}>
                {t("aucun_registre")}
              </td>
            </tr>
          ) : (
            visibleCourriers.map((courrier) => {
              const actionState = getAdministrativeActionState(courrier, allCourriers, sentAdministrativeDocumentIds);
              const morasalatResponse = findMorasalatResponse(courrier, allCourriers);

              return (
              <tr key={courrier.id}>
                <td className="selection-column">
                  <input
                    type="checkbox"
                    className="row-select-checkbox"
                    checked={selectedExportIdSet.has(String(courrier.id))}
                    onChange={() => toggleCourrierSelection(courrier.id)}
                    aria-label={t("selectionner")}
                  />
                </td>
                <td>{getDisplayIdBureauOrdre(courrier, allCourriers)}</td>
                <td>
                  <span className={getRegistreBadgeClass(courrier)}>
                    {formatRegistre(courrier, t)}
                  </span>
                </td>
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
                  {morasalatResponse ? (
                    <button
                      type="button"
                      onClick={() => handleConsult(morasalatResponse)}
                      title={t("consulter")}
                      aria-label={t("consulter")}
                      className="btn-secondary"
                    >
                      {t("morasalat_entrantes")}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="action-icons">
                  {actionState.canAddLinkedMorasalat && (
                    <button
                      type="button"
                      onClick={() => handleAddMorasalat(courrier)}
                      title={t("ajouter_morasalat")}
                      aria-label={t("ajouter_morasalat")}
                      className="action-icon action-link-record"
                    >
                      <ActionIcon name="link" />
                    </button>
                  )}

                  {actionState.canAddResponse && (
                    <button
                      type="button"
                      onClick={() => handleAddMorasalatResponse(courrier)}
                      title={t("ajouter_reponse")}
                      aria-label={t("ajouter_reponse")}
                      className="action-icon action-reply"
                    >
                      <ActionIcon name="reply" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleConsult(courrier)}
                    title={t("consulter")}
                    aria-label={t("consulter")}
                    className="action-icon action-view"
                  >
                    <ActionIcon name="view" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(courrier)}
                    title={t("modifier")}
                    aria-label={t("modifier")}
                    className="action-icon action-edit"
                  >
                    <ActionIcon name="edit" />
                  </button>

                  {actionState.canTransfer && (
                    <button
                      type="button"
                      onClick={() => openTransferModal(courrier)}
                      disabled={actionState.transferAlreadySent}
                      title={actionState.transferAlreadySent ? translate(t, "document_deja_transmis", "Ce dossier a deja ete transmis par ce service.") : t("transferer")}
                      aria-label={actionState.transferAlreadySent ? translate(t, "document_deja_transmis", "Ce dossier a deja ete transmis par ce service.") : t("transferer")}
                      className="action-icon action-transfer"
                    >
                      <ActionIcon name="transfer" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleArchive(courrier.id)}
                    title={t("archiver")}
                    aria-label={t("archiver")}
                    className="action-icon action-archive"
                  >
                    <ActionIcon name="archive" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(courrier.id)}
                    title={t("supprimer")}
                    aria-label={t("supprimer")}
                    className="action-icon action-delete"
                  >
                    <ActionIcon name="delete" />
                  </button>
                </td>
              </tr>
              );
            })
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
            className="choice-pill active"
            onClick={openFichiersAdministratifs}
          >
            {t("fichiers_administratifs")}
          </button>

          <button
            type="button"
            className="choice-pill"
            onClick={openWaridatAdministratives}
          >
            {t("waridat_administratives")}
          </button>

          <button
            type="button"
            className="choice-pill"
            onClick={openMorasalatAdministratives}
          >
            {t("morasalat_administratives")}
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
          className="choice-pill"
          onClick={openFichiersAdministratifs}
        >
          {t("fichiers_administratifs")}
        </button>

        <button
          type="button"
          className={
            form.typeRegistre === TYPE_WARIDAT
              ? "choice-pill active"
              : "choice-pill"
          }
          onClick={openWaridatAdministratives}
        >
          {t("waridat_administratives")}
        </button>

        <button
          type="button"
          className={
            form.typeRegistre === TYPE_MORASALAT
              ? "choice-pill active"
              : "choice-pill"
          }
          onClick={openMorasalatAdministratives}
        >
          {t("morasalat_administratives")}
        </button>
      </div>

      <h2 className="page-title">{formatFormTitle(form, t)}</h2>

      {/* Affichage des messages d'erreur et de succès */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* ======================================================
          FORMULAIRE D'AJOUT / MODIFICATION
      ====================================================== */}
      {isEditModalOpen && <div className="modal-overlay" onClick={resetForm} />}
      <div
        className={isEditModalOpen ? "modal form-card edit-modal" : "form-card"}
        onClick={isEditModalOpen ? (event) => event.stopPropagation() : undefined}
      >
        <h3>
          {isMorasalatResponseMode && !editingId
            ? t("ajouter_reponse")
            : `${editingId ? t("modifier") : t("ajouter")} ${formatFormTitle(form, t)}`}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className={isMorasalatResponseMode ? "form-grid morasalat-response-grid" : isStructuredAdminForm ? "form-grid waridat-grid" : "form-grid"}>
            {/* Numéro de bureau d'ordre */}
            {isMorasalatResponseMode ? (
              <div className="form-field response-id-field">
                <label>{t("numero_bureau_ordre")} *</label>
                <input
                  type="text"
                  value={displayedIdBureauOrdre || t("numero_pris_depuis_warida")}
                  readOnly
                />
              </div>
            ) : showIdBureauOrdreInput ? (
              <div className="form-field">
                <label>{t("numero_bureau_ordre")} *</label>
                <input
                  type="text"
                  name="idBureauOrdre"
                  value={form.idBureauOrdre}
                  onChange={handleChange}
                  onBlur={handleIdBureauOrdreBlur}
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

            {isStructuredAdminForm && !isMorasalatResponseMode && (
              <div className="form-field">
                <label>{t("numero_initial")}</label>
                <input
                  type="text"
                  name="numeroDeCourrier"
                  value={form.numeroDeCourrier}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Date */}
            {isMorasalatResponseMode ? (
              <div className="form-field response-date-field">
                <label>{t("date")} *</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </div>
            ) : isStructuredAdminForm ? (
              <>
                <div className="form-field">
                  <label>{t("date_message")} *</label>
                  <input
                    type="date"
                    name="dateMessage"
                    value={form.dateMessage}
                    onChange={handleChange}
                    required
                  />
                </div>

                {form.typeRegistre === TYPE_WARIDAT && (
                  <div className="form-field">
                    <label>{t("date_arrivee")} *</label>
                    <input
                      type="date"
                      name="dateArrivee"
                      value={form.dateArrivee}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}
              </>
            ) : (
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
            )}

            {isMorasalatResponseMode && (
              <div className="form-field response-destinataire-field">
                <label>{t("destinataire")}</label>
                <input
                  type="text"
                  name="destinataire"
                  value={form.destinataire}
                  onChange={handleChange}
                  placeholder={t("placeholder_destinataire")}
                />
              </div>
            )}

            {/* Source */}
            {!isMorasalatResponseMode && (
            <div className={isStructuredAdminForm ? "form-field waridat-source-field" : "form-field"}>
              <label>
                {isMorasalat || form.typeRegistre === TYPE_WARIDAT ? t("expediteur") : t("source")}{" "}
                *
              </label>
              {isStructuredAdminForm ? (
                <>
                  <input
                    type="text"
                    name="source"
                    list="administrative-source-options"
                    value={form.source}
                    onChange={handleChange}
                    placeholder={t("placeholder_source")}
                    required
                  />
                  <datalist id="administrative-source-options">
                    {sourceOptions.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </datalist>
                </>
              ) : (
                <input
                  type="text"
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  placeholder={t("placeholder_source")}
                  required
                />
              )}
            </div>
            )}

            {/* Sujet */}
            <div className={isMorasalatResponseMode ? "form-field response-result-field" : isStructuredAdminForm ? "form-field waridat-sujet-field" : "form-field"}>
              <label>
                {isMorasalatResponseMode ? t("reponse_resultat") : t("objet")}{" "}
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

            {isMorasalatResponseMode && (
              <div className="form-field response-status-field">
                <label>{t("resultat")}</label>
                <input
                  type="text"
                  name="etat"
                  value={form.etat}
                  onChange={handleChange}
                  placeholder={t("placeholder_resultat")}
                />
              </div>
            )}

            {/* Destinataire */}
            {!isMorasalatResponseMode && (
            <div className={isStructuredAdminForm ? "form-field waridat-destinataire-field" : "form-field"}>
              <label>{t("destinataire")}</label>
              <input
                type="text"
                name="destinataire"
                value={form.destinataire}
                onChange={handleChange}
                placeholder={t("placeholder_destinataire")}
              />
            </div>
            )}

            {/* Service */}
            {!isMorasalatResponseMode && (
            <div className={isStructuredAdminForm ? "form-field waridat-service-field" : "form-field"}>
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
            )}

            {/* État */}
            {!isMorasalatResponseMode && (
            <div className={isStructuredAdminForm ? "form-field waridat-etat-field" : "form-field"}>
              <label>{t("etat")}</label>
              <select name="etat" value={form.etat} onChange={handleChange}>
                {etatOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            )}

            {/* Numéro interne */}
            <div className={isStructuredAdminForm ? "form-field waridat-numero-hidden" : "form-field"}>
              <label>{t("numero_interne")}</label>
              <input
                type="text"
                name="numeroDeCourrier"
                value={form.numeroDeCourrier}
                onChange={handleChange}
              />
            </div>

            {/* Document PDF / Word */}
            {!isMorasalatResponseMode && (
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

              </div>
            </div>
            )}

            {/* Transmissible */}
            <div className={isStructuredAdminForm ? "form-field waridat-transmissible-field" : "form-field"}>
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

            {/* Description */}
            {!isMorasalatResponseMode && (
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
            )}
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

            {isMorasalat && !isMorasalatResponseMode && (
              <button
                type="button"
                className="btn-secondary"
                onClick={showMorasalatResponseFields}
              >
                {t("ajouter_reponse")}
              </button>
            )}

            {(editingId || isEditModalOpen) && (
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
        </div>

        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-row">
              <input
                type="text"
                value={motCle}
                onChange={(e) => {
                  setMotCle(e.target.value);
                  clearExportSelection();
                }}
                placeholder={t("placeholder_recherche_courriers")}
              />

              <input
                type="date"
                value={dateRecherche}
                onChange={(e) => {
                  setDateRecherche(e.target.value);
                  clearExportSelection();
                }}
              />
            </div>

            <div className="search-control-row">
              <div className="filter-chip-group" aria-label={t("type_document")}>
                <button
                  type="button"
                  className={registreFilter === "all" ? "filter-chip active" : "filter-chip"}
                  onClick={() => {
                    setMotCle("");
                    setDateRecherche("");
                    setRegistreFilter("all");
                    setSelectedExportIds(allCourriers.map((courrier) => courrier.id).filter(Boolean));
                  }}
                >
                  {t("tous")}
                </button>

                <button
                  type="button"
                  className={registreFilter === TYPE_WARIDAT ? "filter-chip active" : "filter-chip"}
                  onClick={() => {
                    setRegistreFilter(TYPE_WARIDAT);
                    clearExportSelection();
                  }}
                >
                  {t("waridat_administratives")}
                </button>

                <button
                  type="button"
                  className={registreFilter === TYPE_MORASALAT ? "filter-chip active" : "filter-chip"}
                  onClick={() => {
                    setRegistreFilter(TYPE_MORASALAT);
                    clearExportSelection();
                  }}
                >
                  {t("morasalat_administratives")}
                </button>
              </div>

              <span className="selection-summary">
                {t("selection_count", { count: selectedExportIds.length })}
              </span>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setMotCle("");
                  setDateRecherche("");
                  setRegistreFilter("all");
                  clearExportSelection();
                  fetchCourriers();
                }}
              >
                {t("reinitialiser")}
              </button>
            </div>
          </form>
        </div>

        {renderCourriersTable()}
      </div>

      {consultedDocument && (
        <DocumentModal
          document={consultedDocument}
          onClose={() => setConsultedDocument(null)}
        />
      )}

      {selectedTransferItem && (
        <>
          <div className="modal-overlay" onClick={closeTransferModal} />
          <div
            className="modal form-card transfer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="registry-panel-header">
              <div>
                <h3>{t("transferer")}</h3>
                <p>
                  {formatRegistre(selectedTransferItem, t)} -{" "}
                  {getDisplayIdBureauOrdre(selectedTransferItem, allCourriers)} -{" "}
                  {selectedTransferItem.sujet || "-"}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeTransferModal}
              >
                {t("fermer")}
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleTransferSubmit}>
              <div className="transfer-form-layout">
                <div className="form-field full-width">
                  <label>{translate(t, "mode_transfert", "Mode de transfert")}</label>
                  <div className="filter-chip-group">
                    <button
                      type="button"
                      className={transferForm.mode === "single" ? "filter-chip active" : "filter-chip"}
                      onClick={() => handleTransferModeChange("single")}
                    >
                      {translate(t, "transfert_service_unique", "Un seul service")}
                    </button>
                    <button
                      type="button"
                      className={transferForm.mode === "multiple" ? "filter-chip active" : "filter-chip"}
                      onClick={() => handleTransferModeChange("multiple")}
                    >
                      {translate(t, "transfert_plusieurs_services", "Plusieurs services")}
                    </button>
                  </div>
                </div>

                <div className="form-field full-width">
                  <label>{t("service_destinataire")} *</label>
                  {transferForm.mode === "single" ? (
                    <select
                      name="serviceId"
                      value={transferForm.serviceId}
                      onChange={handleTransferServiceChange}
                      required
                    >
                      <option value="">-- {t("selectionner_service")} --</option>
                      {services
                        .filter(
                          (service) =>
                            Number(service.idService) !==
                            Number(selectedTransferItem.idService)
                        )
                        .map((service) => (
                          <option key={service.idService} value={service.idService}>
                            {service.nomService}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="transfer-service-picker">
                      <div className="service-panel available-services-panel">
                        <div className="service-panel-header">
                          <strong>{translate(t, "services_disponibles", "Services disponibles")}</strong>
                          <span>
                            {services.filter((service) =>
                              Number(service.idService) !== Number(selectedTransferItem.idService) &&
                              !transferForm.serviceIds.includes(String(service.idService)) &&
                              service.nomService?.toLowerCase().includes(transferServiceSearch.trim().toLowerCase())
                            ).length}
                          </span>
                        </div>
                        <input
                          className="service-search-input"
                          value={transferServiceSearch}
                          onChange={(event) => setTransferServiceSearch(event.target.value)}
                          placeholder={translate(t, "rechercher_service", "Rechercher un service")}
                        />
                        <div className="available-service-list">
                          {services
                            .filter(
                              (service) =>
                                Number(service.idService) !== Number(selectedTransferItem.idService) &&
                                !transferForm.serviceIds.includes(String(service.idService)) &&
                                service.nomService?.toLowerCase().includes(transferServiceSearch.trim().toLowerCase())
                            )
                            .map((service) => (
                              <button
                                key={service.idService}
                                type="button"
                              className="available-service-option"
                              onClick={() => handleTransferServiceToggle(service.idService)}
                            >
                              <span>{service.nomService}</span>
                            </button>
                            ))}
                        </div>
                      </div>

                      <div className="service-panel selected-services-panel">
                        <div className="service-panel-header">
                          <strong>{translate(t, "services_selectionnes", "Services sélectionnés")}</strong>
                          <span>{transferForm.serviceIds.length}</span>
                        </div>
                        {transferForm.serviceIds.length === 0 ? (
                          <div className="empty-selected-services">
                            {translate(t, "aucun_service_selectionne", "Aucun service sélectionné")}
                          </div>
                        ) : (
                          <div className="selected-service-list">
                            {transferForm.serviceIds.map((serviceId) => {
                              const service = services.find((item) => String(item.idService) === String(serviceId));
                              return (
                                <button
                                  key={serviceId}
                                  type="button"
                                  className="selected-service-chip"
                                  onClick={() => handleTransferServiceToggle(serviceId)}
                                  title={t("supprimer")}
                                >
                                  <span>{service?.nomService || serviceId}</span>
                                  <span className="remove-service-mark" aria-hidden="true">×</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {(transferForm.mode === "single"
                  ? isConseillerRapporteurService(transferForm.serviceId)
                  : transferForm.serviceIds.some(isConseillerRapporteurService)) && (
                  <ConseillerRapporteurSelect
                    serviceId={15}
                    value={transferForm.destinationUserId}
                    onChange={(destinationUserId) => setTransferForm((prev) => ({ ...prev, destinationUserId }))}
                    t={t}
                    required
                  />
                )}

                <div className="transfer-options-row">
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
                </div>

                <div className="form-field full-width">
                  <label>{t("message")}</label>
                  <textarea
                    name="message"
                    value={transferForm.message}
                    onChange={handleTransferChange}
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {t("envoyer")}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeTransferModal}
                >
                  {t("annuler")}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
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
    dateMessage: "",
    dateArrivee: "",
    source: "",
    sujet: "",
    destinataire: [TYPE_WARIDAT, TYPE_MORASALAT].includes(typeRegistre) ? DESTINATAIRE_WARIDAT_DEFAULT : "",
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
    estTransmissible: true,
  };
}

function getInitialTransferForm(serviceId = "") {
  return {
    serviceId,
    serviceIds: [],
    mode: "single",
    destinationUserId: "",
    dateEnvoi: new Date().toISOString().slice(0, 10),
    doitRevenir: false,
    message: "",
  };
}


// ==========================================================
// BLOC 30 : SERVICE PAR DÉFAUT
// ==========================================================
// Retourne l'id du premier service si la liste existe.

function getDefaultServiceId(services) {
  return services.length > 0 ? services[0].idService : "";
}

function getDefaultTransferServiceId(courrier, services = []) {
  const sourceServiceId = Number(courrier?.idService || 0);
  const service = services.find(
    (item) => Number(item.idService) !== sourceServiceId
  );

  return service?.idService || "";
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

  if (!getEffectiveDate(form)) return t("erreur_date_requise");
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

function getEffectiveDate(form) {
  if (
    form.typeRegistre === TYPE_MORASALAT &&
    form.typeCorrespondance === CORRESPONDANCE_ENTRANTE
  ) {
    return form.date || form.dateArrivee || form.dateMessage;
  }

  if ([TYPE_WARIDAT, TYPE_MORASALAT].includes(form.typeRegistre)) {
    return form.dateArrivee || form.dateMessage || form.date;
  }

  return form.date;
}


// ==========================================================
// BLOC 33 : TITRE DU FORMULAIRE
// ==========================================================
// Retourne le titre affiché dans le formulaire.

function formatFormTitle(form, t) {
  if (form.typeRegistre === TYPE_WARIDAT) return t("waridat_administratives");
  if (
    form.typeRegistre === TYPE_MORASALAT &&
    form.typeCorrespondance === CORRESPONDANCE_ENTRANTE
  ) {
    return t("ajouter_reponse");
  }

  return t("morasalat_administratives");
}

function filterCourriers(courriers, motCle, dateRecherche, registreFilter = "all") {
  const keyword = normalizeSearchText(motCle);

  return courriers.filter((courrier) => {
    const matchesRegistre =
      registreFilter === "all" || courrier.typeRegistre === registreFilter;
    const matchesDate = !dateRecherche || toDateInputValue(courrier.date) === dateRecherche;
    const matchesKeyword =
      !keyword ||
      [
        courrier.id,
        courrier.idBureauOrdre,
        courrier.numeroDeCourrier,
        courrier.source,
        courrier.sujet,
        courrier.destinataire,
        courrier.description,
        courrier.etat,
        courrier.direction,
        courrier.typeRegistre,
        courrier.typeCorrespondance,
        courrier.serviceNom,
        courrier.idService,
        courrier.lienPdf,
        courrier.parentId
      ].some((value) => normalizeSearchText(value).includes(keyword));

    return matchesRegistre && matchesDate && matchesKeyword;
  });
}

function getVisibleAdministrativeRows(filteredCourriers, allCourriers) {
  const visibleById = new Map();

  filteredCourriers.forEach((courrier) => {
    if (!isMorasalatResponse(courrier)) {
      visibleById.set(String(courrier.id), courrier);
      return;
    }

    const parent = findMorasalatParent(courrier, allCourriers);
    if (parent) {
      visibleById.set(String(parent.id), parent);
    }
  });

  return Array.from(visibleById.values())
    .sort((a, b) => getTime(b.date) - getTime(a.date));
}

function findMorasalatParent(response, courriers = []) {
  if (!response?.parentId) return null;
  return courriers.find((item) => String(item.id) === String(response.parentId)) || null;
}

function findMorasalatResponse(courrier, courriers = []) {
  if (!isMainMorasalat(courrier)) return null;

  return courriers
    .filter((item) =>
      String(item.parentId || "") === String(courrier.id || "") &&
      isMorasalatResponse(item)
    )
    .sort((a, b) => getTime(b.date) - getTime(a.date))[0] || null;
}

function getTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function formatBureauOrdreWithCurrentYear(value) {
  const currentYear = new Date().getFullYear().toString();
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (trimmed.includes("/")) {
    const [numberPart, yearPart] = trimmed.split("/").map((part) => part.trim());
    const number = numberPart.replace(/\D/g, "");
    const year = (yearPart || currentYear).replace(/\D/g, "").slice(0, 4) || currentYear;
    return number ? `${number}/${year}` : trimmed;
  }

  const number = trimmed.replace(/\D/g, "");
  return number ? `${number}/${currentYear}` : trimmed;
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

function getRegistreBadgeClass(courrier) {
  if (courrier.typeRegistre === TYPE_MORASALAT) {
    return courrier.typeCorrespondance === CORRESPONDANCE_ENTRANTE
      ? "registre-badge registre-badge-reponse"
      : "registre-badge registre-badge-morasalat";
  }

  return "registre-badge registre-badge-waridat";
}


// ==========================================================
// BLOC 35 : FORMATAGE DE L'ÉTAT
// ==========================================================
// Convertit l'état stocké dans la base en texte arabe.

function formatEtat(etat, t) {
  if (etat === "En cours") return t("etat_en_cours");
  if (etat === "Traite" || etat === "Traité") return t("etat_traite");
  if (etat === "Archive" || etat === "Archivé") return t("etat_archive");
  if (etat && etat !== "Nouveau") return etat;

  return t("etat_nouveau");
}

function getDefaultCourrierEtatOptions(t) {
  return [
    { value: "Nouveau", label: t("etat_nouveau") },
    { value: "En cours", label: t("etat_en_cours") },
    { value: "Traite", label: t("etat_traite") },
    { value: "Archive", label: t("etat_archive") },
  ];
}

function buildAdministrativeSelectionWorkbook(courriers, allCourriers, t) {
  const rows = buildAdministrativeExportRows(courriers, allCourriers, t);
  const emptyRowsCount = Math.max(0, 12 - rows.length);
  const emptyRows = Array.from({ length: emptyRowsCount }, () =>
    "<tr>" + Array.from({ length: 12 }, () => "<td></td>").join("") + "</tr>"
  ).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; direction: rtl; width: 100%; font-family: Arial, sans-serif; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; vertical-align: middle; mso-number-format:"\\@"; }
    .top { background: #0f6d7d; color: #fff; font-weight: 700; }
    .sub, .head { background: #cfeef7; font-weight: 700; }
    .data td { background: #f2f2f2; }
  </style>
</head>
<body>
  <table>
    <tr>
      <th class="top" colspan="6">الواردات الإدارية</th>
      <th class="top" colspan="6">المراسلات الإدارية</th>
    </tr>
    <tr>
      <th class="sub" colspan="6"></th>
      <th class="sub" colspan="3">الصادرة</th>
      <th class="sub" colspan="2">الواردة</th>
      <th class="sub" rowspan="2">النتيجة</th>
    </tr>
    <tr>
      <th class="head">الرقم الترتيبي</th>
      <th class="head">تاريخ الرسالة</th>
      <th class="head">رقمها</th>
      <th class="head">تاريخ الوصول</th>
      <th class="head">اسم و موطن المرسل إليه</th>
      <th class="head">الموضوع</th>
      <th class="head">التاريخ</th>
      <th class="head">المرسل إليه</th>
      <th class="head">الموضوع</th>
      <th class="head">التاريخ</th>
      <th class="head">المصدر والجواب</th>
    </tr>
    ${rows.join("")}
    ${emptyRows}
  </table>
</body>
</html>`;
}

function buildAdministrativeExportRows(courriers, allCourriers, t) {
  const rows = [];
  const seen = new Set();

  courriers.forEach((courrier) => {
    const rowData = getAdministrativeExportRowData(courrier, allCourriers);
    const key = [
      rowData.warida?.id || "",
      rowData.morasala?.id || "",
      rowData.response?.id || ""
    ].join(":");

    if (seen.has(key)) return;
    seen.add(key);
    rows.push(buildAdministrativeSelectionRow(rowData, allCourriers, t));
  });

  return rows;
}

function getAdministrativeExportRowData(courrier, allCourriers) {
  if (isMorasalatResponse(courrier)) {
    const morasala = findMorasalatParent(courrier, allCourriers);
    return {
      warida: morasala?.parentId ? findMorasalatParent(morasala, allCourriers) : null,
      morasala,
      response: courrier
    };
  }

  if (isMainMorasalat(courrier)) {
    return {
      warida: courrier.parentId ? findMorasalatParent(courrier, allCourriers) : null,
      morasala: courrier,
      response: findMorasalatResponse(courrier, allCourriers)
    };
  }

  const linkedMorasala = findLinkedMorasala(courrier, allCourriers);

  return {
    warida: courrier,
    morasala: linkedMorasala,
    response: linkedMorasala ? findMorasalatResponse(linkedMorasala, allCourriers) : null
  };
}

function findLinkedMorasala(courrier, courriers = []) {
  return courriers
    .filter((item) =>
      String(item.parentId || "") === String(courrier.id || "") &&
      isMainMorasalat(item)
    )
    .sort((a, b) => getTime(b.date) - getTime(a.date))[0] || null;
}

function buildAdministrativeSelectionRow({ warida, morasala, response }, allCourriers, t) {
  const cells = Array.from({ length: 12 }, () => "");

  if (warida) {
    const displayNumber = getDisplayIdBureauOrdre(warida, allCourriers);
    cells[0] = displayNumber;
    cells[1] = formatExcelDate(warida.dateMessage || warida.date);
    cells[2] = warida.numeroDeCourrier || "";
    cells[3] = formatExcelDate(warida.dateArrivee || warida.date);
    cells[4] = warida.source || "";
    cells[5] = warida.sujet || "";
  }

  if (morasala) {
    cells[0] = cells[0] || getDisplayIdBureauOrdre(morasala, allCourriers);
    cells[6] = formatExcelDate(morasala.dateMessage || morasala.date);
    cells[7] = morasala.destinataire || "";
    cells[8] = morasala.sujet || "";
  }

  if (response) {
    cells[0] = cells[0] || getDisplayIdBureauOrdre(response, allCourriers);
    cells[9] = formatExcelDate(response.dateMessage || response.date);
    cells[10] = [response.source, response.sujet].filter(Boolean).join(" | ");
  }

  const statusSource = response || morasala || warida;
  cells[11] = statusSource ? formatEtat(statusSource.etat, t) : "";

  return `<tr class="data">${cells.map((value) => `<td>${escapeExcelHtml(value)}</td>`).join("")}</tr>`;
}

function formatExcelDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR");
}

function escapeExcelHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function isMainMorasalat(courrier) {
  const typeRegistre =
    courrier.typeRegistre || (courrier.parentId ? TYPE_MORASALAT : TYPE_WARIDAT);

  return (
    typeRegistre === TYPE_MORASALAT &&
    courrier.typeCorrespondance !== CORRESPONDANCE_ENTRANTE
  );
}

function isMorasalatResponse(courrier) {
  const typeRegistre =
    courrier.typeRegistre || (courrier.parentId ? TYPE_MORASALAT : TYPE_WARIDAT);

  return (
    typeRegistre === TYPE_MORASALAT &&
    courrier.typeCorrespondance === CORRESPONDANCE_ENTRANTE
  );
}

function hasMorasalatResponse(courrier, courriers = []) {
  return courriers.some(
    (item) =>
      String(item.parentId || "") === String(courrier.id || "") &&
      isMorasalatResponse(item)
  );
}

function getAdministrativeActionState(courrier, courriers = [], sentDocumentIds = new Set()) {
  const canAddLinkedMorasalat = isMainWaridat(courrier);
  const canAddResponse =
    isMainMorasalat(courrier) && !hasMorasalatResponse(courrier, courriers);
  const canTransfer = canTransferAdministrative(courrier, sentDocumentIds);
  const transferAlreadySent = sentDocumentIds.has(String(courrier?.id));

  return {
    canAddLinkedMorasalat,
    canAddResponse,
    canTransfer,
    transferAlreadySent,
  };
}

function canTransferAdministrative(courrier) {
  return Boolean(courrier?.id);
}

function isPendingTransactionStatus(statut) {
  const value = String(statut || "").toLowerCase();
  return value === "enattente" || value === "en attente" || value === "pending";
}

function getDisplayIdBureauOrdre(courrier, courriers = []) {
  if (courrier.idBureauOrdre) return courrier.idBureauOrdre;

  let current = courrier;
  const visited = new Set();

  while (current?.parentId && !visited.has(String(current.id))) {
    visited.add(String(current.id));
    const parent = courriers.find((item) => String(item.id) === String(current.parentId));

    if (!parent) return "-";
    if (parent.idBureauOrdre) return parent.idBureauOrdre;

    current = parent;
  }

  return "-";
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
    ? `${ABP_API_URL}${normalizedValue}`
    : normalizedValue;
}


// ==========================================================
// BLOC 39 : RÉCUPÉRER LE NOM DU DOCUMENT
// ==========================================================
// Cette fonction récupère seulement le nom du fichier depuis son chemin.

function getDocumentName(value) {
  if (!value) return "";

  const cleanValue = String(value).split("?")[0].split("#")[0];
  const fileName = decodeURIComponent(
    cleanValue.split("/").filter(Boolean).pop() || cleanValue
  );

  return fileName.replace(/^\d{17}-[a-f0-9]{32}-/i, "");
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

