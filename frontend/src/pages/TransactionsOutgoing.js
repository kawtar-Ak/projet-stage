import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function TransactionsOutgoing() {
    const { t, i18n } = useTranslation();
    const isArabic = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar');
    const locale = isArabic ? 'ar-MA' : 'fr-FR';
    const currentServiceId = Number(localStorage.getItem('idService') || 0);
    const [transactionsByScope, setTransactionsByScope] = useState({
        service: [],
        all: []
    });
    const [transactionScope, setTransactionScope] = useState('service');
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const importInputRef = useRef(null);

    const fetchTransactions = useCallback(() => {
        Promise.all([
            axios.get('/api/transactions/outgoing'),
            axios.get('/api/app/transaction-workflow', {
                params: { skipCount: 0, maxResultCount: 1000 }
            }).catch(() => ({ data: [] }))
        ])
            .then(([outgoingRes, allRes]) => {
                const outgoingTransactions = toArray(outgoingRes.data);
                const allServiceTransactions = toArray(allRes.data).filter(tx =>
                    Number(tx.sourceServiceId) === currentServiceId ||
                    (Number(tx.destinationServiceId) === currentServiceId && isProcessedStatus(tx.statut))
                );
                const visibleTransactions = mergeTransactions(outgoingTransactions, allServiceTransactions)
                    .sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi));
                const allTransactions = toArray(allRes.data)
                    .sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi));

                setTransactionsByScope({
                    service: visibleTransactions,
                    all: allTransactions
                });
                setSelectedIds([]);
                setError('');
            })
            .catch(() => setError(t('erreur_chargement')));
    }, [currentServiceId, t]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        const handleFocus = () => fetchTransactions();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchTransactions]);

    useEffect(() => {
        const scopedTransactions = transactionsByScope[transactionScope] || [];

        if (!searchTerm.trim()) {
            setFiltered(scopedTransactions);
            return;
        }
        const term = searchTerm.toLowerCase();
        setFiltered(scopedTransactions.filter(tx =>
            String(tx.id || '').includes(term) ||
            String(tx.documentId || '').includes(term) ||
            (tx.documentType && tx.documentType.toLowerCase().includes(term)) ||
            (tx.documentSujet && tx.documentSujet.toLowerCase().includes(term)) ||
            (tx.numeroBureauOrdre && tx.numeroBureauOrdre.toLowerCase().includes(term)) ||
            (tx.destinationServiceNom && tx.destinationServiceNom.toLowerCase().includes(term)) ||
            (tx.sourceServiceNom && tx.sourceServiceNom.toLowerCase().includes(term)) ||
            (tx.currentServiceNom && tx.currentServiceNom.toLowerCase().includes(term)) ||
            (tx.currentLocation && tx.currentLocation.toLowerCase().includes(term)) ||
            (tx.statut && tx.statut.toLowerCase().includes(term)) ||
            (tx.senderUserName && tx.senderUserName.toLowerCase().includes(term)) ||
            (tx.responderUserName && tx.responderUserName.toLowerCase().includes(term)) ||
            (tx.messageReponse && tx.messageReponse.toLowerCase().includes(term)) ||
            (tx.numeroCourrier && tx.numeroCourrier.toLowerCase().includes(term)) ||
            (tx.numeroDossierJudiciaire && tx.numeroDossierJudiciaire.toLowerCase().includes(term))
        ));
        setSelectedIds([]);
    }, [searchTerm, transactionScope, transactionsByScope]);

    const handleScopeChange = (scope) => {
        setTransactionScope(scope);
        setSelectedIds([]);
    };

    const handleSelectOne = (id) => {
        setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
    };

    const exportSelected = async () => {
        if (selectedIds.length === 0) {
            alert(t('selection_requise'));
            return;
        }
        try {
            const response = await axios.post('/api/transactions/export-selected', selectedIds, {
                responseType: 'blob',
                headers: { 'Content-Type': 'application/json' }
            });
            downloadBlob(response.data, 'transactions_en_attente_et_acceptees.xlsx');
        } catch (err) {
            alert(t('erreur_export'));
        }
    };

    const downloadExcel = async (url, fileName) => {
        try {
            const response = await axios.get(url, { responseType: 'blob' });
            downloadBlob(response.data, fileName);
        } catch (err) {
            setError(getErrorMessage(err, t('erreur_export')));
        }
    };

    const handleImportExcel = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        setError('');
        setSuccess('');

        try {
            const response = await axios.post('/api/transactions/import/excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imported = response.data?.imported ?? 0;
            const errors = response.data?.errors || [];
            setSuccess(errors.length > 0
                ? translate(t, 'import_termine_avec_erreurs', `Import termine: ${imported} ligne(s), erreurs: ${errors.join(' | ')}`)
                : translate(t, 'import_lignes_ajoutees', `${imported} ligne(s) importee(s).`).replace('{{count}}', imported));
            fetchTransactions();
        } catch (err) {
            setError(getErrorMessage(err, t('erreur_import')));
        }
    };

    return (
        <div className="page-container">
            <h1 className="page-title">{translate(t, 'historique_transactions', 'Historique des transactions')}</h1>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <div className="filters">
                <button type="button" className="btn-secondary" onClick={() => downloadExcel('/api/transactions/template', 'modele-import-transactions.xlsx')}>
                    {t('telecharger_modele')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => importInputRef.current?.click()}>
                    {t('importer_excel')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => downloadExcel('/api/transactions/export/excel', 'transactions.xlsx')}>
                    {t('exporter_excel')}
                </button>
                <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportExcel}
                    style={{ display: 'none' }}
                />
                <div className="scope-filter" role="group" aria-label={translate(t, 'filtre_transactions', 'Filtre transactions')}>
                    <button
                        type="button"
                        className={transactionScope === 'service' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => handleScopeChange('service')}
                    >
                        {translate(t, 'transactions_service', 'Transactions du service')}
                    </button>
                    <button
                        type="button"
                        className={transactionScope === 'all' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => handleScopeChange('all')}
                    >
                        {translate(t, 'toutes_transactions', 'Toutes les transactions')}
                    </button>
                </div>
                <input
                    type="text"
                    placeholder={t('rechercher')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="btn-primary" onClick={exportSelected}>
                    {t('exporter_selection')}
                </button>
                <button type="button" className="btn-secondary" onClick={fetchTransactions}>
                    {translate(t, 'actualiser', 'Actualiser')}
                </button>
            </div>
            <div className="data-table-wrapper" dir={isArabic ? 'rtl' : 'ltr'}>
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>{t('id')}</th>
                            <th>{t('document_id')}</th>
                            <th>{t('type_document')}</th>
                            <th>{t('numero_bureau_ordre')}</th>
                            <th>{t('numero_dossier_appel')}</th>
                            <th>{t('date_reception')}</th>
                            <th>{t('date_envoi')}</th>
                            <th>{t('recepteur')}</th>
                            <th>{t('emetteur_service')}</th>
                            <th>{translate(t, 'envoye_par', 'Envoyé par')}</th>
                            <th>{translate(t, 'traite_par', 'Traité par')}</th>
                            <th>{t('etat')}</th>
                            <th>{translate(t, 'derniere_transaction', 'Derniere transaction')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(tx => (
                            <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} style={{ cursor: 'pointer' }}>
                                <td>{tx.id}</td>
                                <td>{tx.documentId || '-'}</td>
                                <td>{tx.documentType || '-'}</td>
                                <td>{tx.numeroBureauOrdre || '-'}</td>
                                <td>{tx.numeroDossierJudiciaire || '-'}</td>
                                <td>{formatDateTime(tx.dateReponse, locale)}</td>
                                <td>{formatDateTime(tx.dateEnvoi, locale)}</td>
                                <td>{tx.destinationServiceNom || '-'}</td>
                                <td>{tx.sourceServiceNom || '-'}</td>
                                <td>{formatActor(tx.senderUserName, tx.sourceServiceNom)}</td>
                                <td>{formatActor(tx.responderUserName, tx.responderServiceName || tx.destinationServiceNom)}</td>
                                <td>{formatStatus(tx.statut, t)}</td>
                                <td>{isLatestTransaction(tx, filtered) ? translate(t, 'oui', 'Oui') : '-'}</td>
                                <td className="action-icons" onClick={(event) => event.stopPropagation()}>
                                    <label className="checkbox-field">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(tx.id)}
                                            onChange={() => handleSelectOne(tx.id)}
                                        />
                                        {translate(t, 'selectionner', 'Sélectionner')}
                                    </label>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr className="empty-row"><td colSpan="14">{translate(t, 'aucune_transaction', 'Aucune transaction trouvée')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedTransaction && (
                <TransactionDetailsModal
                    transaction={selectedTransaction}
                    locale={locale}
                    t={t}
                    onClose={() => setSelectedTransaction(null)}
                />
            )}
        </div>
    );
}

function TransactionDetailsModal({ transaction, locale, t, onClose }) {
    return (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
                <h2>{translate(t, 'details_mouvement', 'Details du mouvement')}</h2>
                <div className="form-grid">
                    <div className="form-field"><label>ID</label><span>{transaction.id}</span></div>
                    <div className="form-field"><label>{t('document_id')}</label><span>{transaction.documentId || '-'}</span></div>
                    <div className="form-field"><label>{t('type_document')}</label><span>{transaction.documentType || '-'}</span></div>
                    <div className="form-field"><label>{t('numero_bureau_ordre')}</label><span>{transaction.numeroBureauOrdre || transaction.numeroCourrier || '-'}</span></div>
                    <div className="form-field"><label>{t('numero_dossier_appel')}</label><span>{transaction.numeroDossierJudiciaire || '-'}</span></div>
                    <div className="form-field"><label>{t('emetteur_service')}</label><span>{transaction.sourceServiceNom || '-'}</span></div>
                    <div className="form-field"><label>{t('recepteur')}</label><span>{transaction.destinationServiceNom || '-'}</span></div>
                    <div className="form-field"><label>{translate(t, 'envoye_par', 'Envoye par')}</label><span>{formatActor(transaction.senderUserName, transaction.sourceServiceNom)}</span></div>
                    <div className="form-field"><label>{translate(t, 'traite_par', 'Traite par')}</label><span>{formatActor(transaction.responderUserName, transaction.responderServiceName || transaction.destinationServiceNom)}</span></div>
                    <div className="form-field"><label>{t('date_envoi')}</label><span>{formatDateTime(transaction.dateEnvoi, locale)}</span></div>
                    <div className="form-field"><label>{t('traite_le')}</label><span>{formatDateTime(transaction.dateReponse, locale)}</span></div>
                    <div className="form-field"><label>{t('etat')}</label><span>{formatStatus(transaction.statut, t)}</span></div>
                    <div className="form-field full-width"><label>{t('message')}</label><span>{transaction.message || '-'}</span></div>
                    <div className="form-field full-width"><label>{t('reponse_note')}</label><span>{transaction.messageReponse || formatResponseNote(transaction.messageReponse, transaction.statut, t)}</span></div>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn-primary" onClick={onClose}>{t('fermer')}</button>
                </div>
            </div>
        </div>
    );
}

function formatResponseNote(value, status, t) {
    const note = String(value || '').trim();
    const normalizedNote = normalizeText(note);

    if (!note) {
        return isProcessedStatus(status) ? formatStatus(status, t) : '-';
    }

    if (normalizedNote.includes('annulee par lemetteur') || normalizedNote.includes('annulee par l emetteur')) {
        return translate(t, 'annulee_par_emetteur', "Annulee par l'emetteur");
    }

    if (normalizedNote.includes('document retourne')) {
        return translate(t, 'document_retourne_source', 'Document retourne au service source');
    }

    if (['acceptees', 'acceptee', 'accepte'].includes(normalizedNote)) {
        return t('acceptees');
    }

    if (['refusees', 'refusee', 'refuse'].includes(normalizedNote)) {
        return t('refusees');
    }

    return note;
}

function isLatestTransaction(transaction, transactions) {
    const key = getTransactionDocumentKey(transaction);
    if (!key) return false;

    const latest = transactions
        .filter((item) => getTransactionDocumentKey(item) === key)
        .sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi))[0];

    return latest?.id === transaction.id;
}

function getTransactionDocumentKey(transaction) {
    return [
        transaction.documentType,
        transaction.documentId || transaction.numeroDossierJudiciaire || transaction.numeroCourrier || transaction.numeroBureauOrdre
    ].filter(Boolean).join(':');
}

function formatActor(userName, serviceName) {
    const user = String(userName || '').trim();
    const service = String(serviceName || '').trim();
    if (user && user !== service) return user;
    return service || '-';
}

function formatDateTime(value, locale) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString(locale);
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function formatStatus(value, t) {
    const status = String(value || '').toLowerCase();
    if (status.includes('attente')) return t('en_attente');
    if (status.includes('accept')) return t('acceptees');
    if (status.includes('retourn')) return translate(t, 'retourne', 'Retourné');
    if (status.includes('refus')) return t('refusees');
    if (status.includes('annul')) return translate(t, 'annulees', 'Annulées');
    return value || '-';
}

function formatTransactionRole(tx, currentServiceId, t) {
    const isSource = Number(tx.sourceServiceId) === currentServiceId;
    const isDestination = Number(tx.destinationServiceId) === currentServiceId;

    if (isDestination && isProcessedStatus(tx.statut)) {
        return translate(t, 'effectuee_par_service', 'Effectuee par ce service');
    }

    if (isSource) {
        return translate(t, 'envoyee_par_service', 'Envoyee par ce service');
    }

    if (isDestination) {
        return translate(t, 'recue_par_service', 'Recue par ce service');
    }

    return '-';
}

function isProcessedStatus(value) {
    const status = String(value || '').toLowerCase();
    return status.includes('accept') ||
        status.includes('refus') ||
        status.includes('annul') ||
        status.includes('retourn');
}

function mergeTransactions(...groups) {
    const result = new Map();

    groups.flat().forEach(tx => {
        if (tx?.id !== undefined && tx?.id !== null) {
            result.set(tx.id, tx);
        }
    });

    return Array.from(result.values());
}

function getTime(value) {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function toArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

function getErrorMessage(error, fallback) {
    if (typeof error.response?.data === 'string') return error.response.data;
    if (error.response?.data?.message) return error.response.data.message;
    return fallback;
}

function translate(t, key, fallback) {
    const value = t(key);
    return value === key ? fallback : value;
}

export default TransactionsOutgoing;

