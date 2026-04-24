import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Registre() {
  // État global
  const [entrants, setEntrants] = useState([]);
  const [sortantsEemis, setSortantsEemis] = useState([]);
  const [reponsesRecues, setReponsesRecues] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    type: 'Administratif',
    direction: 'Entrant',
    date: '',
    sujet: '',
    source: '',
    destinataire: '',
    description: '',
    numeroCourrier: '',
    numeroDossier: '',
    idBureauOrdre: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const [mapping, setMapping] = useState({
    type: '', direction: '', date: '', sujet: '', source: '', destinataire: '',
    description: '', numero: '', idBureauOrdre: ''
  });

  // Récupération des données depuis l’API
  const fetchData = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (showArchive) params.archive = true;
      const res = await axios.get('/api/registre', { params });
      const all = res.data;

      // Trier selon la logique :
      // - Entrants : Direction === 'Entrant' ET ParentId == null (pas une réponse)
      // - Sortants émis : Direction === 'Sortant' ET ParentId == null
      // - Réponses reçues : Direction === 'Entrant' ET ParentId != null (réponse à un sortant émis)
      setEntrants(all.filter(r => r.direction === 'Entrant' && !r.parentId));
      setSortantsEemis(all.filter(r => r.direction === 'Sortant' && !r.parentId));
      setReponsesRecues(all.filter(r => r.direction === 'Entrant' && r.parentId));
    } catch (err) {
      setError('Erreur chargement registre');
    }
  };

  useEffect(() => {
    fetchData();
    const nomService = localStorage.getItem('nomService');
    setUserRole(nomService === 'Administrateur' ? 'admin' : 'user');
  }, [search, filterType, showArchive]);

  // Répondre à un enregistrement (préparation du formulaire)
  const handleRepondre = async (item) => {
    const res = await axios.post(`/api/registre/${item.id}/repondre`);
    setForm({
      ...res.data,
      idBureauOrdre: '',
      date: new Date().toISOString().slice(0, 16),
      numeroCourrier: '',
      numeroDossier: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  // Soumission (ajout / modification)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (payload.type === 'Administratif') {
        delete payload.numeroDossier;
        payload.numeroCourrier = payload.numeroCourrier ? parseInt(payload.numeroCourrier) : null;
      } else {
        delete payload.numeroCourrier;
        payload.numeroDossier = payload.numeroDossier ? parseInt(payload.numeroDossier) : null;
      }
      payload.idBureauOrdre = payload.idBureauOrdre ? parseInt(payload.idBureauOrdre) : null;
      if (editingId) {
        await axios.put(`/api/registre/${editingId}`, payload);
      } else {
        await axios.post('/api/registre', payload);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data || 'Erreur');
    }
  };

  const handleArchiver = async (id) => {
    if (window.confirm('Archiver cet enregistrement ?')) {
      await axios.patch(`/api/registre/${id}/archiver`);
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin') { alert('Suppression réservée à l\'administrateur'); return; }
    if (window.confirm('Supprimer définitivement ?')) {
      await axios.delete(`/api/registre/${id}`);
      fetchData();
    }
  };

  const exportExcel = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (filterType) params.append('type', filterType);
    if (showArchive) params.append('archive', 'true');
    window.open(`/api/registre/export/excel?${params.toString()}`, '_blank');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/registre/import/preview', formData);
      setHeaders(res.data);
      setShowMapping(true);
      setMapping({
        type: '', direction: '', date: '', sujet: '', source: '', destinataire: '',
        description: '', numero: '', idBureauOrdre: ''
      });
    } catch (err) {
      setError('Erreur lecture fichier');
    }
  };

  const executeImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    const params = new URLSearchParams({
      colType: mapping.type,
      colDirection: mapping.direction,
      colDate: mapping.date,
      colSujet: mapping.sujet,
      colSource: mapping.source,
      colDestinataire: mapping.destinataire,
      colDescription: mapping.description,
      colNumero: mapping.numero,
      colIdBureauOrdre: mapping.idBureauOrdre
    });
    try {
      const res = await axios.post(`/api/registre/import/execute?${params.toString()}`, formData);
      alert(`${res.data.imported} enregistrements importés.`);
      fetchData();
      setShowMapping(false);
      setImportFile(null);
    } catch (err) {
      setError('Erreur import');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      type: 'Administratif',
      direction: 'Entrant',
      date: '',
      sujet: '',
      source: '',
      destinataire: '',
      description: '',
      numeroCourrier: '',
      numeroDossier: '',
      idBureauOrdre: ''
    });
    setError('');
  };

  // Composant tableau réutilisable
  const TableSection = ({ title, items, showReply = true }) => (
    <div className="registre-section">
      <h2>{title}</h2>
      <div className="data-table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID Bureau</th>
              <th>Type</th>
              <th>Date</th>
              <th>Sujet</th>
              <th>Source</th>
              <th>Destinataire</th>
              <th>N° Courrier/Dossier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.idBureauOrdre || '—'}</td>
                <td>{item.type}</td>
                <td>{new Date(item.date).toLocaleString()}</td>
                <td>{item.sujet}</td>
                <td>{item.source}</td>
                <td>{item.destinataire}</td>
                <td>{item.type === 'Administratif' ? (item.numeroCourrier || '—') : (item.numeroDossier || '—')}</td>
                <td className="action-icons">
                  {showReply && <button onClick={() => handleRepondre(item)}>↩️ Répondre</button>}
                  <button onClick={() => { setEditingId(item.id); setForm(item); setShowModal(true); }}>✏️</button>
                  <button onClick={() => handleArchiver(item.id)}>📦 Archiver</button>
                  {userRole === 'admin' && <button onClick={() => handleDelete(item.id)}>🗑️</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <h1 className="page-title">Registre des entrées/sorties</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="filters">
        <input type="text" placeholder="Rechercher (sujet, source, destinataire)" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          <option>Administratif</option>
          <option>Judiciaire</option>
        </select>
        <label>
          <input type="checkbox" checked={showArchive} onChange={e => setShowArchive(e.target.checked)} /> Afficher archivés
        </label>
        <button className="btn-secondary" onClick={() => { setSearch(''); setFilterType(''); setShowArchive(false); }}>Réinitialiser</button>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Nouvel enregistrement</button>
        <button className="btn-primary" onClick={exportExcel}>📎 Exporter Excel</button>
        <label className="btn-secondary" style={{ cursor: 'pointer' }}>
          📂 Importer Excel
          <input type="file" accept=".xlsx" onChange={handleFileSelect} style={{ display: 'none' }} />
        </label>
      </div>

      {showMapping && (
        <div className="mapping-panel">
          <h4>Associez les colonnes du fichier Excel :</h4>
          <div className="form-grid">
            {[ {label:"Type", key:"type"}, {label:"Direction", key:"direction"}, {label:"Date", key:"date"}, {label:"Sujet", key:"sujet"}, {label:"Source", key:"source"}, {label:"Destinataire", key:"destinataire"}, {label:"Description", key:"description"}, {label:"N° Courrier/Dossier", key:"numero"}, {label:"ID Bureau Ordre", key:"idBureauOrdre"} ].map(f => (
              <div className="form-field" key={f.key}>
                <label>{f.label} *</label>
                <select value={mapping[f.key]} onChange={e => setMapping({...mapping, [f.key]: e.target.value})}>
                  <option value="">-- Choisir --</option>
                  {headers.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={executeImport}>Importer</button>
            <button className="btn-secondary" onClick={() => setShowMapping(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Trois sections */}
      <TableSection title="الواردات (Entrants)" items={entrants} showReply={true} />
      <TableSection title="المرسلات - الصادرة (Sortants émis)" items={sortantsEemis} showReply={false} />
      <TableSection title="المرسلات - الواردة (Réponses reçues)" items={reponsesRecues} showReply={true} />

      {/* Modal d’ajout / modification */}
      {showModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowModal(false)} />
          <div className="modal">
            <h2>{editingId ? 'Modifier' : 'Ajouter'} un enregistrement</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field"><label>Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Administratif</option><option>Judiciaire</option></select></div>
                <div className="form-field"><label>Direction</label><select value={form.direction} onChange={e => setForm({...form, direction: e.target.value})}><option>Entrant</option><option>Sortant</option></select></div>
                <div className="form-field"><label>Date *</label><input type="datetime-local" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
                <div className="form-field"><label>Sujet *</label><input value={form.sujet} onChange={e => setForm({...form, sujet: e.target.value})} required /></div>
                <div className="form-field"><label>Source (expéditeur) *</label><input value={form.source} onChange={e => setForm({...form, source: e.target.value})} required /></div>
                <div className="form-field"><label>Destinataire *</label><input value={form.destinataire} onChange={e => setForm({...form, destinataire: e.target.value})} required /></div>
                <div className="form-field"><label>Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div className="form-field"><label>ID Bureau Ordre *</label><input type="number" value={form.idBureauOrdre} onChange={e => setForm({...form, idBureauOrdre: e.target.value})} required /></div>
                {form.type === 'Administratif' ? (
                  <div className="form-field"><label>Numéro de courrier</label><input value={form.numeroCourrier} onChange={e => setForm({...form, numeroCourrier: e.target.value})} /></div>
                ) : (
                  <div className="form-field"><label>Numéro de dossier</label><input value={form.numeroDossier} onChange={e => setForm({...form, numeroDossier: e.target.value})} /></div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">{editingId ? 'Modifier' : 'Ajouter'}</button>
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default Registre;