import React, { useState, useEffect } from 'react';
import axios from 'axios';

function GererCourriers() {
  const [courriers, setCourriers] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    type: 'Administratif',
    direction: 'Entrant',
    date: '',
    sujet: '',
    source: '',
    destinataire: '',
    description: '',
    idService: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const fetchCourriers = async () => {
    try {
      const res = await axios.get('/api/courriers');
      setCourriers(res.data);
    } catch (err) {
      setError('Erreur chargement courriers');
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/services');
      setServices(res.data);
      if (res.data.length > 0) setForm(prev => ({ ...prev, idService: res.data[0].idService }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCourriers();
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/courriers/${editingId}`, { ...form, id: editingId });
      } else {
        await axios.post('/api/courriers', form);
      }
      resetForm();
      fetchCourriers();
    } catch (err) {
      setError(err.response?.data || 'Erreur');
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({
      type: c.type,
      direction: c.direction,
      date: c.date?.slice(0, 16),
      sujet: c.sujet,
      source: c.source,
      destinataire: c.destinataire,
      description: c.description || '',
      idService: c.idService,
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce courrier ?')) {
      await axios.delete(`/api/courriers/${id}`);
      fetchCourriers();
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
      idService: services.length > 0 ? services[0].idService : '',
    });
    setError('');
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Gérer les courriers</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="form-card">
        <h3>{editingId ? 'Modifier un courrier' : 'Ajouter un courrier'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>Administratif</option>
                <option>Judiciaire</option>
              </select>
            </div>
            <div className="form-field">
              <label>Direction</label>
              <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}>
                <option>Entrant</option>
                <option>Sortant</option>
              </select>
            </div>
            <div className="form-field">
              <label>Date *</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Sujet *</label>
              <input value={form.sujet} onChange={e => setForm({ ...form, sujet: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Source *</label>
              <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Destinataire *</label>
              <input value={form.destinataire} onChange={e => setForm({ ...form, destinataire: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Service *</label>
              <select value={form.idService} onChange={e => setForm({ ...form, idService: e.target.value })} required>
                <option value="">Choisir un service</option>
                {services.map(s => (
                  <option key={s.idService} value={s.idService}>
                    {s.nomService} (ID: {s.idService})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? 'Modifier' : 'Ajouter'}</button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>Annuler</button>
            )}
          </div>
        </form>
      </div>

      <div className="data-table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Direction</th>
              <th>Date</th>
              <th>Sujet</th>
              <th>Source</th>
              <th>Destinataire</th>
              <th>Service</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courriers.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.type}</td>
                <td>{c.direction}</td>
                <td>{new Date(c.date).toLocaleString()}</td>
                <td>{c.sujet}</td>
                <td>{c.source}</td>
                <td>{c.destinataire}</td>
                <td>{c.idService} (via {c.serviceNom})</td>
                <td className="action-icons">
                  <button onClick={() => handleEdit(c)}>✏️</button>
                  <button onClick={() => handleDelete(c.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GererCourriers;