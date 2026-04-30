import React from 'react';
import { useTranslation } from 'react-i18next';

function DocumentModal({ document, onClose }) {
    const { t } = useTranslation();

    if (!document) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const emptyValue = t('non_renseigne');

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>{t('details_document')}</h2>
                <div className="form-grid">
                    <div className="form-field"><label>{t('identifiant')}</label><span>{document.idEntite}</span></div>
                    <div className="form-field"><label>{t('titre')}</label><span>{document.sujet || emptyValue}</span></div>
                    <div className="form-field"><label>{t('type')}</label><span>{document.type || emptyValue}</span></div>
                    <div className="form-field"><label>{t('date')}</label><span>{document.dateCreation ? new Date(document.dateCreation).toLocaleString('ar-MA') : emptyValue}</span></div>
                    <div className="form-field"><label>{t('source')}</label><span>{document.source || emptyValue}</span></div>
                    <div className="form-field"><label>{t('destinataire')}</label><span>{document.destinataire || emptyValue}</span></div>
                    <div className="form-field full-width"><label>{t('description')}</label><span>{document.description || emptyValue}</span></div>
                    {document.numeroCourrier && (
                        <div className="form-field"><label>{t('numero_courrier')}</label><span>{document.numeroCourrier}</span></div>
                    )}
                    {document.numeroDossierJudiciaire && (
                        <div className="form-field"><label>{t('numero_dossier_judiciaire')}</label><span>{document.numeroDossierJudiciaire}</span></div>
                    )}
                    <div className="form-field"><label>{t('etat')}</label><span>{document.etat || document.etatArchive || emptyValue}</span></div>
                </div>
                <div className="form-actions">
                    <button className="btn-primary" onClick={onClose}>{t('fermer')}</button>
                </div>
            </div>
        </div>
    );
}

export default DocumentModal;
