import React from 'react';
import { useTranslation } from 'react-i18next';
import { ABP_API_URL } from '../api/axiosConfig';
import { formatLocalizedDateTime, getLocalizedServiceName, getLocalizedStatus } from '../utils/localization';

function DocumentModal({ document, onClose }) {
    const { t, i18n } = useTranslation();
    const isArabic = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar');
    const direction = isArabic ? 'rtl' : 'ltr';

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
            <div className="modal document-modal" dir={direction} onClick={(e) => e.stopPropagation()}>
                <div className="document-modal-header">
                    <div>
                        <p className="modal-subtitle">
                            {bureauOrdreNumber ? `${t('numero_bureau_ordre')} ${bureauOrdreNumber}` : t('details_document')}
                        </p>
                        <h2 dir="auto">{document.sujet || t('details_document')}</h2>
                    </div>
                    <button type="button" className="modal-close-button" onClick={onClose} aria-label={t('fermer')}>&times;</button>
                </div>

                <div className="document-details-grid">
                    {bureauOrdreNumber && (
                        <div className="document-detail-item important">
                            <label>{t('numero_bureau_ordre')}</label>
                            <AutoText>{bureauOrdreNumber}</AutoText>
                        </div>
                    )}
                    <div className="document-detail-item">
                        <label>{t('identifiant')}</label>
                        <AutoText>{firstValue(document.idEntite, document.id) || emptyValue}</AutoText>
                    </div>
                    {dossierNumber && (
                        <div className="document-detail-item important">
                            <label>{t('numero_dossier_judiciaire')}</label>
                            <AutoText>{dossierNumber}</AutoText>
                        </div>
                    )}
                    <div className="document-detail-item">
                        <label>{t('type')}</label>
                        <AutoText>{formatDocumentType(document.type, t) || emptyValue}</AutoText>
                    </div>
                    {document.typeEnregistrementJudiciaire && (
                        <div className="document-detail-item">
                            <label>{t('type_enregistrement')}</label>
                            <AutoText>{document.typeEnregistrementJudiciaire === 'DocumentLie' ? t('document_lie_dossier_judiciaire') : t('dossier_judiciaire')}</AutoText>
                        </div>
                    )}
                    {document.typeDocumentJudiciaire && (
                        <div className="document-detail-item">
                            <label>{t('type_document_judiciaire')}</label>
                            <AutoText>{document.typeDocumentJudiciaire}</AutoText>
                        </div>
                    )}
                    <div className="document-detail-item">
                        <label>{t('date')}</label>
                        <AutoText>{createdAt ? formatLocalizedDateTime(createdAt, i18n) : emptyValue}</AutoText>
                    </div>
                    <div className="document-detail-item">
                        <label>{t('source')}</label>
                        <AutoText>{document.source || document.tribunalSource || emptyValue}</AutoText>
                    </div>
                    <div className="document-detail-item">
                        <label>{t('destinataire')}</label>
                        <AutoText>{document.destinataire || emptyValue}</AutoText>
                    </div>
                    <div className="document-detail-item">
                        <label>{t('etat')}</label>
                        <AutoText>{formatDocumentState(document.etat || document.etatArchive, t) || emptyValue}</AutoText>
                    </div>
                    {document.serviceNom && (
                        <div className="document-detail-item">
                            <label>{t('service')}</label>
                            <AutoText>{getLocalizedServiceName({ idService: document.idService, nomService: document.serviceNom }, i18n)}</AutoText>
                        </div>
                    )}
                    {document.dossierParentNumero && (
                        <div className="document-detail-item">
                            <label>{t('dossier_judiciaire_lie')}</label>
                            <AutoText>{document.dossierParentNumero}</AutoText>
                        </div>
                    )}
                    <div className="document-detail-item document-detail-wide">
                        <label>{t('description')}</label>
                        <span className="document-long-text" dir="auto">{document.description || emptyValue}</span>
                    </div>
                    {importedDetails.length > 0 && (
                        <div className="document-detail-item document-detail-wide">
                            <label>{t('donnees_excel_originales')}</label>
                            <div className="imported-details-list">
                                {importedDetails.map((detail, index) => (
                                    <div key={`${detail.label}-${index}`} className="imported-detail-row">
                                        <strong dir="auto">{detail.label}</strong>
                                        <span dir="auto">{detail.value}</span>
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

function AutoText({ children }) {
    return <span dir="auto">{children || '-'}</span>;
}

function formatDocumentType(value, t) {
    const normalized = normalizeText(value);
    if (!normalized) return value;
    if (normalized.includes('administratif')) return translate(t, 'document_administratif', 'Administratif');
    if (normalized.includes('judiciaire')) return translate(t, 'document_judiciaire', 'Judiciaire');
    return value;
}

function formatDocumentState(value, t) {
    const localizedStatus = getLocalizedStatus(value, t);
    if (localizedStatus !== (value || '-')) return localizedStatus;

    const normalized = normalizeText(value);
    if (!normalized) return value;
    if (normalized.includes('nouveau')) return translate(t, 'etat_nouveau', 'Nouveau');
    if (normalized.includes('cours')) return translate(t, 'etat_en_cours', 'En cours');
    if (normalized.includes('juge')) return translate(t, 'etat_juge', 'Juge');
    if (normalized.includes('traite')) return translate(t, 'etat_traite', 'Traite');
    if (normalized.includes('archive')) return translate(t, 'etat_archive', 'Archive');
    return value;
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function translate(t, key, fallback) {
    const value = t(key);
    return value === key ? fallback : value;
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
