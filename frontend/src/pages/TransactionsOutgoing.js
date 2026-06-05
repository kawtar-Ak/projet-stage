import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ActionIcon from '../components/ActionIcon';
import { useAuth } from '../context/AuthContext';
import { formatLocalizedDateTime, getLocalizedServiceName, getLocalizedStatus } from '../utils/localization';

function TransactionsOutgoing() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const isArabic = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar');
    const direction = isArabic ? 'rtl' : 'ltr';
    const canUseTransactionRegistry = String(user?.login || '').trim().toLowerCase() === 'admin';
    const [transactionsByScope, setTransactionsByScope] = useState({
        service: [],
        all: []
    });
    const transactionScope = 'all';
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const importInputRef = useRef(null);
    const visibleIds = filtered.map(tx => tx.id).filter(id => id !== undefined && id !== null);
    const selectAll = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

    const fetchTransactions = useCallback(() => {
        if (!canUseTransactionRegistry) {
            setTransactionsByScope({ service: [], all: [] });
            setSelectedIds([]);
            return;
        }

        axios.get('/api/app/transaction-workflow', {
            params: { skipCount: 0, maxResultCount: 1000 }
        })
            .then((res) => {
                const allTransactions = toArray(res.data)
                    .sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi));

                setTransactionsByScope({
                    service: allTransactions,
                    all: allTransactions
                });
                setSelectedIds([]);
                setError('');
            })
            .catch(() => setError(t('erreur_chargement')));
    }, [canUseTransactionRegistry, t]);

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

    if (!canUseTransactionRegistry) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSelectAll = (event) => {
        event.stopPropagation();
        setSelectedIds(selectAll ? [] : visibleIds);
    };

    const handleSelectOne = (event, id) => {
        event.stopPropagation();
        setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
    };

    const exportSelected = () => {
        if (selectedIds.length === 0) {
            alert(t('selection_requise'));
            return;
        }

        const selectedTransactions = filtered.filter(tx => selectedIds.includes(tx.id));
        if (selectedTransactions.length === 0) {
            alert(t('selection_requise'));
            return;
        }

        exportTransactionsToExcel(selectedTransactions, filtered, i18n, t);
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
        <div className="page-container transaction-registry-page" dir={direction}>
            <h1 className="page-title">{translate(t, 'registre_transactions', 'Registre des transactions')}</h1>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <div className="filters">
                <button type="button" className="btn-secondary" onClick={() => downloadExcel('/api/transactions/template', 'modele-import-transactions.xlsx')}>
                    <ActionIcon name="fileText" />
                    {t('telecharger_modele')}
                </button>
                <button type="button" className="btn-secondary icon-only-button" data-tooltip={t('importer_excel')} aria-label={t('importer_excel')} onClick={() => importInputRef.current?.click()}>
                    <ActionIcon name="upload" />
                </button>
                <button type="button" className="btn-secondary icon-only-button" data-tooltip={t('exporter_selection')} aria-label={t('exporter_selection')} onClick={exportSelected}>
                    <ActionIcon name="download" />
                </button>
                <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportExcel}
                    style={{ display: 'none' }}
                />
                <input
                    type="text"
                    placeholder={t('rechercher')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button type="button" className="btn-secondary" onClick={fetchTransactions}>
                    {translate(t, 'actualiser', 'Actualiser')}
                </button>
            </div>
            <div className="data-table-wrapper" dir={direction}>
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    aria-label={translate(t, 'selectionner_tout', 'Selectionner tout')}
                                />
                            </th>
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
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(tx => (
                            <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} style={{ cursor: 'pointer' }}>
                                <td onClick={(event) => event.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(tx.id)}
                                        onChange={(event) => handleSelectOne(event, tx.id)}
                                        aria-label={translate(t, 'selectionner', 'Selectionner')}
                                    />
                                </td>
                                <td>{tx.id}</td>
                                <td>{tx.documentId || '-'}</td>
                                <td><AutoText>{formatDocumentType(tx.documentType, t)}</AutoText></td>
                                <td>{tx.numeroBureauOrdre || '-'}</td>
                                <td>{tx.numeroDossierJudiciaire || '-'}</td>
                                <td>{formatDateTime(tx.dateReponse, i18n)}</td>
                                <td>{formatDateTime(tx.dateEnvoi, i18n)}</td>
                                <td><AutoText>{formatDestination(tx, i18n)}</AutoText></td>
                                <td><AutoText>{formatServiceName(tx.sourceServiceNom, tx.sourceServiceId, i18n)}</AutoText></td>
                                <td><AutoText>{formatActor(tx.senderUserName, tx.sourceServiceNom, tx.sourceServiceId, i18n)}</AutoText></td>
                                <td><AutoText>{formatActor(tx.responderUserName, tx.responderServiceName || tx.destinationServiceNom, tx.responderServiceId || tx.destinationServiceId, i18n)}</AutoText></td>
                                <td>{formatStatus(tx.statut, t)}</td>
                                <td>{isLatestTransaction(tx, filtered) ? translate(t, 'oui', 'Oui') : '-'}</td>
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
                    i18n={i18n}
                    direction={direction}
                    t={t}
                    onClose={() => setSelectedTransaction(null)}
                />
            )}
        </div>
    );
}

function TransactionDetailsModal({ transaction, i18n, direction, t, onClose }) {
    return (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
            <div className="modal" dir={direction} onClick={(event) => event.stopPropagation()}>
                <h2>{translate(t, 'details_mouvement', 'Details du mouvement')}</h2>
                <div className="form-grid">
                    <DetailField label="ID" value={transaction.id} />
                    <DetailField label={t('document_id')} value={transaction.documentId || '-'} />
                    <DetailField label={t('type_document')} value={formatDocumentType(transaction.documentType, t)} />
                    <DetailField label={t('numero_bureau_ordre')} value={transaction.numeroBureauOrdre || transaction.numeroCourrier || '-'} />
                    <DetailField label={t('numero_dossier_appel')} value={transaction.numeroDossierJudiciaire || '-'} />
                    <DetailField label={t('emetteur_service')} value={formatServiceName(transaction.sourceServiceNom, transaction.sourceServiceId, i18n)} />
                    <DetailField label={t('recepteur')} value={formatDestination(transaction, i18n)} />
                    <DetailField label={translate(t, 'envoye_par', 'Envoye par')} value={formatActor(transaction.senderUserName, transaction.sourceServiceNom, transaction.sourceServiceId, i18n)} />
                    <DetailField label={translate(t, 'traite_par', 'Traite par')} value={formatActor(transaction.responderUserName, transaction.responderServiceName || transaction.destinationServiceNom, transaction.responderServiceId || transaction.destinationServiceId, i18n)} />
                    <DetailField label={t('date_envoi')} value={formatDateTime(transaction.dateEnvoi, i18n)} />
                    <DetailField label={t('traite_le')} value={formatDateTime(transaction.dateReponse, i18n)} />
                    <div className="form-field"><label>{t('etat')}</label><span>{formatStatus(transaction.statut, t)}</span></div>
                    <DetailField label={t('message')} value={transaction.message || '-'} wide />
                    <DetailField label={t('reponse_note')} value={transaction.messageReponse || formatResponseNote(transaction.messageReponse, transaction.statut, t)} wide />
                </div>
                <div className="form-actions">
                    <button type="button" className="btn-primary" onClick={onClose}>{t('fermer')}</button>
                </div>
            </div>
        </div>
    );
}

function DetailField({ label, value, wide = false }) {
    return (
        <div className={`form-field${wide ? ' full-width' : ''}`}>
            <label>{label}</label>
            <AutoText>{value}</AutoText>
        </div>
    );
}

function AutoText({ children }) {
    return <span dir="auto">{children || '-'}</span>;
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

function formatActor(userName, serviceName, serviceId, i18n) {
    const user = String(userName || '').trim();
    const service = formatServiceName(serviceName, serviceId, i18n);
    if (user && user !== service) return user;
    return service || '-';
}

function formatDestination(transaction, i18n) {
    return formatActor(transaction.destinationUserName, transaction.destinationServiceNom, transaction.destinationServiceId, i18n);
}

function formatServiceName(serviceName, serviceId, i18n) {
    return getLocalizedServiceName({ idService: serviceId, nomService: serviceName }, i18n);
}

function formatDateTime(value, i18n) {
    return formatLocalizedDateTime(value, i18n);
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
    return getLocalizedStatus(value, t);
}

function formatDocumentType(value, t) {
    const normalized = normalizeText(value);
    if (!normalized) return '-';
    if (normalized.includes('administratif')) return translate(t, 'document_administratif', 'Administratif');
    if (normalized.includes('judiciaire')) return translate(t, 'document_judiciaire', 'Judiciaire');
    return value || '-';
}

function formatStatusLegacy(value, t) {
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

function getTime(value) {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function toArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function exportTransactionsToExcel(transactions, allTransactions, i18n, t) {
    const headers = [
        'ID',
        translate(t, 'document_id', 'Document ID'),
        translate(t, 'type_document', 'Type document'),
        translate(t, 'numero_bureau_ordre', 'Numero BO'),
        translate(t, 'numero_dossier_appel', 'Numero dossier judiciaire'),
        translate(t, 'recepteur', 'Recepteur'),
        translate(t, 'emetteur_service', 'Service source'),
        translate(t, 'envoye_par', 'Envoye par'),
        translate(t, 'traite_par', 'Traite par'),
        translate(t, 'etat', 'Etat'),
        translate(t, 'date_reception', 'Date reception'),
        translate(t, 'date_envoi', 'Date envoi'),
        translate(t, 'derniere_transaction', 'Derniere transaction'),
        translate(t, 'message', 'Message'),
        translate(t, 'reponse_note', 'Reponse'),
        translate(t, 'service', 'Service courant'),
        translate(t, 'emplacement', 'Emplacement')
    ];

    const rows = transactions.map(tx => [
        tx.id,
        tx.documentId || '',
        formatDocumentType(tx.documentType, t),
        tx.numeroBureauOrdre || tx.numeroCourrier || '',
        tx.numeroDossierJudiciaire || '',
        formatDestination(tx, i18n),
        formatServiceName(tx.sourceServiceNom, tx.sourceServiceId, i18n),
        formatActor(tx.senderUserName, tx.sourceServiceNom, tx.sourceServiceId, i18n),
        formatActor(tx.responderUserName, tx.responderServiceName || tx.destinationServiceNom, tx.responderServiceId || tx.destinationServiceId, i18n),
        formatStatus(tx.statut, t),
        formatDateTime(tx.dateReponse, i18n),
        formatDateTime(tx.dateEnvoi, i18n),
        isLatestTransaction(tx, allTransactions) ? translate(t, 'oui', 'Oui') : '',
        tx.message || '',
        tx.messageReponse || formatResponseNote(tx.messageReponse, tx.statut, t),
        tx.currentServiceNom || '',
        tx.currentLocation || ''
    ]);

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; vertical-align: middle; mso-number-format:"\\@"; }
th { background: #0f6d7d; color: #fff; font-weight: 700; }
td { background: #f2f2f2; }
</style>
</head>
<body>
<table>
<thead><tr>${headers.map(header => `<th>${escapeExcelHtml(header)}</th>`).join('')}</tr></thead>
<tbody>
${rows.map(row => `<tr>${row.map(value => `<td>${escapeExcelHtml(value)}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>
</body>
</html>`;

    downloadExcelHtml(html, `transactions-selectionnees-${formatFileDate(new Date())}.xls`);
}

function downloadExcelHtml(html, fileName) {
    const blob = new Blob(['\ufeff', html], {
        type: 'application/vnd.ms-excel;charset=utf-8'
    });
    downloadBlob(blob, fileName);
}

function escapeExcelHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatFileDate(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        pad(date.getHours()),
        pad(date.getMinutes())
    ].join('');
}

function downloadBlob(blob, fileName) {
    const fileBlob = blob instanceof Blob ? blob : new Blob([blob]);
    const url = window.URL.createObjectURL(fileBlob);
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

