import React from 'react';
import { useTranslation } from 'react-i18next';
import { ABP_API_URL } from '../api/axiosConfig';

function DocumentModal({ document, onClose }) {
    const { t } = useTranslation();

    if (!document) return null;

    const importedDetails = parseImportedDetails(document.description);
    const bureauOrdreNumber = firstValue(
        document.numeroBureauOrdre,
        document.NumeroBureauOrdre,
        document.idBureauOrdre,
        document.IdBureauOrdre,
        document.numeroCourrier,
        document.NumeroCourrier
    );
    const dossierNumber = firstValue(
        document.numeroDossierJudiciaire,
        document.NumeroDossierJudiciaire,
        document.numeroDossier,
        document.NumeroDossier
    );
    const createdAt = firstValue(document.dateCreation, document.date);

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
            <div className="modal document-modal" onClick={(e) => e.stopPropagation()}>
                <div className="document-modal-header">
                    <div>
                        <p className="modal-subtitle">
                            {bureauOrdreNumber ? `${t('numero_bureau_ordre')} ${bureauOrdreNumber}` : t('details_document')}
                        </p>
                        <h2>{document.sujet || t('details_document')}</h2>
                    </div>
                    <button type="button" className="modal-close-button" onClick={onClose} aria-label={t('fermer')}>x</button>
                </div>

                <div className="document-details-grid">
                    {bureauOrdreNumber && (
                        <div className="document-detail-item important">
                            <label>{t('numero_bureau_ordre')}</label>
                            <span>{bureauOrdreNumber}</span>
                        </div>
                    )}
                    <div className="document-detail-item">
                        <label>{t('identifiant')}</label>
                        <span>{firstValue(document.idEntite, document.id) || emptyValue}</span>
                    </div>
                    {dossierNumber && (
                        <div className="document-detail-item important">
                            <label>{t('numero_dossier_judiciaire')}</label>
                            <span>{dossierNumber}</span>
                        </div>
                    )}
                    <div className="document-detail-item">
                        <label>{t('type')}</label>
                        <span>{document.type || emptyValue}</span>
                    </div>
                    {document.typeEnregistrementJudiciaire && (
                        <div className="document-detail-item">
                            <label>{t('type_enregistrement')}</label>
                            <span>{document.typeEnregistrementJudiciaire === 'DocumentLie' ? t('document_lie_dossier_judiciaire') : t('dossier_judiciaire')}</span>
                        </div>
                    )}
                    {document.typeDocumentJudiciaire && (
                        <div className="document-detail-item">
                            <label>{t('type_document_judiciaire')}</label>
                            <span>{document.typeDocumentJudiciaire}</span>
                        </div>
                    )}
                    <div className="document-detail-item">
                        <label>{t('date')}</label>
                        <span>{createdAt ? new Date(createdAt).toLocaleString('ar-MA') : emptyValue}</span>
                    </div>
                    <div className="document-detail-item">
                        <label>{t('source')}</label>
                        <span>{document.source || document.tribunalSource || emptyValue}</span>
                    </div>
                    <div className="document-detail-item">
                        <label>{t('destinataire')}</label>
                        <span>{document.destinataire || emptyValue}</span>
                    </div>
                    <div className="document-detail-item">
                        <label>{t('etat')}</label>
                        <span>{document.etat || document.etatArchive || emptyValue}</span>
                    </div>
                    {document.serviceNom && (
                        <div className="document-detail-item">
                            <label>{t('service')}</label>
                            <span>{document.serviceNom}</span>
                        </div>
                    )}
                    {document.dossierParentNumero && (
                        <div className="document-detail-item">
                            <label>{t('dossier_judiciaire_lie')}</label>
                            <span>{document.dossierParentNumero}</span>
                        </div>
                    )}
                    <div className="document-detail-item document-detail-wide">
                        <label>{t('description')}</label>
                        <span className="document-long-text">{document.description || emptyValue}</span>
                    </div>
                    {importedDetails.length > 0 && (
                        <div className="document-detail-item document-detail-wide">
                            <label>{t('donnees_excel_originales')}</label>
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
                    {documentLink && (
                        <div className="document-detail-item document-detail-wide document-file-preview">
                            <label>{t('document_pdf_word')}</label>
                            <a href={documentLink} target="_blank" rel="noreferrer">{documentName || t('ouvrir')}</a>
                            {isPdf && (
                                <iframe title={documentName || t('document')} src={documentLink} />
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

function firstValue(...values) {
    return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
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
    const fileName = decodeURIComponent(cleanValue.split('/').filter(Boolean).pop() || cleanValue);
    return fileName.replace(/^\d{17}-[a-f0-9]{32}-/i, '');
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
