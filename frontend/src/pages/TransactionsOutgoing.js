import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function TransactionsOutgoing() {
    const { t, i18n } = useTranslation();
    const locale = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar') ? 'ar-MA' : 'fr-FR';
    const currentServiceId = Number(localStorage.getItem('idService') || 0);
    const [allTransactions, setAllTransactions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const fetchTransactions = useCallback(() => {
        axios.get('/api/transactions/outgoing')
            .then(res => {
                const visibleTransactions = toArray(res.data);
                setAllTransactions(visibleTransactions);
                setFiltered(visibleTransactions);
                setSelectedIds([]);
                setSelectAll(false);
                setError('');
            })
            .catch(() => setError(t('erreur_chargement')));
    }, [t]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        const handleFocus = () => fetchTransactions();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchTransactions]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFiltered(allTransactions);
            return;
        }
        const term = searchTerm.toLowerCase();
        setFiltered(allTransactions.filter(tx =>
            (tx.documentSujet && tx.documentSujet.toLowerCase().includes(term)) ||
            (tx.destinationServiceNom && tx.destinationServiceNom.toLowerCase().includes(term)) ||
            (tx.sourceServiceNom && tx.sourceServiceNom.toLowerCase().includes(term)) ||
            (tx.currentServiceNom && tx.currentServiceNom.toLowerCase().includes(term)) ||
            (tx.currentLocation && tx.currentLocation.toLowerCase().includes(term)) ||
            (tx.statut && tx.statut.toLowerCase().includes(term)) ||
            (tx.numeroCourrier && tx.numeroCourrier.toLowerCase().includes(term)) ||
            (tx.numeroDossierJudiciaire && tx.numeroDossierJudiciaire.toLowerCase().includes(term))
        ));
        setSelectedIds([]);
        setSelectAll(false);
    }, [searchTerm, allTransactions]);

    const handleSelectAll = () => {
        setSelectedIds(selectAll ? [] : filtered.map(tx => tx.id));
        setSelectAll(!selectAll);
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
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'transactions_en_attente_et_acceptees.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(t('erreur_export'));
        }
    };

    return (
        <div className="page-container">
            <h1 className="page-title">{translate(t, 'historique_transactions', 'Historique des transactions')}</h1>
            {error && <div className="error-message">{error}</div>}
            <div className="filters">
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
            <div className="data-table-wrapper">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                            </th>
                            <th>{t('document')}</th>
                            <th>{translate(t, 'type_operation', 'Operation')}</th>
                            <th>{t('numero_courrier')}</th>
                            <th>{t('numero_dossier_judiciaire')}</th>
                            <th>{t('de')}</th>
                            <th>{t('service_destinataire')}</th>
                            <th>{translate(t, 'emplacement_actuel', 'Emplacement actuel')}</th>
                            <th>{t('etat')}</th>
                            <th>{t('date_envoi')}</th>
                            <th>{t('reponse_note')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(tx => (
                            <tr key={tx.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(tx.id)}
                                        onChange={() => handleSelectOne(tx.id)}
                                    />
                                </td>
                                <td>{tx.documentSujet}</td>
                                <td>{formatTransactionRole(tx, currentServiceId, t)}</td>
                                <td>{tx.numeroCourrier || '-'}</td>
                                <td>{tx.numeroDossierJudiciaire || '-'}</td>
                                <td>{tx.sourceServiceNom || '-'}</td>
                                <td>{tx.destinationServiceNom}</td>
                                <td>{tx.currentLocation || tx.currentServiceNom || '-'}</td>
                                <td>{formatStatus(tx.statut, t)}</td>
                                <td>{tx.dateEnvoi ? new Date(tx.dateEnvoi).toLocaleString(locale) : '-'}</td>
                                <td>{tx.messageReponse || '-'}</td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr className="empty-row"><td colSpan="11">{translate(t, 'aucune_transaction', 'Aucune transaction trouvée')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
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

function toArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function translate(t, key, fallback) {
    const value = t(key);
    return value === key ? fallback : value;
}

export default TransactionsOutgoing;
