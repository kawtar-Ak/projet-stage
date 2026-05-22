import React, { useEffect, useMemo, useState } from 'react';
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
      setError('Impossible de charger les listes.');
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
      setError('La liste et la valeur sont obligatoires.');
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
      setError("Impossible d'enregistrer cette valeur. Verifiez qu'elle n'existe pas deja.");
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
    if (!window.confirm('Supprimer cette valeur ?')) return;

    try {
      await deleteLookupItem(id);
      await loadItems();
      resetForm();
    } catch (err) {
      setError('Impossible de supprimer cette valeur.');
    }
  };

  const selectedListLabel = LOOKUP_LISTS.find((list) => list.key === selectedList)?.label || selectedList;

  return (
    <div className="page-container">
      <h1 className="page-title">Gestion des listes</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <select value={selectedList} onChange={(event) => handleListChange(event.target.value)}>
          {LOOKUP_LISTS.map((list) => (
            <option key={list.key} value={list.key}>{list.label}</option>
          ))}
        </select>
      </div>

      <div className="form-card">
        <h3>{editingId ? 'Modifier une valeur' : `Ajouter dans: ${selectedListLabel}`}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Liste *</label>
              <select value={form.listName} onChange={(event) => setForm({ ...form, listName: event.target.value })}>
                {LOOKUP_LISTS.map((list) => (
                  <option key={list.key} value={list.key}>{list.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Valeur technique *</label>
              <input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required />
            </div>
            <div className="form-field">
              <label>Libelle affiche</label>
              <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
            </div>
            <div className="form-field">
              <label>Ordre</label>
              <input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
            </div>
            <div className="form-field">
              <label>Active</label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                />
                Oui
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? 'Modifier' : 'Ajouter'}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={() => resetForm()}>Annuler</button>}
          </div>
        </form>
      </div>

      <div className="data-table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Valeur</th>
              <th>Libelle</th>
              <th>Ordre</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.value}</td>
                <td>{item.label}</td>
                <td>{item.sortOrder}</td>
                <td>{item.isActive ? 'Oui' : 'Non'}</td>
                <td className="action-icons">
                  <button type="button" className="btn-secondary" onClick={() => handleEdit(item)}>Modifier</button>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(item.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {selectedItems.length === 0 && (
              <tr>
                <td colSpan="6">Aucune valeur.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestionListes;
