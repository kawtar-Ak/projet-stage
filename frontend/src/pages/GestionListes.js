import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LOOKUP_LISTS,
  createLookupItem,
  deleteLookupItem,
  getAllLookupItems,
  updateLookupItem
} from '../api/lookups';

const emptyForm = {
  listName: LOOKUP_LISTS[0].key,
  value: '',
  label: '',
  sortOrder: 0,
  isActive: true
};

function GestionListes() {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar');
  const [items, setItems] = useState([]);
  const [selectedList, setSelectedList] = useState(LOOKUP_LISTS[0].key);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const selectedItems = useMemo(() => (
    items
      .filter((item) => item.listName === selectedList)
      .sort((a, b) => (a.sortOrder - b.sortOrder) || a.label.localeCompare(b.label))
  ), [items, selectedList]);

  const loadItems = async () => {
    try {
      setItems(await getAllLookupItems());
      setError('');
    } catch (err) {
      setError(t('erreur_chargement_listes'));
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = (listName = selectedList) => {
    setEditingId(null);
    setForm({ ...emptyForm, listName });
    setError('');
  };

  const handleListChange = (listName) => {
    setSelectedList(listName);
    resetForm(listName);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = form.value.trim();
    const label = form.label.trim() || value;

    if (!form.listName || !value) {
      setError(t('erreur_liste_valeur_obligatoires'));
      return;
    }

    const payload = {
      listName: form.listName,
      value,
      label,
      sortOrder: Number(form.sortOrder || 0),
      isActive: Boolean(form.isActive)
    };

    try {
      if (editingId) {
        await updateLookupItem(editingId, payload);
      } else {
        await createLookupItem(payload);
      }
      await loadItems();
      resetForm(form.listName);
    } catch (err) {
      setError(t('erreur_enregistrer_valeur_liste'));
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      listName: item.listName,
      value: item.value,
      label: item.label,
      sortOrder: item.sortOrder,
      isActive: item.isActive
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmation_supprimer_valeur_liste'))) return;

    try {
      await deleteLookupItem(id);
      await loadItems();
      resetForm();
    } catch (err) {
      setError(t('erreur_supprimer_valeur_liste'));
    }
  };

  const selectedListLabel = getLookupListLabel(selectedList, t);

  return (
    <div className="page-container list-management-page" dir={isArabic ? 'rtl' : 'ltr'}>
      <h1 className="page-title">{t('gestion_listes')}</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <select value={selectedList} onChange={(event) => handleListChange(event.target.value)}>
          {LOOKUP_LISTS.map((list) => (
            <option key={list.key} value={list.key}>{getLookupListLabel(list.key, t)}</option>
          ))}
        </select>
      </div>

      <div className="form-card list-form-card">
        <h3>{editingId ? t('modifier_valeur_liste') : `${t('ajouter_dans_liste')} : ${selectedListLabel}`}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>{t('liste')} *</label>
              <select value={form.listName} onChange={(event) => setForm({ ...form, listName: event.target.value })}>
                {LOOKUP_LISTS.map((list) => (
                  <option key={list.key} value={list.key}>{getLookupListLabel(list.key, t)}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>{t('valeur_technique')} *</label>
              <input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required />
            </div>
            <div className="form-field">
              <label>{t('libelle_affiche')}</label>
              <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
            </div>
            <div className="form-field">
              <label>{t('ordre')}</label>
              <input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
            </div>
            <div className="form-field">
              <label>{t('active')}</label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                />
                {t('oui')}
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? t('modifier') : t('ajouter')}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={() => resetForm()}>{t('annuler')}</button>}
          </div>
        </form>
      </div>

      <div className="data-table-wrapper list-table-wrapper">
        <table className="modern-table list-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('valeur')}</th>
              <th>{t('libelle')}</th>
              <th>{t('ordre')}</th>
              <th>{t('active')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.value}</td>
                <td>{item.label}</td>
                <td>{item.sortOrder}</td>
                <td>{item.isActive ? t('oui') : t('non')}</td>
                <td className="action-icons">
                  <button type="button" className="btn-secondary" onClick={() => handleEdit(item)}>{t('modifier')}</button>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(item.id)}>{t('supprimer')}</button>
                </td>
              </tr>
            ))}
            {selectedItems.length === 0 && (
              <tr>
                <td colSpan="6">{t('aucune_valeur')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestionListes;

function getLookupListLabel(listName, t) {
  const keys = {
    'courrier.etat': 'liste_etats_courriers',
    'judiciaire.typeDocument': 'liste_types_documents_judiciaires',
    'administratif.source': 'liste_sources_administratives',
    'equipement.type': 'liste_types_equipements',
    'equipement.etat': 'liste_etats_equipements'
  };

  return keys[listName] ? t(keys[listName]) : listName;
}
