import React, { useState, useEffect } from 'react';
import axios from 'axios';

function GererServices() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ idService: '', nomService: '', description: '', etage: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterEtage, setFilterEtage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ id: '', nom: '', description: '', etage: '' });
  const [showMapping, setShowMapping] = useState(false);

  const fetchServices = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterEtage) params.etage = filterEtage;
      const res = await axios.get('/api/services', { params });
      setServices(res.data);
    } catch (err) { setError('Erreur chargement services'); }
  };

  useEffect(() => { fetchServices(); }, [search, filterEtage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const idNum = parseInt(form.idService, 10);
    if (isNaN(idNum) || idNum <= 0) { setError("L'ID doit être un nombre positif"); return; }
    if (!form.nomService.trim()) { setError('Le nom est requis'); return; }
    try {
      if (editingId) {
        await axios.put(`/api/services/${editingId}`, { idService: idNum, nomService: form.nomService, description: form.description, etage: form.etage || null });
      } else {
        await axios.post('/api/services', { idService: idNum, nomService: form.nomService, description: form.description, etage: form.etage || null });
      }
      resetForm();
      fetchServices();
    } catch (err) { setError(err.response?.data || 'Erreur'); }
  };

  const handleEdit = (s) => {
    setEditingId(s.idService);
    setForm({ idService: s.idService, nomService: s.nomService, description: s.description || '', etage: s.etage || '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ?')) {
      try { await axios.delete(`/api/services/${id}`); fetchServices(); }
      catch (err) { setError(err.response?.data); }
    }
  };

  const exportToExcel = () => {
    fetch('/api/services/export/excel', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'services.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(console.error);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/services/import/preview', formData);
      setHeaders(res.data);
      setShowMapping(true);
    } catch (err) { setError('Erreur lecture du fichier'); }
  };

  const executeImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    const params = new URLSearchParams({
      colId: mapping.id,
      colNom: mapping.nom,
      colDescription: mapping.description,
      colEtage: mapping.etage
    });
    try {
      const res = await axios.post(`/api/services/import/execute?${params.toString()}`, formData);
      const data = res.data;
      if (data.errors && data.errors.length > 0) {
        alert(`${data.message}\n\nErreurs :\n${data.errors.join('\n')}`);
      } else {
        alert(data.message);
      }
      if (data.imported > 0) fetchServices();
      setShowMapping(false);
      setImportFile(null);
      setMapping({ id: '', nom: '', description: '', etage: '' });
    } catch (err) { setError('Erreur import'); }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ idService: '', nomService: '', description: '', etage: '' });
    setError('');
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedIds(selectAll ? [] : services.map(s => s.idService));
  };
  const handleSelectOne = (id) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Gérer les services</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="filters">
        <input type="text" placeholder="Rechercher nom/description" value={search} onChange={e => setSearch(e.target.value)} />
        <input type="text" placeholder="Filtrer par étage" value={filterEtage} onChange={e => setFilterEtage(e.target.value)} />
        <button className="btn-secondary" onClick={() => { setSearch(''); setFilterEtage(''); }}>Réinitialiser</button>
        <button className="btn-primary" onClick={exportToExcel}>Exporter Excel</button>
        <label className="btn-secondary" style={{ cursor: 'pointer' }}>📂 Importer Excel
          <input type="file" accept=".xlsx" onChange={handleFileSelect} style={{ display: 'none' }} />
        </label>
      </div>

      {showMapping && (
        <div className="mapping-panel" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', background: '#f9f9f9', borderRadius: '1rem' }}>
          <h4>Associez les colonnes du fichier Excel :</h4>
          <div className="form-grid">
            <div className="form-field"><label>Colonne ID *</label><select value={mapping.id} onChange={e => setMapping({ ...mapping, id: e.target.value })}><option value="">-- Choisir --</option>{headers.map(h => <option key={h}>{h}</option>)}</select></div>
            <div className="form-field"><label>Colonne Nom *</label><select value={mapping.nom} onChange={e => setMapping({ ...mapping, nom: e.target.value })}><option value="">-- Choisir --</option>{headers.map(h => <option key={h}>{h}</option>)}</select></div>
            <div className="form-field"><label>Colonne Description</label><select value={mapping.description} onChange={e => setMapping({ ...mapping, description: e.target.value })}><option value="">-- Choisir --</option>{headers.map(h => <option key={h}>{h}</option>)}</select></div>
            <div className="form-field"><label>Colonne Étage</label><select value={mapping.etage} onChange={e => setMapping({ ...mapping, etage: e.target.value })}><option value="">-- Choisir --</option>{headers.map(h => <option key={h}>{h}</option>)}</select></div>
          </div>
          <div className="form-actions"><button className="btn-primary" onClick={executeImport}>Importer</button><button className="btn-secondary" onClick={() => setShowMapping(false)}>Annuler</button></div>
        </div>
      )}

      <div className="form-card">
        <h3>{editingId ? 'Modifier' : 'Ajouter'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field"><label>ID *</label><input type="number" value={form.idService} onChange={e => setForm({ ...form, idService: e.target.value })} required disabled={!!editingId} /></div>
            <div className="form-field"><label>Nom *</label><input value={form.nomService} onChange={e => setForm({ ...form, nomService: e.target.value })} required /></div>
            <div className="form-field"><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="form-field"><label>Étage</label><input value={form.etage} onChange={e => setForm({ ...form, etage: e.target.value })} /></div>
          </div>
          <div className="form-actions"><button type="submit" className="btn-primary">{editingId ? 'Modifier' : 'Ajouter'}</button>{editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Annuler</button>}</div>
        </form>
      </div>

      <div className="data-table-wrapper">
        <table className="modern-table">
          <thead><tr><th><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /></th><th>ID</th><th>Nom</th><th>Description</th><th>Étage</th><th>Actions</th></tr></thead>
          <tbody>
            {services.map(s => (
              <tr key={s.idService}>
                <td><input type="checkbox" checked={selectedIds.includes(s.idService)} onChange={() => handleSelectOne(s.idService)} /></td>
                <td>{s.idService}</td><td>{s.nomService}</td><td>{s.description || '—'}</td><td>{s.etage || '—'}</td>
                <td className="action-icons"><button onClick={() => handleEdit(s)}>✏️</button><button onClick={() => handleDelete(s.idService)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default GererServices;