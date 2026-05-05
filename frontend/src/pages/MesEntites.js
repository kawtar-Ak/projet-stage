import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';
import { DEFAULT_SERVICES } from '../constants/defaultServices';

function MesEntites() {
    const { t } = useTranslation();
    const [documents, setDocuments] = useState([]);
    const [services, setServices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [transferForm, setTransferForm] = useState({ serviceId: '', doitRevenir: false, message: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalDocument, setModalDocument] = useState(null);

    useEffect(() => {
        fetchDocuments();
        fetchServices();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('/api/documents');
            setDocuments(res.data);
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

    const openTransferModal = (doc) => {
        setSelectedDoc(doc);
        setTransferForm({ serviceId: '', doitRevenir: false, message: '' });
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const handleServiceChange = (serviceId) => {
        const nextServiceId = serviceId || '';
        setTransferForm({ ...transferForm, serviceId: nextServiceId });
    };

    const handleTransfer = async () => {
        if (!selectedDoc || !transferForm.serviceId) {
            setError(t('service_destinataire_requis'));
            return;
        }

        try {
            await axios.post('/api/transactions', {
                documentId: selectedDoc.idEntite,
                documentType: selectedDoc.type,
                destinationServiceId: Number(transferForm.serviceId),
                destinationUserId: null,
                doitRevenir: transferForm.doitRevenir,
                message: transferForm.message
            });
            setShowModal(false);
            setSelectedDoc(null);
            setSuccess(t('transaction_envoyee'));
            setError('');
            fetchDocuments();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data || t('erreur_transaction'));
        }
    };

    const handleConsult = async (doc) => {
        try {
            const res = await axios.get(`/api/documents/${doc.idEntite}?type=${encodeURIComponent(doc.type)}`);
            setModalDocument(res.data);
        } catch (err) {
            setModalDocument(doc);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalDocument(null);
    };

    return (
        <div className="page-container">
            <h1 className="page-title">{t('mes_entites')}</h1>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="data-table-wrapper">
                <h3>{t('documents_transmissibles')} ({documents.length})</h3>
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>{t('titre')}</th>
                            <th>{t('type')}</th>
                            <th>{t('date')}</th>
                            <th>{t('source')}</th>
                            <th>{t('destinataire')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="loading">{t('aucun_document')}</td>
                            </tr>
                        ) : (
                            documents.map(doc => (
                                <tr key={`${doc.idEntite}_${doc.type}`}>
                                    <td>{doc.sujet || '-'}</td>
                                    <td>{doc.type}</td>
                                    <td>{doc.dateCreation ? new Date(doc.dateCreation).toLocaleString('ar-MA') : '-'}</td>
                                    <td>{doc.source || '-'}</td>
                                    <td>{doc.destinataire || '-'}</td>
                                    <td className="action-icons">
                                        <button className="btn-secondary" onClick={() => handleConsult(doc)}>{t('consulter')}</button>
                                        <button className="btn-primary" onClick={() => openTransferModal(doc)}>{t('transferer')}</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                                        <option key={s.idService} value={s.idService}>{s.nomService}</option>
                                    ))}
                                </select>
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

export default MesEntites;
