import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const emptyForm = {
  documentId: '',
  documentType: '',
  dateDeReception: '',
  dateEnvoi: '',
  recepteur: '',
  emetteurService: '',
  sourceServiceId: '',
  destinationServiceId: '',
  etat: '',
  notes: ''
};

function Circulations() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar') ? 'ar-MA' : 'fr-FR';
  const [circulations, setCirculations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCirculations = circulations.filter(item => matchesSearch(item, searchTerm, locale));

  useEffect(() => {
    fetchCirculations();
  }, []);

  const fetchCirculations = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/circulations');
      setCirculations(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, t('erreur_chargement_circulations')));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');

    if (!form.documentId || Number(form.documentId) <= 0) {
      setError(t('erreur_document_id_requis'));
      return;
    }

    if (!form.documentType.trim() || !form.dateDeReception || !form.recepteur.trim() || !form.emetteurService.trim()) {
      setError(t('erreur_champs_obligatoires'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        documentId: Number(form.documentId),
        documentType: form.documentType.trim(),
        dateDeReception: form.dateDeReception,
        dateEnvoi: form.dateEnvoi || null,
        recepteur: form.recepteur.trim(),
        emetteurService: form.emetteurService.trim(),
        sourceServiceId: nullableNumber(form.sourceServiceId),
        destinationServiceId: nullableNumber(form.destinationServiceId),
        etat: form.etat.trim() || null,
        notes: form.notes.trim() || null
      };

      if (editingId) {
        await axios.put(`/api/circulations/${editingId}`, payload);
        setSuccess(t('circulation_modifiee'));
      } else {
        await axios.post('/api/circulations', payload);
        setSuccess(t('circulation_ajoutee'));
      }

      resetForm();
      fetchCirculations();
    } catch (err) {
      setError(getErrorMessage(err, t('erreur_enregistrer_circulation')));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      documentId: item.documentId || '',
      documentType: item.documentType || '',
      dateDeReception: toDateTimeInput(item.dateDeReception),
      dateEnvoi: toDateTimeInput(item.dateEnvoi),
      recepteur: item.recepteur || '',
      emetteurService: item.emetteurService || '',
      sourceServiceId: item.sourceServiceId || '',
      destinationServiceId: item.destinationServiceId || '',
      etat: item.etat || '',
      notes: item.notes || ''
    });
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmation_supprimer'))) return;

    try {
      await axios.delete(`/api/circulations/${id}`);
      setSuccess(t('circulation_supprimee'));
      fetchCirculations();
    } catch (err) {
      setError(getErrorMessage(err, t('erreur_supprimer_circulation')));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  return (
    <div className="page-container">
      <h1 className="page-title">{t('gestion_circulations')}</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="filters">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={translate(t, 'rechercher_dossier_circulation', 'Rechercher un dossier, service, état, date...')}
        />
        {searchTerm && (
          <button type="button" className="btn-secondary" onClick={() => setSearchTerm('')}>
            {translate(t, 'effacer', 'Effacer')}
          </button>
        )}
      </div>

      <div className="form-card">
        <h3>{editingId ? t('modifier_circulation') : t('ajouter_circulation')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>{t('document_id')} *</label>
              <input type="number" min="1" value={form.documentId} onChange={e => setForm({ ...form, documentId: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>{t('type_document')} *</label>
              <input value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>{t('date_reception')} *</label>
              <input type="datetime-local" value={form.dateDeReception} onChange={e => setForm({ ...form, dateDeReception: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>{t('date_envoi')}</label>
              <input type="datetime-local" value={form.dateEnvoi} onChange={e => setForm({ ...form, dateEnvoi: e.target.value })} />
            </div>
            <div className="form-field">
              <label>{t('recepteur')} *</label>
              <input value={form.recepteur} onChange={e => setForm({ ...form, recepteur: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>{t('emetteur_service')} *</label>
              <input value={form.emetteurService} onChange={e => setForm({ ...form, emetteurService: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>{t('source_service_id')}</label>
              <input type="number" min="1" value={form.sourceServiceId} onChange={e => setForm({ ...form, sourceServiceId: e.target.value })} />
            </div>
            <div className="form-field">
              <label>{t('destination_service_id')}</label>
              <input type="number" min="1" value={form.destinationServiceId} onChange={e => setForm({ ...form, destinationServiceId: e.target.value })} />
            </div>
            <div className="form-field">
              <label>{t('etat')}</label>
              <input value={form.etat} onChange={e => setForm({ ...form, etat: e.target.value })} />
            </div>
            <div className="form-field">
              <label>{t('notes')}</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('sauvegarde_en_cours') : (editingId ? t('modifier') : t('ajouter'))}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>{t('annuler')}</button>}
          </div>
        </form>
      </div>

      <div className="data-table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>{t('id')}</th>
              <th>{t('document_id')}</th>
              <th>{t('type_document')}</th>
              <th>{t('date_reception')}</th>
              <th>{t('date_envoi')}</th>
              <th>{t('recepteur')}</th>
              <th>{t('emetteur_service')}</th>
              <th>{t('etat')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9">{t('chargement')}</td></tr>
            ) : filteredCirculations.length === 0 ? (
              <tr><td colSpan="9">{searchTerm ? translate(t, 'aucun_resultat', 'Aucun résultat trouvé') : t('aucune_circulation')}</td></tr>
            ) : (
              filteredCirculations.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.documentId}</td>
                  <td>{item.documentType || '-'}</td>
                  <td>{formatDateTime(item.dateDeReception, locale)}</td>
                  <td>{formatDateTime(item.dateEnvoi, locale)}</td>
                  <td>{item.recepteur || '-'}</td>
                  <td>{item.emetteurService || '-'}</td>
                  <td>{item.etat || '-'}</td>
                  <td className="action-icons">
                    <button type="button" onClick={() => handleEdit(item)}>{t('modifier')}</button>
                    <button type="button" onClick={() => handleDelete(item.id)}>{t('supprimer')}</button>
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

function nullableNumber(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value, locale) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
}

function matchesSearch(item, searchTerm, locale) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;

  return [
    item.id,
    item.documentId,
    item.documentType,
    item.recepteur,
    item.emetteurService,
    item.sourceServiceId,
    item.destinationServiceId,
    item.etat,
    item.notes,
    formatDateTime(item.dateDeReception, locale),
    formatDateTime(item.dateEnvoi, locale)
  ]
    .filter(value => value !== null && value !== undefined)
    .some(value => String(value).toLowerCase().includes(term));
}

function translate(t, key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

function getErrorMessage(error, fallback) {
  if (typeof error.response?.data === 'string') return error.response.data;
  if (error.response?.data?.message) return error.response.data.message;
  return fallback;
}

export default Circulations;
