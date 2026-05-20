import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';
import ActionIcon from '../components/ActionIcon';
import { DEFAULT_SERVICES } from '../constants/defaultServices';
import {
    formatLocalizedDateTime,
    getLocalizedResponseMessage,
    getLocalizedServiceName,
    getLocalizedStatus
} from '../utils/localization';

function Notifications() {
    const { t, i18n } = useTranslation();
    const serviceId = Number(localStorage.getItem('idService') || 0);
    const serviceName = String(localStorage.getItem('nomService') || '').toLowerCase();
    const isArchiveAccount = serviceId === 13 || serviceName.includes('archive') || serviceName.includes('archivage');
    const [notifications, setNotifications] = useState([]);
    const [processedTransactions, setProcessedTransactions] = useState([]);
    const [pendingReturns, setPendingReturns] = useState([]);
    const [services, setServices] = useState([]);
    const [responseMsg, setResponseMsg] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentDocument, setCurrentDocument] = useState(null);
    const [transferTarget, setTransferTarget] = useState(null);
    const [transferForm, setTransferForm] = useState(getInitialTransferForm());

    useEffect(() => {
        fetchNotificationData();
        fetchServices();
    }, []);

    const fetchNotificationData = async () => {
        setLoading(true);
        try {
            const [incomingRes, outgoingRes, pendingReturnsRes, allTransactionsRes] = await Promise.all([
                axios.get('/api/transactions/incoming'),
                axios.get('/api/transactions/outgoing'),
                axios.get('/api/transactions/pending-returns'),
                axios.get('/api/transactions', { params: { skipCount: 0, maxResultCount: 1000 } })
            ]);

            const incoming = toArray(incomingRes.data);
            const outgoing = toArray(outgoingRes.data);
            const returns = toArray(pendingReturnsRes.data);
            const allTransactions = toArray(allTransactionsRes.data);
            const fallbackIncoming = allTransactions.filter(tx =>
                Number(tx.destinationServiceId) === serviceId &&
                isPendingStatus(tx.statut)
            );

            setNotifications(mergeTransactions(incoming, fallbackIncoming));
            const fallbackProcessed = allTransactions.filter(tx =>
                isProcessedStatus(tx.statut) &&
                (
                    Number(tx.sourceServiceId) === serviceId ||
                    Number(tx.destinationServiceId) === serviceId ||
                    Number(tx.currentServiceId) === serviceId
                )
            );

            setProcessedTransactions(
                mergeTransactions(outgoing, fallbackProcessed)
                    .filter(tx => isProcessedStatus(tx.statut))
                    .sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi))
                    .slice(0, 20)
            );
            setPendingReturns(returns);
            setError('');
        } catch (err) {
            setError(t('erreur_chargement'));
        } finally {
            setLoading(false);
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

    const handleConsult = async (notification) => {
        try {
            if (!notification.documentId || !notification.documentType) {
                setError(t('id_type_manquant'));
                return;
            }

            const res = await axios.get(`/api/documents/${notification.documentId}?type=${encodeURIComponent(notification.documentType)}`);
            setCurrentDocument(res.data);
            setError('');
        } catch (err) {
            setError(t('impossible_charger'));
        }
    };

    const handleRespond = async (id, accepte) => {
        const message = responseMsg[id] || '';
        try {
            await axios.post(`/api/transactions/${id}/respond`, buildResponsePayload(accepte, message));
            await fetchNotificationData();
            setSuccess(accepte ? t('acceptees') : t('refusees'));
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, t('erreur_reponse')));
        }
    };

    const openTransferModal = (notification) => {
        setTransferTarget(notification);
        setTransferForm(getInitialTransferForm());
        setError('');
        setSuccess('');
    };

    const closeTransferModal = () => {
        setTransferTarget(null);
        setTransferForm(getInitialTransferForm());
    };

    const handleTransfer = async () => {
        if (!transferTarget || !transferForm.serviceId) {
            setError(t('service_destinataire_requis'));
            return;
        }

        try {
            const responseMessage = responseMsg[transferTarget.id] || transferForm.message || '';

            await axios.post(`/api/transactions/${transferTarget.id}/respond`, buildResponsePayload(true, responseMessage));

            await axios.post('/api/transactions', {
                documentId: transferTarget.documentId,
                documentType: transferTarget.documentType,
                sourceServiceId: transferTarget.destinationServiceId,
                destinationServiceId: Number(transferForm.serviceId),
                destinationUserId: null,
                doitRevenir: transferForm.doitRevenir,
                dateEnvoi: new Date(transferForm.dateEnvoi).toISOString(),
                message: transferForm.message
            });

            await fetchNotificationData();
            setSuccess(t('transaction_envoyee'));
            setError('');
            closeTransferModal();
        } catch (err) {
            setError(getErrorMessage(err, t('erreur_transaction')));
        }
    };

    const handleMarkReturned = async (transaction) => {
        if (!window.confirm(t('confirmation_retour'))) return;

        try {
            await axios.post(`/api/transactions/${transaction.id}/mark-returned`);
            await fetchNotificationData();
            setSuccess(translate(t, 'retour_enregistre', 'Retour enregistre'));
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, t('erreur_transaction')));
        }
    };

    if (loading) return <div className="loading">{t('chargement')}</div>;

    return (
        <div className="page-container">
            <h1 className="page-title">{t('notifications')}</h1>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <section className="registry-panel">
                <div className="registry-panel-header">
                    <h3>{t('demandes_attente')}</h3>
                </div>
                {notifications.length === 0 ? (
                    <p className="text-muted">{t('aucune_demande')}</p>
                ) : (
                    <div className="notifications-list">
                        {notifications.map(n => (
                            <div key={n.id} className="notification-card">
                                <div className="notification-header">
                                    <span className="notification-title">{n.documentSujet}</span>
                                    <span className="notification-badge">{t('en_attente')}</span>
                                </div>
                                <div className="notification-details">
                                    <div className="detail-row">
                                        <span className="detail-label">{t('de')} :</span>
                                        <span className="detail-value">{getLocalizedServiceName({ idService: n.sourceServiceId, nomService: n.sourceServiceNom }, i18n)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">{t('message')} :</span>
                                        <span className="detail-value">{n.message || t('non_renseigne')}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">{t('recu_le')} :</span>
                                        <span className="detail-value">{formatLocalizedDateTime(n.dateEnvoi, i18n)}</span>
                                    </div>
                                </div>
                                <textarea
                                    className="response-textarea"
                                    placeholder={t('votre_reponse')}
                                    value={responseMsg[n.id] || ''}
                                    onChange={e => setResponseMsg({ ...responseMsg, [n.id]: e.target.value })}
                                    rows="2"
                                />
                                <div className="notification-actions">
                                    <button type="button" className="action-icon action-view" onClick={() => handleConsult(n)} title={t('consulter')} aria-label={t('consulter')}>
                                        <ActionIcon name="view" />
                                    </button>
                                    <button type="button" className={isArchiveAccount ? 'action-icon action-archive' : 'action-icon action-accept'} onClick={() => handleRespond(n.id, true)} title={isArchiveAccount ? t('archiver') : t('accepter')} aria-label={isArchiveAccount ? t('archiver') : t('accepter')}>
                                        <ActionIcon name={isArchiveAccount ? 'archive' : 'accept'} />
                                    </button>
                                    <button type="button" className="action-icon action-cancel" onClick={() => handleRespond(n.id, false)} title={t('refuser')} aria-label={t('refuser')}>
                                        <ActionIcon name="cancel" />
                                    </button>
                                    <button type="button" className="action-icon action-transfer" onClick={() => openTransferModal(n)} title={t('transferer')} aria-label={t('transferer')}>
                                        <ActionIcon name="transfer" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="registry-panel">
                <div className="registry-panel-header">
                    <h3>{t('transactions_traitees')}</h3>
                </div>
                <div className="data-table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>{t('document')}</th>
                                <th>{t('service_destinataire')}</th>
                                <th>{t('etat')}</th>
                                <th>{translate(t, 'traite_par', 'Traité par')}</th>
                                <th>{translate(t, 'service_traitant', 'Service traitant')}</th>
                                <th>{t('traite_le')}</th>
                                <th>{t('reponse_note')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedTransactions.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center' }}>{t('aucune_transaction')}</td></tr>
                            ) : (
                                processedTransactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{getDocumentLabel(tx)}</td>
                                        <td>{getLocalizedServiceName({ idService: tx.destinationServiceId, nomService: tx.destinationServiceNom }, i18n)}</td>
                                        <td>{formatStatus(tx.statut, t)}</td>
                                        <td>{tx.responderUserName || '-'}</td>
                                        <td>{getLocalizedServiceName({ idService: tx.responderServiceId || tx.destinationServiceId, nomService: tx.responderServiceName || tx.destinationServiceNom }, i18n)}</td>
                                        <td>{formatLocalizedDateTime(tx.dateReponse || tx.dateEnvoi, i18n)}</td>
                                        <td>{getLocalizedResponseMessage(tx.messageReponse, t)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="registry-panel">
                <div className="registry-panel-header">
                    <h3>{t('documents_retourner')}</h3>
                </div>
                <div className="data-table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>{t('document')}</th>
                                <th>{t('service_destinataire')}</th>
                                <th>{t('envoye_le')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingReturns.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center' }}>{t('aucun_document_retour')}</td></tr>
                            ) : (
                                pendingReturns.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{getDocumentLabel(tx)}</td>
                                        <td>{getLocalizedServiceName({ idService: tx.destinationServiceId, nomService: tx.destinationServiceNom }, i18n)}</td>
                                        <td>{formatLocalizedDateTime(tx.dateEnvoi, i18n)}</td>
                                        <td className="action-icons">
                                            <button type="button" onClick={() => handleConsult(tx)} title={t('consulter')} aria-label={t('consulter')} className="action-icon action-view">
                                                <ActionIcon name="view" />
                                            </button>
                                            <button type="button" onClick={() => handleMarkReturned(tx)} title={t('marquer_retourne')} aria-label={t('marquer_retourne')} className="action-icon action-return">
                                                <ActionIcon name="return" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {currentDocument && (
                <DocumentModal document={currentDocument} onClose={() => setCurrentDocument(null)} />
            )}

            {transferTarget && (
                <div className="modal-overlay" onClick={closeTransferModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>{t('transferer')} : {transferTarget.documentSujet}</h3>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>{t('service_destinataire')} *</label>
                                <select
                                    value={transferForm.serviceId}
                                    onChange={e => setTransferForm({ ...transferForm, serviceId: e.target.value })}
                                >
                                    <option value="">--</option>
                                    {services.filter(s => s.idService !== transferTarget.destinationServiceId).map(s => (
                                        <option key={s.idService} value={s.idService}>{getLocalizedServiceName(s, i18n)}</option>
                                    ))}
                                </select>
                            </div>
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
                                <textarea
                                    value={transferForm.message}
                                    onChange={e => setTransferForm({ ...transferForm, message: e.target.value })}
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button className="btn-primary" onClick={handleTransfer}>{t('envoyer')}</button>
                            <button className="btn-secondary" onClick={closeTransferModal}>{t('annuler')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getErrorMessage(error, fallback) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (typeof data?.error === 'string') return data.error;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return fallback;
}

function toArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function mergeTransactions(...groups) {
    const byId = new Map();
    groups.flat().forEach(item => {
        if (item?.id) byId.set(item.id, item);
    });
    return Array.from(byId.values());
}

function isProcessedStatus(value) {
    const status = String(value || '').toLowerCase();
    return status.includes('accept') ||
        status.includes('refus') ||
        status.includes('annul') ||
        status.includes('retourn');
}

function isPendingStatus(value) {
    const status = String(value || '').toLowerCase();
    return status.includes('attente') || status.includes('pending');
}

function getTime(value) {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatStatus(value, t) {
    return getLocalizedStatus(value, t);
}

function getDocumentLabel(transaction) {
    const numero = transaction.numeroCourrier || transaction.numeroDossierJudiciaire;
    return [transaction.documentSujet || transaction.document || '-', numero].filter(Boolean).join(' - ');
}

function translate(t, key, fallback) {
    const value = t(key);
    return value === key ? fallback : value;
}

function getInitialTransferForm() {
    return {
        serviceId: '',
        dateEnvoi: new Date().toISOString().slice(0, 10),
        doitRevenir: false,
        message: ''
    };
}

function buildResponsePayload(accepte, message) {
    return {
        accepte,
        message,
        responderUserName: localStorage.getItem('nomComplet') || localStorage.getItem('login') || '',
        responderServiceId: Number(localStorage.getItem('idService') || 0) || null,
        responderServiceName: localStorage.getItem('nomService') || ''
    };
}

export default Notifications;
