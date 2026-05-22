import React from 'react';
import { useTranslation } from 'react-i18next';
import { ABP_API_URL } from '../api/axiosConfig';

function DocumentModal({ document, onClose }) {
    const { t } = useTranslation();

    if (!document) return null;
    const importedDetails = parseImportedDetails(document.description);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const emptyValue = t('non_renseigne');
    const documentLink = getDocumentHref(document.lienPdf || document.pdfPath);
    const documentName = getDocumentName(document.lienPdf || document.pdfPath);
    const isPdf = /\.pdf($|[?#])/i.test(documentLink);

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>{t('details_document')}</h2>
                <div className="form-grid">
                    <div className="form-field"><label>{t('identifiant')}</label><span>{document.idEntite}</span></div>
                    <div className="form-field"><label>{t('titre')}</label><span>{document.sujet || emptyValue}</span></div>
                    <div className="form-field"><label>{t('type')}</label><span>{document.type || emptyValue}</span></div>
                    {document.typeEnregistrementJudiciaire && (
                        <div className="form-field"><label>{t('type_enregistrement')}</label><span>{document.typeEnregistrementJudiciaire === 'DocumentLie' ? t('document_lie_dossier_judiciaire') : t('dossier_judiciaire')}</span></div>
                    )}
                    {document.typeDocumentJudiciaire && (
                        <div className="form-field"><label>{t('type_document_judiciaire')}</label><span>{document.typeDocumentJudiciaire}</span></div>
                    )}
                    <div className="form-field"><label>{t('date')}</label><span>{document.dateCreation ? new Date(document.dateCreation).toLocaleString('ar-MA') : emptyValue}</span></div>
                    {document.idBureauOrdre && (
                        <div className="form-field"><label>{t('numero_bureau_ordre')}</label><span>{document.idBureauOrdre}</span></div>
                    )}
                    <div className="form-field"><label>{t('source')}</label><span>{document.source || emptyValue}</span></div>
                    <div className="form-field"><label>{t('destinataire')}</label><span>{document.destinataire || emptyValue}</span></div>
                    <div className="form-field full-width">
                        <label>{t('description')}</label>
                        <span style={{ whiteSpace: 'pre-wrap' }}>{document.description || emptyValue}</span>
                    </div>
                    {importedDetails.length > 0 && (
                        <div className="form-field full-width">
                            <label>بيانات Excel الأصلية</label>
                            <div className="imported-details-list">
                                {importedDetails.map((detail, index) => (
                                    <div key={`${detail.label}-${index}`} className="imported-detail-row">
                                        <strong>{detail.label}</strong>
                                        <span>{detail.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {document.numeroCourrier && (
                        <div className="form-field"><label>{t('numero_courrier')}</label><span>{document.numeroCourrier}</span></div>
                    )}
                    {document.numeroDossierJudiciaire && (
                        <div className="form-field"><label>{t('numero_dossier_judiciaire')}</label><span>{document.numeroDossierJudiciaire}</span></div>
                    )}
                    {document.dossierParentNumero && (
                        <div className="form-field"><label>{t('dossier_judiciaire_lie')}</label><span>{document.dossierParentNumero}</span></div>
                    )}
                    <div className="form-field"><label>{t('etat')}</label><span>{document.etat || document.etatArchive || emptyValue}</span></div>
                    {documentLink && (
                        <div className="form-field full-width">
                            <label>{t('document_pdf_word')}</label>
                            <a href={documentLink} target="_blank" rel="noreferrer">{documentName || t('ouvrir')}</a>
                            {isPdf && (
                                <iframe
                                    title={documentName || t('document')}
                                    src={documentLink}
                                    style={{ width: '100%', minHeight: '520px', border: '1px solid #d7e3f3', borderRadius: '8px', marginTop: '0.75rem' }}
                                />
                            )}
                        </div>
                    )}
                </div>
                <div className="form-actions">
                    <button className="btn-primary" onClick={onClose}>{t('fermer')}</button>
                </div>
            </div>
        </div>
    );
}

function getDocumentHref(value) {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;

    const normalizedValue = value.startsWith('/') ? value : `/${value}`;
    return `${ABP_API_URL}${normalizedValue}`;
}

function getDocumentName(value) {
    if (!value) return '';
    const cleanValue = String(value).split('?')[0].split('#')[0];
    return decodeURIComponent(cleanValue.split('/').filter(Boolean).pop() || cleanValue);
}

function parseImportedDetails(description) {
    if (!description || !description.includes(':')) return [];

    return String(description)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.toLowerCase().startsWith('donnees importees'))
        .map((line) => {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex <= 0) return null;
            return {
                label: line.slice(0, separatorIndex).trim(),
                value: line.slice(separatorIndex + 1).trim(),
            };
        })
        .filter(Boolean);
}

export default DocumentModal;
