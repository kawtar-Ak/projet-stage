import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ActeursJudiciaires() {
  const [items, setItems] = useState([]);
  const [motCle, setMotCle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
              <th>Etat</th>
              <th>Emplacement</th>
              <th>Retraits</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11">Chargement...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="11">Aucun element judiciaire trouve.</td></tr>
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
                  <td>{item.etatArchive || '-'}</td>
                  <td>{item.emplacement || '-'}</td>
                  <td>{item.retraitsCount ?? 0}</td>
                  <td>{item.lienPdf ? <a href={item.lienPdf} target="_blank" rel="noreferrer">PDF</a> : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
