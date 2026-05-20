import React, { useEffect, useState } from "react";
import axios from "axios";
import ActionIcon from "../components/ActionIcon";

function GererCourriers() {
  const [courriers, setCourriers] = useState([]);
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [motCle, setMotCle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [typeCourrier, setTypeCourrier] = useState("Administratif");

  const [form, setForm] = useState({
    idBureauOrdre: "",
    date: "",
    source: "",
    sujet: "",
    destinataire: "",
    description: "",
    etat: "Nouveau",
    lienPdf: "",
    direction: "Entrant",
    idService: "",
    numeroDeCourrier: 0,
    // Judicial specific fields
    tribunalSource: "",
    emplacement: "",
    numeroDossier: "",
  });

  useEffect(() => {
    fetchCourriers();
    fetchServices();
  }, [typeCourrier]);

  const fetchCourriers = async () => {
    try {
      const endpoint = typeCourrier === "Judiciaire" 
        ? "/api/courriers/judiciaires" 
        : "/api/courriers";
      const response = await axios.get(endpoint);
      setCourriers(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des courriers.");
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
      console.error(err);
      setError("Erreur lors du chargement des services.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]:
        name === "idService" || name === "numeroDeCourrier"
          ? Number(value)
          : value,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      idBureauOrdre: "",
      date: "",
      source: "",
      sujet: "",
      destinataire: "",
      description: "",
      etat: "Nouveau",
      lienPdf: "",
      direction: "Entrant",
      idService: services.length > 0 ? services[0].idService : "",
      numeroDeCourrier: 0,
      // Judicial specific fields
      tribunalSource: "",
      emplacement: "",
      numeroDossier: "",
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.sujet.trim()) {
      setError("L'objet du courrier est obligatoire.");
      return;
    }

    if (!form.idService) {
      setError("Le service concerné est obligatoire.");
      return;
    }

    try {
      let dataToSend;
      let endpoint;

      if (typeCourrier === "Judiciaire") {
        // Judicial letter data
        dataToSend = {
          idBureauOrdre: form.idBureauOrdre ? parseInt(form.idBureauOrdre) : null,
          date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          sujet: form.sujet,
          tribunalSource: form.tribunalSource || form.source,
          destinataire: form.destinataire,
          description: form.description,
          lienPdf: form.lienPdf,
          direction: form.direction,
          idService: Number(form.idService),
          emplacement: form.emplacement,
          numeroDossier: form.numeroDossier ? { numeroSujet: form.numeroDossier } : null,
        };
        endpoint = editingId 
          ? `/api/courriers/judiciaires/${editingId}` 
          : "/api/courriers/judiciaires";
      } else {
        // Administrative letter data
        if (!form.idBureauOrdre.trim()) {
          setError("Le numéro du bureau d'ordre est obligatoire.");
          return;
        }

        if (!form.date) {
          setError("La date de la lettre est obligatoire.");
          return;
        }

        if (!form.source.trim()) {
          setError("La source est obligatoire.");
          return;
        }

        dataToSend = {
          idBureauOrdre: form.idBureauOrdre,
          date: new Date(form.date).toISOString(),
          source: form.source,
          sujet: form.sujet,
          destinataire: form.destinataire,
          description: form.description,
          etat: form.etat,
          lienPdf: form.lienPdf,
          direction: form.direction,
          idService: Number(form.idService),
          numeroDeCourrier: Number(form.numeroDeCourrier || 0),
        };
        endpoint = editingId 
          ? `/api/courriers/${editingId}` 
          : "/api/courriers";
      }

      if (editingId) {
        await axios.put(endpoint, dataToSend);
        setSuccess("Courrier modifié avec succès.");
      } else {
        await axios.post(endpoint, dataToSend);
        setSuccess("Courrier ajouté avec succès.");
      }

      resetForm();
      fetchCourriers();
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Erreur lors de l'enregistrement.";

      setError(message);
    }
  };

  const handleEdit = (courrier) => {
    setEditingId(courrier.id);

    // Determine the type from the courrier data
    const courrierType = courrier.typeDocument || "Administratif";
    setTypeCourrier(courrierType);

    setForm({
      idBureauOrdre: courrier.idBureauOrdre ? String(courrier.idBureauOrdre) : "",
      date: courrier.date ? courrier.date.slice(0, 10) : "",
      source: courrier.source || "",
      sujet: courrier.sujet || "",
      destinataire: courrier.destinataire || "",
      description: courrier.description || "",
      etat: courrier.etat || "Nouveau",
      lienPdf: courrier.lienPdf || "",
      direction: courrier.direction || "Entrant",
      idService: courrier.idService || "",
      numeroDeCourrier: courrier.numeroDeCourrier || 0,
      // Judicial specific fields
      tribunalSource: courrier.source || "",
      emplacement: courrier.emplacement || "",
      numeroDossier: courrier.numeroDossier || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce courrier ?"
    );

    if (!confirmation) return;

    try {
      const endpoint = typeCourrier === "Judiciaire"
        ? `/api/courriers/judiciaires/${id}`
        : `/api/courriers/${id}`;
      await axios.delete(endpoint);
      setSuccess("Courrier supprimé avec succès.");
      fetchCourriers();
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.message ||
        "Erreur lors de la suppression du courrier.";

      setError(message);
    }
  };

  const handleArchive = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment archiver ce courrier ?"
    );

    if (!confirmation) return;

    try {
      const endpoint = typeCourrier === "Judiciaire"
        ? `/api/courriers/judiciaires/archiver/${id}`
        : `/api/courriers/archiver/${id}`;
      await axios.put(endpoint);
      setSuccess("Courrier archivé avec succès.");
      fetchCourriers();
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.message ||
        "Erreur lors de l'archivage du courrier.";

      setError(message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    try {
      if (!motCle.trim()) {
        fetchCourriers();
        return;
      }

      const endpoint = typeCourrier === "Judiciaire"
        ? `/api/courriers/judiciaires/search?motCle=${encodeURIComponent(motCle)}`
        : `/api/courriers/search?motCle=${encodeURIComponent(motCle)}`;

      const response = await axios.get(endpoint);

      setCourriers(response.data);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la recherche.");
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">
        Gestion des courriers {typeCourrier === "Judiciaire" ? "judiciaires" : "administratifs"}
      </h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Type de courrier selector */}
      <div className="form-card">
        <h3>Type de courrier</h3>
        <div className="form-field">
          <select
            value={typeCourrier}
            onChange={(e) => {
              setTypeCourrier(e.target.value);
              setEditingId(null);
              setMotCle("");
              resetForm();
            }}
          >
            <option value="Administratif">Courrier administratif</option>
            <option value="Judiciaire">Courrier judiciaire</option>
          </select>
        </div>
      </div>

      <div className="form-card">
        <h3>
          {editingId
            ? `Modifier un courrier ${typeCourrier === "Judiciaire" ? "judiciaire" : "administratif"}`
            : `Ajouter un courrier ${typeCourrier === "Judiciaire" ? "judiciaire" : "administratif"}`}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Numéro Bureau d’ordre *</label>
              <input
                type="text"
                name="idBureauOrdre"
                value={form.idBureauOrdre}
                onChange={handleChange}
                placeholder="Ex : 12/2026"
                required
              />
            </div>

            <div className="form-field">
              <label>Date de la lettre *</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Direction *</label>
              <select
                name="direction"
                value={form.direction}
                onChange={handleChange}
                required
              >
                <option value="Entrant">Courrier entrant</option>
                <option value="Sortant">Courrier sortant</option>
                <option value="Interne">Courrier interne</option>
              </select>
            </div>

            <div className="form-field">
              <label>Source / Expéditeur *</label>
              <input
                type="text"
                name="source"
                value={form.source}
                onChange={handleChange}
                placeholder="Ex : Ministère, tribunal, service..."
                required
              />
            </div>

            <div className="form-field">
              <label>Objet / Sujet *</label>
              <input
                type="text"
                name="sujet"
                value={form.sujet}
                onChange={handleChange}
                placeholder="Objet du courrier"
                required
              />
            </div>

            <div className="form-field">
              <label>Destinataire</label>
              <input
                type="text"
                name="destinataire"
                value={form.destinataire}
                onChange={handleChange}
                placeholder="Service ou personne destinataire"
              />
            </div>

            <div className="form-field">
              <label>Service concerné *</label>
              <select
                name="idService"
                value={form.idService}
                onChange={handleChange}
                required
              >
                <option value="">-- Choisir un service --</option>

                {services.map((service) => (
                  <option key={service.idService} value={service.idService}>
                    {service.nomService}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>État</label>
              <select name="etat" value={form.etat} onChange={handleChange}>
                <option value="Nouveau">Nouveau</option>
                <option value="En cours">En cours</option>
                <option value="Traité">Traité</option>
                <option value="Archivé">Archivé</option>
              </select>
            </div>

            <div className="form-field">
              <label>Numéro interne</label>
              <input
                type="number"
                name="numeroDeCourrier"
                value={form.numeroDeCourrier}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-field">
              <label>Lien PDF</label>
              <input
                type="text"
                name="lienPdf"
                value={form.lienPdf}
                onChange={handleChange}
                placeholder="Lien ou nom du fichier PDF"
              />
            </div>

            <div className="form-field full-width">
              <label>Observation / Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="Observation..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? "Modifier" : "Ajouter"}
            </button>

            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="form-card">
        <h3>Rechercher dans le registre</h3>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={motCle}
            onChange={(e) => setMotCle(e.target.value)}
            placeholder="Rechercher par numéro, source, objet, état..."
          />

          <button type="submit" className="btn-primary">
            Rechercher
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setMotCle("");
              fetchCourriers();
            }}
          >
            Réinitialiser
          </button>
        </form>
      </div>

      <div className="data-table-wrapper">
        <h3>Registre des courriers administratifs</h3>

        <table className="modern-table">
          <thead>
            <tr>
              <th>N° BO</th>
              <th>Date</th>
              <th>Source</th>
              <th>Objet</th>
              <th>Direction</th>
              <th>Destinataire</th>
              <th>Service</th>
              <th>État</th>
              <th>Observation</th>
              <th>PDF</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {courriers.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: "center" }}>
                  Aucun courrier trouvé.
                </td>
              </tr>
            ) : (
              courriers.map((courrier) => (
                <tr key={courrier.id}>
                  <td>{courrier.idBureauOrdre}</td>
                  <td>
                    {courrier.date
                      ? new Date(courrier.date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{courrier.source}</td>
                  <td>{courrier.sujet}</td>
                  <td>{courrier.direction}</td>
                  <td>{courrier.destinataire || "-"}</td>
                  <td>{courrier.serviceNom || courrier.idService}</td>
                  <td>{courrier.etat}</td>
                  <td>{courrier.description || "-"}</td>
                  <td>
                    {courrier.lienPdf ? (
                      <a
                        href={courrier.lienPdf}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Voir
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="action-icons">
                    <button onClick={() => handleEdit(courrier)} title="Modifier" aria-label="Modifier" className="action-icon action-edit"><ActionIcon name="edit" /></button>

                    <button onClick={() => handleArchive(courrier.id)} title="Archiver" aria-label="Archiver" className="action-icon action-archive"><ActionIcon name="archive" /></button>

                    <button onClick={() => handleDelete(courrier.id)} title="Supprimer" aria-label="Supprimer" className="action-icon action-delete"><ActionIcon name="delete" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GererCourriers;

