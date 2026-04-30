import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';

function Dashboard() {
    const navigate = useNavigate();
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

    useEffect(() => {
        const stored = localStorage.getItem('hiddenDashboardTransactions');
        if (stored) setHiddenIds(JSON.parse(stored));
    }, []);

    useEffect(() => {
        fetchData();
    }, [hiddenIds]);

    const fetchData = async () => {
        try {
            const [outgoingRes, returnsRes] = await Promise.all([
                axios.get('/api/transactions/outgoing'),
                axios.get('/api/transactions/pending-returns')
            ]);
            const filtered = outgoingRes.data.filter(tx => !hiddenIds.includes(tx.id));
            setPending(filtered.filter(tx => isPending(tx.statut)));
            setCompleted(filtered.filter(tx => isAccepted(tx.statut) || isRejected(tx.statut)));
            setPendingReturns(returnsRes.data);
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
                alert(err.response?.data || t('erreur'));
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
                alert(err.response?.data || t('erreur'));
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

    const stats = {
        pending: pending.length,
        accepted: completed.filter(tx => isAccepted(tx.statut)).length,
        rejected: completed.filter(tx => isRejected(tx.statut)).length,
        cancelled: completed.filter(tx => isCancelled(tx.statut)).length,
    };

    if (loading) return <div className="loading">{t('chargement')}</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>{t('dashboard')}</h1>
                <p>{t('dashboard_subtitle')}</p>
            </div>

            <div className="quick-link-card" onClick={() => navigate('/mes-entites')}>
                <div className="quick-link-icon">D</div>
                <div className="quick-link-info">
                    <div className="quick-link-label">{t('mes_entites')}</div>
                    <div className="quick-link-description">{t('quick_link_desc')}</div>
                </div>
            </div>

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
                                actions={[
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

function Section({ title, children }) {
    return (
        <>
            <div className="section-title" style={{ marginTop: '2rem' }}>
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

export default Dashboard;
