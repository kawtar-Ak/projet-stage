import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../dashboards/AdminDashboard';

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const locale = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar') ? 'ar-MA' : 'fr-FR';
    const [pending, setPending] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [pendingReturns, setPendingReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hiddenIds, setHiddenIds] = useState([]);
    const [showDocModal, setShowDocModal] = useState(false);
    const [currentDocument, setCurrentDocument] = useState(null);
    const serviceId = Number(user?.idService || localStorage.getItem('idService') || 0);
    const isArchiveService = serviceId === 13;
    const isGreffeService = serviceId === 2;
    const isOpeningFilesService = serviceId === 3;
    const isAdminService = serviceId === 1 || serviceId === 5 || user?.readOnly;
    const isNotificationCopiesService = serviceId === 7;
    const handlesIncomingRequests = !isGreffeService;

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
            const [pendingRes, historyRes, returnsRes] = await Promise.all([
                isArchiveService
                    ? axios.get('/api/transactions', { params: { skipCount: 0, maxResultCount: 1000 } })
                    : handlesIncomingRequests
                    ? axios.get('/api/transactions/incoming')
                    : axios.get('/api/transactions/outgoing'),
                isArchiveService
                    ? axios.get('/api/transactions', { params: { skipCount: 0, maxResultCount: 1000 } })
                    : axios.get('/api/transactions/outgoing'),
                axios.get('/api/transactions/pending-returns')
            ]);
            const pendingTransactions = toArray(pendingRes.data);
            const historyTransactions = toArray(historyRes.data);
            const visiblePending = isArchiveService
                ? pendingTransactions.filter(tx => Number(tx.destinationServiceId) === serviceId)
                : pendingTransactions.filter(tx =>
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
                fetchData();
            } catch (err) {
                alert(getErrorMessage(err, t('erreur')));
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
                fetchData();
            } catch (err) {
                alert(getErrorMessage(err, t('erreur')));
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
            setCurrentDocument(res.data);
            setShowDocModal(true);
        } catch (err) {
            alert(t('impossible_charger'));
        }
    };

    const handleRespond = async (id, accepte) => {
        try {
            await axios.post(`/api/transactions/${id}/respond`, {
                accepte,
                message: accepte ? t('acceptees') : t('refusees')
            });
            fetchData();
        } catch (err) {
            alert(getErrorMessage(err, t('erreur')));
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
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>
                    {isArchiveService
                        ? translate(t, 'dashboard_archive_service', 'Interface du service Archive')
                        : isGreffeService
                        ? t('dashboard_greffier')
                        : t('dashboard')}
                </h1>
                <p>
                    {isArchiveService
                        ? translate(t, 'dashboard_archive_subtitle', "Acceptation des dossiers envoyes a l'archive, archivage et registre des retraits")
                        : isGreffeService
                        ? translate(t, 'dashboard_greffier_subtitle', "Enregistrement, suivi et transmission des dossiers du bureau d'ordre")
                        : t('dashboard_subtitle')}
                </p>
            </div>

            {isNotificationCopiesService ? (
                <div className="quick-links-grid">
                    <QuickLink
                        icon="D"
                        label={t('mes_entites')}
                        description={t('quick_link_desc')}
                        onClick={() => navigate('/mes-entites')}
                    />
                    <QuickLink
                        icon="CR"
                        label={translate(t, 'gestion_copies', 'Gestion des copies')}
                        description={translate(t, 'gestion_copies_desc', 'Rechercher, consulter et imprimer les copies')}
                        onClick={() => navigate('/gestion-copies')}
                    />
                    <QuickLink
                        icon="NT"
                        label={t('notifications')}
                        description={t('notification_transaction')}
                        onClick={() => navigate('/notifications')}
                    />
                </div>
            ) : isOpeningFilesService ? (
                <div className="quick-links-grid">
                    <QuickLink
                        icon="OD"
                        label={t('dossiers_acceptes_ouverture')}
                        description={t('dossiers_acceptes_ouverture_desc')}
                        onClick={() => navigate('/dossiers-ouverture')}
                    />
                    <QuickLink
                        icon="NT"
                        label={t('notifications')}
                        description={t('notification_transaction')}
                        onClick={() => navigate('/notifications')}
                    />
                </div>
            ) : !isAdminService && !isGreffeService && !isArchiveService && (
                <div className="quick-links-grid">
                    <>
                        <QuickLink
                            icon="D"
                            label={t('mes_entites')}
                            description={t('quick_link_desc')}
                            onClick={() => navigate('/mes-entites')}
                        />
                        <QuickLink
                            icon="C"
                            label={t('consulter')}
                            description={t('consulter_messages_admin')}
                            onClick={() => navigate('/messages-administratifs')}
                        />
                        <QuickLink
                            icon="AJ"
                            label={t('menu_acteurs_judiciaires')}
                            description={t('consulter_acteurs_judiciaires')}
                            onClick={() => navigate('/acteurs-judiciaires')}
                        />
                    </>
                </div>
            )}

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
                                locale={locale}
                                t={t}
                                actions={handlesIncomingRequests ? [
                                    <button className="action-link view" onClick={() => handleConsult(tx)}>{t('consulter')}</button>,
                                    <button className="action-link accept" onClick={() => handleRespond(tx.id, true)}>{t('accepter')}</button>,
                                    <button className="action-link cancel" onClick={() => handleRespond(tx.id, false)}>{t('refuser')}</button>
                                ] : [
                                    <button className="action-link view" onClick={() => handleConsult(tx)}>{t('consulter')}</button>,
                                    <button className="action-link cancel" onClick={() => handleCancel(tx.id)}>{t('annuler')}</button>
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
                                locale={locale}
                                t={t}
                                note={tx.messageReponse || t('non_renseigne')}
                                date={tx.dateReponse}
                                dateLabel={t('traite_le')}
                                actions={[
                                    <button className="action-link view" onClick={() => handleConsult(tx)}>{t('consulter')}</button>,
                                    <button className="action-link hide" onClick={() => handleHide(tx.id)}>{t('masquer')}</button>
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
                                locale={locale}
                                t={t}
                                actions={[
                                    <button className="action-link view" onClick={() => handleConsult(tx)}>{t('consulter')}</button>,
                                    <button className="action-link accept" onClick={() => handleMarkReturned(tx.id)}>{t('marquer_retourne')}</button>
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

function QuickLink({ icon, label, description, onClick }) {
    return (
        <button type="button" className="quick-link-card" onClick={onClick}>
            <span className="quick-link-icon">{icon}</span>
            <span className="quick-link-info">
                <span className="quick-link-label">{label}</span>
                <span className="quick-link-description">{description}</span>
            </span>
        </button>
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

function TransactionItem({ tx, badge, locale, t, actions, note, date, dateLabel }) {
    return (
        <div className="transaction-item">
            <div className="transaction-header">
                <span className="transaction-title">{tx.documentSujet}</span>
                <span className="transaction-badge badge-pending">{badge}</span>
            </div>
            <div className="transaction-details">
                <span>{t('service_destinataire')} : {tx.destinationServiceNom}</span>
                <span>{translate(t, 'emplacement_actuel', 'Emplacement actuel')} : {tx.currentServiceNom || tx.currentLocation || '-'}</span>
                <span>{note ? `${t('note')} : ${note}` : `${t('message')} : ${tx.message || t('non_renseigne')}`}</span>
                <span>{dateLabel || t('envoye_le')} : {formatDate(date || tx.dateEnvoi, locale)}</span>
            </div>
            <div className="transaction-actions">{actions}</div>
        </div>
    );
}

function formatDate(value, locale) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(locale);
}

function normalizeStatus(value) {
    return String(value || '').toLowerCase();
}

function isPending(value) {
    return normalizeStatus(value).includes('attente');
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
    if (isAccepted(value)) return t('acceptees');
    if (isRejected(value)) return t('refusees');
    if (isCancelled(value)) return t('annulees');
    if (isPending(value)) return t('en_attente');
    return value || '-';
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

function getErrorMessage(error, fallback) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (typeof data?.error === 'string') return data.error;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return fallback;
}

export default Dashboard;
