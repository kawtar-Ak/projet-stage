import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import ActionIcon from '../components/ActionIcon';

function GererUtilisateurs() {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [form, setForm] = useState({ nomComplet: '', login: '', password: '', idService: '' });
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterService, setFilterService] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({ nom: '', login: '', serviceId: '' });
    const [showMapping, setShowMapping] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const fetchUsers = async () => {
        try {
            let url = '/api/utilisateurs';
            if (search) url += `?search=${search}`;
            if (filterService) url += `?serviceId=${filterService}`;
            const res = await axios.get(url);
            setUsers(res.data);
        } catch (err) {
            setError(t('erreur_chargement_utilisateurs'));
        }
    };

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/services');
            setServices(res.data);
        } catch (err) {}
    };

    useEffect(() => {
        fetchUsers();
        fetchServices();
    }, [search, filterService]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nomComplet.trim() || !form.login.trim() || !form.idService) {
            setError(t('erreur_champs_utilisateur'));
            return;
        }
        try {
            if (editingId) {
                const payload = {
                    nomComplet: form.nomComplet,
                    login: form.login,
                    idService: parseInt(form.idService),
                };
                if (form.password) payload.password = form.password;
                await axios.put(`/api/utilisateurs/${editingId}`, payload);
            } else {
                if (!form.password) {
                    setError(t('erreur_mot_de_passe_requis'));
                    return;
                }
                await axios.post('/api/utilisateurs', {
                    nomComplet: form.nomComplet,
                    login: form.login,
                    password: form.password,
                    idService: parseInt(form.idService),
                });
            }
            resetForm();
            fetchUsers();
        } catch (err) {
            setError(getErrorMessage(err, t('erreur_enregistrement')));
        }
    };

    const handleEdit = (u) => {
        setEditingId(u.id);
        setForm({
            nomComplet: u.nomComplet,
            login: u.login,
            password: '',
            idService: u.idService,
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('confirmation_supprimer_utilisateur'))) {
            try {
                await axios.delete(`/api/utilisateurs/${id}`);
                fetchUsers();
                setSelectedIds(selectedIds.filter(i => i !== id));
            } catch (err) {
                setError(t('erreur_suppression'));
            }
        }
    };

    const changePassword = async () => {
        if (!newPassword.trim()) {
            alert(t('mot_de_passe_vide'));
            return;
        }
        try {
            await axios.put(`/api/utilisateurs/${selectedUserId}`, { password: newPassword });
            alert(t('mot_de_passe_modifie'));
            setShowPasswordModal(false);
            setNewPassword('');
            setSelectedUserId(null);
        } catch (err) {
            setError(t('erreur_changement_mot_de_passe'));
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({ nomComplet: '', login: '', password: '', idService: '' });
        setError('');
    };

    const exportToExcel = async () => {
        try {
            const res = await axios.get('/api/utilisateurs/export/excel', { responseType: 'blob' });
            downloadBlob(res.data, 'utilisateurs.xlsx');
        } catch (err) {
            setError(t('erreur_export'));
        }
    };

    const downloadTemplate = async () => {
        try {
            const res = await axios.get('/api/utilisateurs/template', { responseType: 'blob' });
            downloadBlob(res.data, 'modele_utilisateurs.xlsx');
        } catch (err) {
            setError(t('erreur_export'));
        }
    };

    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/utilisateurs/import/preview', formData);
            setHeaders(res.data);
            setShowMapping(true);
            setMapping({
                nom: findHeader(res.data, ['Nom complet', 'Nom', 'الاسم الكامل']),
                login: findHeader(res.data, ['Login', 'اسم الدخول']),
                serviceId: findHeader(res.data, ['Service ID', 'Service', 'الخدمة']),
            });
        } catch (err) {
            setError(t('erreur_lecture_fichier'));
        }
    };

    const executeImport = async () => {
        if (!importFile) return;
        if (!mapping.nom || !mapping.login || !mapping.serviceId) {
            setError(t('erreur_champs_utilisateur'));
            return;
        }

        const formData = new FormData();
        formData.append('file', importFile);
        const params = new URLSearchParams({
            colNom: mapping.nom,
            colLogin: mapping.login,
            colServiceId: mapping.serviceId,
        });
        try {
            const res = await axios.post(`/api/utilisateurs/import/execute?${params.toString()}`, formData);
            const data = res.data;
            const imported = Number(data.imported || 0);
            const updated = Number(data.updated || 0);
            const successMessage = data.message || `${imported} ${t('utilisateurs_importes')}, ${updated} ${t('utilisateurs_mis_a_jour')}`;
            if (data.errors && data.errors.length > 0) {
                alert(`${successMessage}\n${t('details_erreurs')} :\n${data.errors.join('\n')}`);
            } else {
                alert(successMessage);
            }
            if (imported > 0 || updated > 0) fetchUsers();
            setShowMapping(false);
            setImportFile(null);
            setMapping({ nom: '', login: '', serviceId: '' });
        } catch (err) {
            setError(t('erreur_import'));
        }
    };

    const handleSelectAll = () => {
        setSelectAll(!selectAll);
        setSelectedIds(selectAll ? [] : users.map(u => u.id));
    };
    const handleSelectOne = (id) => {
        setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
    };

    return (
        <div className="page-container" dir="rtl">
            <h1 className="page-title">{t('gerer_utilisateurs')}</h1>
            {error && <div className="error-message">{error}</div>}
            <div className="filters">
                <input
                    type="text"
                    placeholder={t('rechercher_utilisateur')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select value={filterService} onChange={e => setFilterService(e.target.value)}>
                    <option value="">{t('tous_services')}</option>
                    {services.map(s => (
                        <option key={s.idService} value={s.idService}>
                            {s.nomService}
                        </option>
                    ))}
                </select>
                <button className="btn-secondary" onClick={() => { setSearch(''); setFilterService(''); }}>
                    {t('reinitialiser')}
                </button>
                <button className="btn-primary" onClick={exportToExcel}>{t('exporter_excel')}</button>
                <button className="btn-secondary" onClick={downloadTemplate}>📥 {t('telecharger_modele')}</button>
                <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                    📂 {t('importer_excel')}
                    <input type="file" accept=".xlsx" onChange={handleFileSelect} style={{ display: 'none' }} />
                </label>
            </div>

            {showMapping && (
                <div className="mapping-panel" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', background: '#f9f9f9', borderRadius: '1rem' }}>
                    <h4>{t('associer_colonnes')}</h4>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>{t('colonne_nom_complet')} *</label>
                            <select value={mapping.nom} onChange={e => setMapping({ ...mapping, nom: e.target.value })}>
                                <option value="">-- {t('choisir')} --</option>
                                {headers.map(h => <option key={h}>{h}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>{t('colonne_login')} *</label>
                            <select value={mapping.login} onChange={e => setMapping({ ...mapping, login: e.target.value })}>
                                <option value="">-- {t('choisir')} --</option>
                                {headers.map(h => <option key={h}>{h}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>{t('colonne_service_id')} *</label>
                            <select value={mapping.serviceId} onChange={e => setMapping({ ...mapping, serviceId: e.target.value })}>
                                <option value="">-- {t('choisir')} --</option>
                                {headers.map(h => <option key={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button className="btn-primary" onClick={executeImport}>{t('importer')}</button>
                        <button className="btn-secondary" onClick={() => setShowMapping(false)}>{t('annuler')}</button>
                    </div>
                </div>
            )}

            <div className="form-card">
                <h3>{editingId ? t('modifier_utilisateur') : t('ajouter_utilisateur')}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>{t('nom_complet')} *</label>
                            <input
                                type="text"
                                value={form.nomComplet}
                                onChange={e => setForm({ ...form, nomComplet: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>{t('login')} *</label>
                            <input
                                type="text"
                                value={form.login}
                                onChange={e => setForm({ ...form, login: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>{t('mot_de_passe')} {!editingId && '*'}</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required={!editingId}
                                placeholder={editingId ? t('laisser_vide') : ""}
                            />
                        </div>
                        <div className="form-field">
                            <label>{t('service')} *</label>
                            <select
                                value={form.idService}
                                onChange={e => setForm({ ...form, idService: e.target.value })}
                                required
                            >
                                <option value="">{t('selectionner_service')}</option>
                                {services.map(s => (
                                    <option key={s.idService} value={s.idService}>
                                        {s.nomService}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-primary">
                            {editingId ? t('mettre_a_jour') : t('ajouter')}
                        </button>
                        {editingId && (
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                {t('annuler')}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="data-table-wrapper">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /></th>
                            <th>ID</th>
                            <th>{t('nom_complet')}</th>
                            <th>{t('login')}</th>
                            <th>{t('service')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => handleSelectOne(u.id)} /></td>
                                <td>{u.id}</td>
                                <td>{u.nomComplet}</td>
                                <td>{u.login}</td>
                                <td>{u.nomService || `${t('service')} #${u.idService}`}</td>
                                <td className="action-icons">
                                    <button type="button" onClick={() => handleEdit(u)} title={t('modifier')} aria-label={t('modifier')} className="action-icon action-edit">
                                        <ActionIcon name="edit" />
                                    </button>
                                    <button type="button" onClick={() => handleDelete(u.id)} title={t('supprimer')} aria-label={t('supprimer')} className="action-icon action-delete">
                                        <ActionIcon name="delete" />
                                    </button>
                                    <button type="button" onClick={() => { setSelectedUserId(u.id); setShowPasswordModal(true); }} title={t('changer_mot_de_passe')} aria-label={t('changer_mot_de_passe')} className="action-icon action-password">
                                        <ActionIcon name="password" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showPasswordModal && (
                <>
                    <div className="modal-overlay" onClick={() => { setShowPasswordModal(false); setNewPassword(''); }} />
                    <div className="modal" onClick={(event) => event.stopPropagation()}>
                        <h3>{t('changer_mot_de_passe')}</h3>
                        <input
                            type="password"
                            placeholder={t('nouveau_mot_de_passe')}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', margin: '1rem 0' }}
                        />
                        <div className="form-actions" style={{ marginTop: '1rem' }}>
                            <button className="btn-primary" onClick={changePassword}>{t('valider')}</button>
                            <button className="btn-secondary" onClick={() => { setShowPasswordModal(false); setNewPassword(''); }}>{t('annuler')}</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function findHeader(headers, candidates) {
    return headers.find(header =>
        candidates.some(candidate => header.toLowerCase() === candidate.toLowerCase())
    ) || '';
}

function getErrorMessage(error, fallback) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (typeof data?.error === 'string') return data.error;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return fallback;
}

export default GererUtilisateurs;

