import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ActeursJudiciaires() {
  const [items, setItems] = useState([]);
  const [motCle, setMotCle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = motCle.trim()
        ? `/api/acteursjudiciaires/search?motCle=${encodeURIComponent(motCle.trim())}`
        : '/api/acteursjudiciaires';
      const res = await axios.get(url);
      setItems(res.data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Erreur chargement des acteurs et messageries judiciaires'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchItems, 250);
    return () => clearTimeout(timeout);
  }, [motCle]);

  const consulterDossier = async (item) => {
    setDetailLoading(true);
    setError('');

    try {
      const res = await axios.get(`/api/acteursjudiciaires/${item.id}`);
      setSelectedDossier(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Erreur chargement du dossier judiciaire'));
    } finally {
      setDetailLoading(false);
    }
  };

  const fermerConsultation = () => {
    setSelectedDossier(null);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Acteurs et messageries judiciaires</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <input
          type="text"
          value={motCle}
          onChange={e => setMotCle(e.target.value)}
          placeholder="Rechercher par tribunal, sujet, destinataire, emplacement, etat"
        />
        <button type="button" className="btn-secondary" onClick={() => setMotCle('')}>Reinitialiser</button>
      </div>

      <div className="data-table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Tribunal / Source</th>
              <th>N dossier</th>
              <th>Objet</th>
              <th>Direction</th>
              <th>Destinataire</th>
              <th>Service</th>
              <th>Transmissible</th>
              <th>Etat</th>
              <th>Emplacement</th>
              <th>Retraits</th>
              <th>PDF</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="13">Chargement...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="13">Aucun element judiciaire trouve.</td></tr>
            ) : (
              items.map(item => (
                <tr key={item.id}>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.tribunalSource || '-'}</td>
                  <td>{item.numeroDossier || '-'}</td>
                  <td>{item.sujet || '-'}</td>
                  <td>{item.direction || '-'}</td>
                  <td>{item.destinataire || '-'}</td>
                  <td>{item.serviceNom || item.idService || '-'}</td>
                  {/* Le backend renvoie EstTransmissible sous forme estTransmissible. */}
                  <td>{item.estTransmissible ? 'Oui' : 'Non'}</td>
                  <td>{item.etatArchive || '-'}</td>
                  <td>{item.emplacement || '-'}</td>
                  <td>{item.retraitsCount ?? 0}</td>
                  <td>{item.lienPdf ? <a href={item.lienPdf} target="_blank" rel="noreferrer">PDF</a> : '-'}</td>
                  <td>
                    <button type="button" className="btn-secondary" onClick={() => consulterDossier(item)}>
                      Consulter
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailLoading && <div className="success-message">Chargement du dossier...</div>}
      {selectedDossier && (
        <DossierJudiciaireDetail dossier={selectedDossier} onClose={fermerConsultation} />
      )}
    </div>
  );
}

function DossierJudiciaireDetail({ dossier, onClose }) {
  const retraits = dossier.retraits || [];

  return (
    <div className="details-panel">
      <div className="details-panel-header">
        <div>
          <h2>Dossier judiciaire</h2>
          <p>{dossier.numeroDossier || 'Sans numero de dossier'}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onClose}>Fermer</button>
      </div>

      <div className="details-grid">
        <DetailItem label="Date" value={formatDate(dossier.date)} />
        <DetailItem label="Tribunal / Source" value={dossier.tribunalSource} />
        <DetailItem label="Objet" value={dossier.sujet} />
        <DetailItem label="Direction" value={dossier.direction} />
        <DetailItem label="Destinataire" value={dossier.destinataire} />
        <DetailItem label="Service" value={dossier.serviceNom || dossier.idService} />
        <DetailItem label="Etat" value={dossier.etatArchive} />
        <DetailItem label="Emplacement" value={dossier.emplacement} />
        <DetailItem label="Transmissible" value={dossier.estTransmissible ? 'Oui' : 'Non'} />
        <DetailItem label="Bureau d'ordre" value={dossier.idBureauOrdre} />
        <DetailItem
          label="PDF"
          value={dossier.lienPdf ? <a href={dossier.lienPdf} target="_blank" rel="noreferrer">Ouvrir le PDF</a> : '-'}
        />
      </div>

      <div className="details-section">
        <h3>Description</h3>
        <p>{dossier.description || '-'}</p>
      </div>

      <div className="details-section">
        <h3>Retraits</h3>
        {retraits.length === 0 ? (
          <p>Aucun retrait enregistre.</p>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>Date retrait</th>
                <th>Motif</th>
                <th>Effectue par</th>
                <th>Date retour</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {retraits.map((retrait) => (
                <tr key={retrait.id}>
                  <td>{formatDate(retrait.dateDeRetrait)}</td>
                  <td>{retrait.motifDeRetrait || '-'}</td>
                  <td>{retrait.effectuePar || '-'}</td>
                  <td>{formatDate(retrait.dateDeRetour)}</td>
                  <td>{retrait.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === 'string') return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  return fallback;
}

export default ActeursJudiciaires;
