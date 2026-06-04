import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';
import ActionIcon from '../components/ActionIcon';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../dashboards/AdminDashboard';
import JudicialSearch from '../components/JudicialSearch';
import {
    formatLocalizedDateTime,
    getLocalizedResponseMessage,
    getLocalizedServiceName,
    getLocalizedStatus
} from '../utils/localization';

function Dashboard() {
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [pending, setPending] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [pendingReturns, setPendingReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hiddenIds, setHiddenIds] = useState([]);
    const [showDocModal, setShowDocModal] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(null);
    const serviceId = Number(user?.idService || localStorage.getItem('idService') || 0);
    const isArchiveService = serviceId === 13;
    const isGreffeService = serviceId === 2;
    const isConseillerRapporteur = serviceId === 15 || String(user?.nomService || '').toLowerCase().includes('conseiller');
    const isAdminService = !isConseillerRapporteur && (serviceId === 1 || serviceId === 5 || user?.readOnly);
    const handlesIncomingRequests = true;

    useEffect(() => {
        const stored = localStorage.getItem('hiddenDashboardTransactions');
        if (stored) setHiddenIds(JSON.parse(stored));
    }, []);

    useEffect(() => {
        if (isAdminService) {
            setLoading(false);
            return;
        }
        fetchData();
    }, [hiddenIds, serviceId, isAdminService]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pendingRes, historyRes, returnsRes, allTransactionsRes] = await Promise.all([
                isArchiveService
                    ? axios.get('/api/transactions', { params: { skipCount: 0, maxResultCount: 1000 } })
                    : handlesIncomingRequests
                    ? axios.get('/api/transactions/incoming')
                    : axios.get('/api/transactions/outgoing'),
                isArchiveService
                    ? axios.get('/api/transactions', { params: { skipCount: 0, maxResultCount: 1000 } })
                    : axios.get('/api/transactions/outgoing'),
                axios.get('/api/transactions/pending-returns'),
                axios.get('/api/transactions', { params: { skipCount: 0, maxResultCount: 1000 } })
            ]);
            const pendingTransactions = toArray(pendingRes.data);
            const historyTransactions = toArray(historyRes.data);
            const allTransactions = toArray(allTransactionsRes.data);
            const fallbackPending = allTransactions.filter(tx =>
                Number(tx.destinationServiceId) === serviceId &&
                isPending(tx.statut)
            );
            const visiblePending = isArchiveService
                ? mergeTransactions(pendingTransactions, fallbackPending).filter(tx => Number(tx.destinationServiceId) === serviceId)
                : mergeTransactions(pendingTransactions, fallbackPending).filter(tx =>
                    Number(tx.sourceServiceId) === serviceId ||
                    Number(tx.destinationServiceId) === serviceId ||
                    Number(tx.currentServiceId) === serviceId
                );
            const visibleHistory = isArchiveService
                ? historyTransactions.filter(tx => Number(tx.destinationServiceId) === serviceId)
                : historyTransactions.filter(tx =>
                    Number(tx.sourceServiceId) === serviceId ||
                    Number(tx.destinationServiceId) === serviceId ||
                    Number(tx.currentServiceId) === serviceId
                );
            const filteredPending = visiblePending.filter(tx => !hiddenIds.includes(tx.id));
            const filteredHistory = visibleHistory.filter(tx => !hiddenIds.includes(tx.id));
            setPending(filteredPending.filter(tx => isPending(tx.statut)));
            setCompleted(filteredHistory.filter(tx => isAccepted(tx.statut) || isRejected(tx.statut)));
            setPendingReturns(toArray(returnsRes.data));
            setError('');
        } catch (err) {
            setError(t('erreur_chargement_donnees'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (window.confirm(t('confirmation_annuler'))) {
            try {
                await axios.post(`/api/transactions/${id}/cancel`);
                await fetchData();
                setSuccess(translate(t, 'transaction_annulee_message', 'Transaction annulee avec succes.'));
                setError('');
            } catch (err) {
                setError(getErrorMessage(err, t('erreur')));
            }
        }
    };

    const handleHide = (id) => {
        if (window.confirm(t('confirmation_masquer'))) {
            const newHidden = [...hiddenIds, id];
            setHiddenIds(newHidden);
            localStorage.setItem('hiddenDashboardTransactions', JSON.stringify(newHidden));
        }
    };

    const handleMarkReturned = async (id) => {
        if (window.confirm(t('confirmation_retour'))) {
            try {
                await axios.post(`/api/transactions/${id}/mark-returned`);
                await fetchData();
                setSuccess(translate(t, 'transaction_retournee_message', 'Retour du document enregistre avec succes.'));
                setError('');
            } catch (err) {
                setError(getErrorMessage(err, t('erreur')));
            }
        }
    };

    const handleConsult = async (tx) => {
        try {
            if (!tx.documentId || !tx.documentType) {
                alert(t('id_type_manquant'));
                return;
            }
            const res = await axios.get(`/api/documents/${tx.documentId}?type=${encodeURIComponent(tx.documentType)}`);
            setCurrentDocument({
                ...res.data,
                numeroBureauOrdre: res.data.numeroBureauOrdre || tx.numeroBureauOrdre || tx.numeroCourrier,
                numeroCourrier: res.data.numeroCourrier || tx.numeroCourrier || tx.numeroBureauOrdre,
                numeroDossierJudiciaire: res.data.numeroDossierJudiciaire || tx.numeroDossierJudiciaire
            });
            setShowDocModal(true);
        } catch (err) {
            alert(t('impossible_charger'));
        }
    };

    const handleRespond = async (id, accepte) => {
        try {
            await axios.post(`/api/transactions/${id}/respond`, {
                accepte,
                message: accepte ? t('acceptees') : t('refusees'),
                responderUserName: localStorage.getItem('nomComplet') || localStorage.getItem('login') || '',
                responderServiceId: Number(localStorage.getItem('idService') || 0) || null,
                responderServiceName: localStorage.getItem('nomService') || ''
            });
            await fetchData();
            setSuccess(accepte
                ? translate(t, 'transaction_acceptee_message', 'Transaction acceptee avec succes.')
                : translate(t, 'transaction_refusee_message', 'Transaction refusee avec succes.'));
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, t('erreur')));
        }
    };

    const stats = {
        pending: pending.length,
        accepted: completed.filter(tx => isAccepted(tx.statut)).length,
        rejected: completed.filter(tx => isRejected(tx.statut)).length,
        cancelled: completed.filter(tx => isCancelled(tx.statut)).length,
    };

    if (isAdminService) return <AdminDashboard />;
    if (loading) return <div className="loading">{t('chargement')}</div>;

    if (isConseillerRapporteur) {
        return (
            <div className="dashboard-container">
                {error && <div className="error-message">{error}</div>}
                <JudicialSearch />
            </div>
        );
    }

    return (
        <div className="dashboard-container service-dashboard">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <div className="stats-grid">
                <div className="stat-card pending">
                    <div className="stat-label">{t('en_attente')}</div>
                    <div className="stat-value">{stats.pending}</div>
                </div>
                <div className="stat-card accepted">
                    <div className="stat-label">{t('acceptees')}</div>
                    <div className="stat-value">{stats.accepted}</div>
                </div>
                <div className="stat-card rejected">
                    <div className="stat-label">{t('refusees')}</div>
                    <div className="stat-value">{stats.rejected}</div>
                </div>
                <div className="stat-card cancelled">
                    <div className="stat-label">{t('annulees')}</div>
                    <div className="stat-value">{stats.cancelled}</div>
                </div>
            </div>

            <JudicialSearch />

            <Section title={t('demandes_attente')}>
                {pending.length === 0 ? (
                    <p className="text-muted">{t('aucune_demande')}</p>
                ) : (
                    <div className="transaction-list">
                        {pending.map(tx => (
                            <TransactionItem
                                key={tx.id}
                                tx={tx}
                                badge={t('en_attente')}
                                i18n={i18n}
                                t={t}
                                actions={canRespondToTransaction(tx, serviceId) ? [
                                    <button key="view" className="action-link view" onClick={() => handleConsult(tx)} title={t('consulter')} aria-label={t('consulter')}><ActionIcon name="view" /></button>,
                                    <button key="accept" className="action-link accept" onClick={() => handleRespond(tx.id, true)} title={isArchiveService ? t('archiver') : t('accepter')} aria-label={isArchiveService ? t('archiver') : t('accepter')}><ActionIcon name={isArchiveService ? 'archive' : 'accept'} /></button>,
                                    <button key="reject" className="action-link cancel" onClick={() => handleRespond(tx.id, false)} title={t('refuser')} aria-label={t('refuser')}><ActionIcon name="cancel" /></button>
                                ] : [
                                    <button key="view" className="action-link view" onClick={() => handleConsult(tx)} title={t('consulter')} aria-label={t('consulter')}><ActionIcon name="view" /></button>,
                                    <button key="cancel" className="action-link cancel" onClick={() => handleCancel(tx.id)} title={t('annuler')} aria-label={t('annuler')}><ActionIcon name="cancel" /></button>
                                ]}
                            />
                        ))}
                    </div>
                )}
            </Section>

            <Section title={t('transactions_traitees')}>
                {completed.length === 0 ? (
                    <p className="text-muted">{t('aucune_transaction')}</p>
                ) : (
                    <div className="transaction-list">
                        {completed.map(tx => (
                            <TransactionItem
                                key={tx.id}
                                tx={tx}
                                badge={translateStatus(tx.statut, t)}
                                i18n={i18n}
                                t={t}
                                note={getLocalizedResponseMessage(tx.messageReponse, t)}
                                date={tx.dateReponse}
                                dateLabel={t('traite_le')}
                                actions={[
                                    <button key="view" className="action-link view" onClick={() => handleConsult(tx)} title={t('consulter')} aria-label={t('consulter')}><ActionIcon name="view" /></button>,
                                    <button key="hide" className="action-link hide" onClick={() => handleHide(tx.id)} title={t('masquer')} aria-label={t('masquer')}><ActionIcon name="hide" /></button>
                                ]}
                            />
                        ))}
                    </div>
                )}
            </Section>

            <Section title={t('documents_retourner')}>
                {pendingReturns.length === 0 ? (
                    <p className="text-muted">{t('aucun_document_retour')}</p>
                ) : (
                    <div className="transaction-list">
                        {pendingReturns.map(tx => (
                            <TransactionItem
                                key={tx.id}
                                tx={tx}
                                badge={t('en_attente_retour')}
                                i18n={i18n}
                                t={t}
                                actions={[
                                    <button key="view" className="action-link view" onClick={() => handleConsult(tx)} title={t('consulter')} aria-label={t('consulter')}><ActionIcon name="view" /></button>,
                                    <button key="return" className="action-link accept" onClick={() => handleMarkReturned(tx.id)} title={t('marquer_retourne')} aria-label={t('marquer_retourne')}><ActionIcon name="return" /></button>
                                ]}
                            />
                        ))}
                    </div>
                )}
            </Section>

            {showDocModal && (
                <DocumentModal document={currentDocument} onClose={() => setShowDocModal(false)} />
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <>
            <div className="section-title">
                <span>{title}</span>
            </div>
            {children}
        </>
    );
}

function TransactionItem({ tx, badge, i18n, t, actions, date }) {
    const detailRows = getTransactionDetailRows(tx, t, i18n, date || tx.dateReponse || tx.dateEnvoi);

    return (
        <div className="transaction-item">
            <div className="transaction-header">
                <span className="transaction-title">{tx.documentSujet}</span>
                <span className="transaction-badge badge-pending">{badge}</span>
            </div>
            <div className="transaction-details">
                {detailRows.map(row => (
                    <span
                        key={row.key}
                        className={row.key === 'dossier-judiciaire' ? 'dossier-number-detail' : row.key === 'bureau-ordre' ? 'bureau-number-detail' : undefined}
                    >
                        {row.label} : {row.value}
                    </span>
                ))}
            </div>
            <div className="transaction-actions">{actions}</div>
        </div>
    );
}

function formatSourceName(transaction, i18n) {
    return transaction.senderUserName ||
        getLocalizedServiceName({ idService: transaction.sourceServiceId, nomService: transaction.sourceServiceNom }, i18n) ||
        '-';
}

function getTransactionDetailRows(tx, t, i18n, processedAt) {
    const rows = [];
    const bureauOrdre = tx.numeroBureauOrdre || tx.numeroCourrier;
    const dossierJudiciaire = tx.numeroDossierJudiciaire;
    const sender = formatSourceName(tx, i18n);

    if (dossierJudiciaire) {
        rows.push({
            key: 'dossier-judiciaire',
            label: t('numero_dossier_judiciaire'),
            value: dossierJudiciaire
        });
    }

    if (bureauOrdre) {
        rows.push({
            key: 'bureau-ordre',
            label: t('numero_bureau_ordre'),
            value: bureauOrdre
        });
    }

    rows.push({
        key: 'etat',
        label: t('etat'),
        value: formatDocumentState(tx, t)
    });

    if (processedAt) {
        rows.push({
            key: 'processed-at',
            label: t('traite_le'),
            value: formatLocalizedDateTime(processedAt, i18n)
        });
    }

    if (sender && sender !== '-') {
        rows.push({
            key: 'sent-by',
            label: t('envoye_par'),
            value: sender
        });
    }

    if (rows.length === 1) {
        rows.unshift({
            key: 'current-location',
            label: translate(t, 'emplacement_actuel', 'Emplacement actuel'),
            value: getLocalizedServiceName({ idService: tx.currentServiceId, nomService: tx.currentServiceNom || tx.currentLocation }, i18n)
        });
    }

    return rows;
}

function normalizeStatus(value) {
    return String(value || '').toLowerCase();
}

function isPending(value) {
    const status = normalizeStatus(value);
    return status.includes('attente') || status.includes('pending');
}

function canRespondToTransaction(transaction, serviceId) {
    return Number(transaction?.destinationServiceId) === Number(serviceId);
}

function isAccepted(value) {
    const status = normalizeStatus(value);
    return status.includes('accept');
}

function isRejected(value) {
    const status = normalizeStatus(value);
    return status.includes('refus');
}

function isCancelled(value) {
    const status = normalizeStatus(value);
    return status.includes('annul');
}

function translateStatus(value, t) {
    return getLocalizedStatus(value, t);
}

function formatDocumentState(transaction, t) {
    const rawState = transaction?.documentEtat || transaction?.etatArchive || transaction?.etat || '';
    const state = String(rawState || '').trim().toLowerCase();

    if (state.includes('nouveau') || state.includes('new')) return t('etat_nouveau');
    if (state.includes('cours') || state.includes('progress')) return t('etat_en_cours');
    if (state.includes('jug') || state.includes('juge')) return t('etat_juge');
    if (state.includes('archive') || state.includes('archiv')) return t('etat_archive');
    if (state.includes('trait')) return t('etat_traite');

    if (!state) {
        return inferDocumentStateFromService(transaction, t);
    }

    return rawState;
}

function inferDocumentStateFromService(transaction, t) {
    if (!String(transaction?.documentType || '').toLowerCase().includes('judiciaire')) {
        return '-';
    }

    const serviceId = Number(transaction.currentServiceId || transaction.destinationServiceId || transaction.sourceServiceId);

    if ([2, 3].includes(serviceId)) return t('etat_nouveau');
    if ([7, 10].includes(serviceId)) return t('etat_juge');
    if (serviceId === 13) return t('etat_archive');
    if (serviceId) return t('etat_en_cours');

    return '-';
}

function translate(t, key, fallback) {
    const value = t(key);
    return value === key ? fallback : value;
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

function getErrorMessage(error, fallback) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (typeof data?.error === 'string') return data.error;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return fallback;
}

export default Dashboard;

