import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';
import ActionIcon from '../components/ActionIcon';
import ConseillerRapporteurSelect, { isConseillerRapporteurService } from '../components/ConseillerRapporteurSelect';
import SyncedHorizontalScroll from '../components/SyncedHorizontalScroll';
import { DEFAULT_SERVICES } from '../constants/defaultServices';
import { useAuth } from '../context/AuthContext';
import { getLocalizedServiceName } from '../utils/localization';

function MesEntites() {
    const { t, i18n } = useTranslation();
    const isArabic = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar');
    const dateLocale = isArabic ? 'ar-MA' : 'fr-FR';
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [services, setServices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [transferForm, setTransferForm] = useState(getInitialTransferForm());
    const [sentDocumentKeys, setSentDocumentKeys] = useState(new Set());
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalDocument, setModalDocument] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    const filteredDocuments = useMemo(
        () => filterDocuments(documents, searchTerm),
        [documents, searchTerm]
    );
    const selectedDocuments = useMemo(
        () => filteredDocuments.filter((doc) => selectedKeys.has(getDocumentKey(doc))),
        [filteredDocuments, selectedKeys]
    );
    const allVisibleSelected = filteredDocuments.length > 0 &&
        filteredDocuments.every((doc) => selectedKeys.has(getDocumentKey(doc)));

    useEffect(() => {
        fetchDocuments();
        fetchServices();
    }, [user?.idService]);

    const fetchDocuments = async () => {
        try {
            const currentServiceId = Number(user?.idService || localStorage.getItem('idService') || 0);
            const documentsRes = await axios.get('/api/documents')
                .catch(() => ({ data: [] }));
            const endpointDocuments = toArray(documentsRes.data);
            const existingDocumentKeys = new Set(endpointDocuments.map(getDocumentKey));
            const visibleDocuments = endpointDocuments
                .filter((doc) => Number(doc.idService) === currentServiceId);

            setDocuments(normalizeDocuments(visibleDocuments));
            setSelectedKeys((previous) => {
                const existingKeys = new Set(visibleDocuments.map(getDocumentKey));
                return new Set(Array.from(previous).filter((key) => existingKeys.has(key)));
            });
            fetchSentTransactions(existingDocumentKeys);
            setError('');
        } catch (err) {
            setError(t('erreur_chargement'));
        }
    };

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/services');
            setServices(res.data?.length > 0 ? res.data : DEFAULT_SERVICES);
        } catch (err) {
            setServices(DEFAULT_SERVICES);
        }
    };

    const fetchSentTransactions = async (existingDocumentKeys = null) => {
        try {
            const res = await axios.get('/api/transactions/outgoing');
            const currentServiceId = Number(user?.idService || localStorage.getItem('idService') || 0);
            setSentDocumentKeys(
                new Set(toArray(res.data)
                    .filter((transaction) =>
                        Number(transaction.sourceServiceId) === currentServiceId &&
                        isActiveOutgoingTransferStatus(transaction.statut)
                    )
                    .map((transaction) => getDocumentKey({
                        idEntite: transaction.documentId,
                        type: transaction.documentType
                    }))
                    .filter((key) => !existingDocumentKeys || existingDocumentKeys.has(key)))
            );
        } catch (err) {
            setSentDocumentKeys(new Set());
        }
    };

    const openTransferModal = (doc) => {
        if (!canShowTransferButton(doc, sentDocumentKeys)) return;
        if (isAlreadySentFromService(doc, sentDocumentKeys)) {
            setError(translate(t, 'document_deja_transmis', 'Ce dossier a deja ete transmis par ce service.'));
            return;
        }

        setSelectedDoc(doc);
        setTransferForm(getInitialTransferForm());
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const handleServiceChange = (serviceId) => {
        const nextServiceId = serviceId || '';
        setTransferForm({
            ...transferForm,
            serviceId: nextServiceId,
            destinationUserId: isConseillerRapporteurService(nextServiceId) ? transferForm.destinationUserId : ''
        });
    };

    const handleTransfer = async () => {
        if (!selectedDoc || !transferForm.serviceId) {
            setError(t('service_destinataire_requis'));
            return;
        }

        try {
            if (!selectedDoc.estTransmissible) {
                setError(translate(t, 'document_non_transmissible', 'Ce dossier n est pas transmissible.'));
                return;
            }

            if (isAlreadySentFromService(selectedDoc, sentDocumentKeys)) {
                setError(translate(t, 'document_deja_transmis', 'Ce dossier a deja ete transmis par ce service.'));
                return;
            }

            await axios.post('/api/transactions', {
                documentId: selectedDoc.idEntite,
                documentType: selectedDoc.type,
                sourceServiceId: Number(selectedDoc.idService || user?.idService || localStorage.getItem('idService') || 0),
                destinationServiceId: Number(transferForm.serviceId),
                destinationUserId: isConseillerRapporteurService(transferForm.serviceId)
                    ? Number(transferForm.destinationUserId)
                    : null,
                doitRevenir: transferForm.doitRevenir,
                dateEnvoi: new Date(transferForm.dateEnvoi).toISOString(),
                message: transferForm.message
            });
            setShowModal(false);
            setSelectedDoc(null);
            setSuccess(translate(t, 'transaction_envoyee_message', 'Transaction envoyee avec succes.'));
            setError('');
            fetchDocuments();
            fetchSentTransactions();
        } catch (err) {
            setError(getErrorMessage(err, t('erreur_transaction')));
        }
    };

    const handleConsult = async (doc) => {
        try {
            const res = await axios.get(`/api/documents/${doc.idEntite}?type=${encodeURIComponent(doc.type)}`);
            setModalDocument({
                ...res.data,
                numeroBureauOrdre: res.data.numeroBureauOrdre || doc.numeroBureauOrdre || doc.idBureauOrdre || doc.numeroCourrier,
                numeroCourrier: res.data.numeroCourrier || doc.numeroCourrier || doc.numeroBureauOrdre || doc.idBureauOrdre,
                numeroDossierJudiciaire: res.data.numeroDossierJudiciaire || doc.numeroDossierJudiciaire
            });
        } catch (err) {
            setModalDocument(doc);
        }
        setIsModalOpen(true);
    };

    const toggleDocumentSelection = (doc) => {
        const key = getDocumentKey(doc);
        setSelectedKeys((previous) => {
            const next = new Set(previous);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });
    };

    const toggleAllVisibleSelection = () => {
        setSelectedKeys((previous) => {
            const next = new Set(previous);
            if (allVisibleSelected) {
                filteredDocuments.forEach((doc) => next.delete(getDocumentKey(doc)));
            } else {
                filteredDocuments.forEach((doc) => next.add(getDocumentKey(doc)));
            }

            return next;
        });
    };

    const handleExport = () => {
        const rows = selectedDocuments.length > 0 ? selectedDocuments : filteredDocuments;
        if (rows.length === 0) {
            setError(translate(t, 'aucun_element_exporter', 'Aucun element a exporter.'));
            return;
        }

        exportDocumentsExcel(rows, t);
        setSuccess(translate(t, 'export_effectue', 'Export effectue.'));
        setError('');
    };

    const resetSearch = () => {
        setSearchTerm('');
        setSelectedKeys(new Set());
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalDocument(null);
    };

    return (
        <div className="page-container entities-management-page" dir={isArabic ? 'rtl' : 'ltr'}>
            <h1 className="page-title">{t('mes_entites')}</h1>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="registry-panel">
                <div className="registry-panel-header">
                    <h3>{translate(t, 'recherche_registre', 'Recherche registre')}</h3>
                </div>

                <div className="filters">
                    <form className="search-form" onSubmit={(event) => event.preventDefault()}>
                        <div className="search-input-row">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder={translate(t, 'rechercher', 'Rechercher')}
                            />
                        </div>

                        <div className="search-control-row">
                            <span className="selection-summary">
                                {formatSelectionCount(t, selectedDocuments.length)}
                            </span>
                            <button type="button" className="btn-secondary" onClick={resetSearch}>
                                {t('reinitialiser')}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="data-table-wrapper search-results-table mes-entities-results">
                    <div className="data-table-header">
                        <h3>{translate(t, 'tous_les_dossiers', 'Tous les dossiers')} ({filteredDocuments.length})</h3>
                        <div className="registry-tools table-registry-tools">
                            <button type="button" className="btn-primary icon-only-button" data-tooltip={t('exporter_excel')} aria-label={t('exporter_excel')} onClick={handleExport}>
                                <ActionIcon name="download" />
                            </button>
                        </div>
                    </div>

                    <SyncedHorizontalScroll className="mes-entities-table-scroll">
                    <table className="modern-table registry-table mes-entities-table">
                    <thead>
                        <tr>
                            <th className="selection-column">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleAllVisibleSelection}
                                    aria-label={translate(t, 'selectionner_tout', 'Selectionner tout')}
                                />
                            </th>
                            <th>{translate(t, 'ordre', 'Ordre')}</th>
                            <th>{t('id')}</th>
                            <th>{t('titre')}</th>
                            <th>{t('type')}</th>
                            <th>{translate(t, 'numero', 'Numéro')}</th>
                            <th>{t('date')}</th>
                            <th>{translate(t, 'date_enregistrement', 'Date enregistrement')}</th>
                            <th>{t('source')}</th>
                            <th>{t('destinataire')}</th>
                            <th>{t('service')}</th>
                            <th>{t('transmissible')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDocuments.length === 0 ? (
                            <tr>
                                <td colSpan="13" className="loading">{t('aucun_document')}</td>
                            </tr>
                        ) : (
                            filteredDocuments.map(doc => {
                                const showTransferButton = canShowTransferButton(doc, sentDocumentKeys);
                                const documentKey = getDocumentKey(doc);
                                const transferAlreadySent = sentDocumentKeys.has(documentKey);

                                return (
                                    <tr key={`${doc.idEntite}_${doc.type}`}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedKeys.has(documentKey)}
                                                onChange={() => toggleDocumentSelection(doc)}
                                                aria-label={translate(t, 'selectionner', 'Selectionner')}
                                            />
                                        </td>
                                        <td>{doc.ordre}</td>
                                        <td>{doc.idEntite}</td>
                                        <td>{doc.sujet || '-'}</td>
                                        <td>{doc.type}</td>
                                        <td>{doc.numeroCourrier || doc.numeroDossierJudiciaire || '-'}</td>
                                        <td>{doc.dateCreation ? new Date(doc.dateCreation).toLocaleString(dateLocale) : '-'}</td>
                                        <td>{doc.dateEnregistrement ? new Date(doc.dateEnregistrement).toLocaleString(dateLocale) : '-'}</td>
                                        <td>{doc.source || '-'}</td>
                                        <td>{doc.destinataire || '-'}</td>
                                        <td>{doc.serviceNom || doc.idService || '-'}</td>
                                        <td>{doc.estTransmissible ? t('oui') : t('non')}</td>
                                        <td className="action-icons">
                                            <button type="button" onClick={() => handleConsult(doc)} title={t('consulter')} aria-label={t('consulter')} className="action-icon action-view">
                                                <ActionIcon name="view" />
                                            </button>
                                            {showTransferButton && (
                                                <button
                                                    type="button"
                                                    onClick={() => openTransferModal(doc)}
                                                    disabled={transferAlreadySent}
                                                    title={transferAlreadySent ? translate(t, 'document_deja_transmis', 'Ce dossier a deja ete transmis par ce service.') : t('transferer')}
                                                    aria-label={transferAlreadySent ? translate(t, 'document_deja_transmis', 'Ce dossier a deja ete transmis par ce service.') : t('transferer')}
                                                    className="action-icon action-transfer"
                                                >
                                                    <ActionIcon name="transfer" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    </table>
                    </SyncedHorizontalScroll>
                </div>
            </div>

            {showModal && selectedDoc && (
                <>
                    <div className="modal-overlay" onClick={() => setShowModal(false)} />
                    <div className="modal">
                        <h3>{t('transferer')} : {selectedDoc.sujet}</h3>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>{t('service_destinataire')} *</label>
                                <select value={transferForm.serviceId} onChange={e => handleServiceChange(Number(e.target.value))}>
                                    <option value="">--</option>
                                    {services.filter(s => s.idService !== selectedDoc.idService).map(s => (
                                        <option key={s.idService} value={s.idService}>{getLocalizedServiceName(s, i18n)}</option>
                                    ))}
                                </select>
                            </div>
                            <ConseillerRapporteurSelect
                                serviceId={transferForm.serviceId}
                                value={transferForm.destinationUserId}
                                onChange={destinationUserId => setTransferForm({ ...transferForm, destinationUserId })}
                                t={t}
                                required
                            />
                            <div className="form-field">
                                <label>{t('date')} *</label>
                                <input
                                    type="date"
                                    value={transferForm.dateEnvoi}
                                    onChange={e => setTransferForm({ ...transferForm, dateEnvoi: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-field">
                                <label className="checkbox-field">
                                    <input
                                        type="checkbox"
                                        checked={transferForm.doitRevenir}
                                        onChange={e => setTransferForm({ ...transferForm, doitRevenir: e.target.checked })}
                                    />
                                    {t('doit_revenir')}
                                </label>
                            </div>
                            <div className="form-field full-width">
                                <label>{t('message')}</label>
                                <textarea value={transferForm.message} onChange={e => setTransferForm({ ...transferForm, message: e.target.value })} rows="3" />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button className="btn-primary" onClick={handleTransfer}>{t('envoyer')}</button>
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>{t('annuler')}</button>
                        </div>
                    </div>
                </>
            )}

            {isModalOpen && modalDocument && (
                <DocumentModal document={modalDocument} onClose={closeModal} />
            )}
        </div>
    );
}

function getInitialTransferForm() {
    return {
        serviceId: '',
        destinationUserId: '',
        dateEnvoi: new Date().toISOString().slice(0, 10),
        doitRevenir: false,
        message: ''
    };
}

function normalizeDocuments(data) {
    const items = Array.isArray(data) ? data : [];

    return items
        .map((item, index) => ({
            ...item,
            ordre: item.ordre || index + 1
        }))
        .sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
}

function formatSelectionCount(t, count) {
    const translated = t('selection_count', { count });
    return translated === 'selection_count' ? `${count} selectionne(s)` : translated;
}

function filterDocuments(documents, searchTerm) {
    const keyword = normalizeSearch(searchTerm);
    if (!keyword) return documents;

    return documents.filter((doc) => normalizeSearch([
        doc.ordre,
        doc.idEntite,
        doc.sujet,
        doc.type,
        doc.numeroCourrier,
        doc.numeroDossierJudiciaire,
        doc.dateCreation,
        doc.dateEnregistrement,
        doc.source,
        doc.destinataire,
        doc.serviceNom,
        doc.idService,
        doc.etat,
        doc.etatArchive,
        doc.description
    ].join(' ')).includes(keyword));
}

function exportDocumentsExcel(documents, t) {
    const headers = [
        translate(t, 'ordre', 'Ordre'),
        t('id'),
        t('titre'),
        t('type'),
        translate(t, 'numero', 'Numero'),
        t('date'),
        translate(t, 'date_enregistrement', 'Date enregistrement'),
        t('source'),
        t('destinataire'),
        t('service'),
        t('transmissible'),
        translate(t, 'etat', 'Etat'),
        t('description')
    ];

    const rows = documents.map((doc) => [
        doc.ordre,
        doc.idEntite,
        doc.sujet,
        doc.type,
        doc.numeroCourrier || doc.numeroDossierJudiciaire,
        formatExportDate(doc.dateCreation),
        formatExportDate(doc.dateEnregistrement),
        doc.source,
        doc.destinataire,
        doc.serviceNom || doc.idService,
        doc.estTransmissible ? t('oui') : t('non'),
        doc.etat || doc.etatArchive,
        doc.description
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
<thead><tr>${headers.map((header) => `<th bgcolor="#0f6d7d" style="background-color:#0f6d7d;color:#ffffff;font-weight:700;border:1px solid #333;padding:6px 8px;text-align:center;vertical-align:middle;">${escapeExcelHtml(header)}</th>`).join('')}</tr></thead>
<tbody>
${rows.map((row) => `<tr>${row.map((value) => `<td bgcolor="#f2f2f2" style="background-color:#f2f2f2;border:1px solid #333;padding:6px 8px;text-align:center;vertical-align:middle;mso-number-format:'\\@';">${escapeExcelHtml(value)}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>
</body>
</html>`;
    const blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mes-entites-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function escapeExcelHtml(value) {
    const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatExportDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
}

function normalizeSearch(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function canShowTransferButton(doc) {
    return Boolean(doc?.estTransmissible);
}

function isAlreadySentFromService(doc, sentDocumentKeys) {
    return sentDocumentKeys.has(getDocumentKey(doc));
}

function isActiveOutgoingTransferStatus(statut) {
    const value = String(statut || '').toLowerCase();
    return (
        value === 'enattente' ||
        value === 'en attente' ||
        value === 'pending' ||
        value.includes('accept')
    );
}

function getDocumentKey(doc) {
    return `${normalizeDocumentType(doc?.type)}:${doc?.idEntite ?? ''}`;
}

function normalizeDocumentType(value) {
    return String(value || '').trim().toLowerCase();
}

function toArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function translate(t, key, fallback) {
    const value = t(key);
    return value === key ? fallback : value;
}

function getErrorMessage(error, fallback) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (typeof data?.error === 'string') return data.error;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return fallback;
}

export default MesEntites;
