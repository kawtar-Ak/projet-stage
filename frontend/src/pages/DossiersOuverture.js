import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';

const OUVERTURE_DOSSIERS_SERVICE_ID = 3;

function DossiersOuverture() {
  const { t } = useTranslation();
  const currentServiceId = Number(localStorage.getItem('idService') || 0);
  const [dossiers, setDossiers] = useState([]);
  const [pendingIds, setPendingIds] = useState([]);
  const [numberTarget, setNumberTarget] = useState(null);
  const [numeroDossierInput, setNumeroDossierInput] = useState('');
  const [motCle, setMotCle] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [consultedDocument, setConsultedDocument] = useState(null);

  const dossiersAcceptes = useMemo(() => {
    const keyword = normalizeSearchText(motCle);

    return dossiers
      .filter((dossier) => Number(dossier.idService) === OUVERTURE_DOSSIERS_SERVICE_ID)
      .filter((dossier) => !pendingIds.includes(Number(dossier.id)))
      .filter((dossier) => {
        if (!keyword) return true;
        return [
          dossier.id,
          dossier.idBureauOrdre,
          dossier.numeroDossier,
          dossier.tribunalSource,
          dossier.sujet,
          dossier.destinataire,
          dossier.description,
          dossier.etatArchive,
          dossier.emplacement
        ].some((value) => normalizeSearchText(value).includes(keyword));
      });
  }, [dossiers, pendingIds, motCle]);

  const dossiersACompleter = dossiersAcceptes.filter((dossier) => !hasCompleteNumeroDossier(dossier.numeroDossier));
  const dossiersComplets = dossiersAcceptes.filter((dossier) => hasCompleteNumeroDossier(dossier.numeroDossier));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dossiersRes, incomingRes] = await Promise.all([
        axios.get('/api/acteursjudiciaires'),
        axios.get('/api/transactions/incoming')
      ]);

      const items = Array.isArray(dossiersRes.data) ? dossiersRes.data : [];
      const incoming = toArray(incomingRes.data);
      const pendingDocumentIds = incoming.map((tx) => Number(tx.documentId)).filter(Boolean);

      setDossiers(items);
      setPendingIds(pendingDocumentIds);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, t('erreur_chargement_dossiers_acceptes')));
    } finally {
      setLoading(false);
    }
  };

  const openNumberModal = (dossier) => {
    setNumberTarget(dossier);
    setNumeroDossierInput(dossier.numeroDossier || '');
    setError('');
    setSuccess('');
  };

  const closeNumberModal = () => {
    setNumberTarget(null);
    setNumeroDossierInput('');
  };

  const handleSaveNumero = async (dossier) => {
    const numeroDossier = normalizeNumeroDossier(numeroDossierInput);
    if (!hasCompleteNumeroDossier(numeroDossier)) {
      setError(t('erreur_numero_dossier_format'));
      setSuccess('');
      return;
    }

    setSavingId(dossier.id);
    try {
      await axios.put(`/api/acteursjudiciaires/${dossier.id}`, {
        idBureauOrdre: dossier.idBureauOrdre || '',
        date: dossier.date ? new Date(dossier.date).toISOString() : new Date().toISOString(),
        tribunalSource: dossier.tribunalSource || '',
        sujet: dossier.sujet || '',
        direction: dossier.direction || 'Entrant',
        destinataire: dossier.destinataire || '',
        description: dossier.description || '',
        etatArchive: dossier.etatArchive || 'Nouveau',
        emplacement: dossier.emplacement || '',
        lienPdf: dossier.lienPdf || '',
        idService: OUVERTURE_DOSSIERS_SERVICE_ID,
        numeroDossier,
        estTransmissible: true
      });

      setSuccess(t('numero_dossier_enregistre'));
      setError('');
      closeNumberModal();
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, t('erreur_enregistrer_numero_dossier')));
      setSuccess('');
    } finally {
      setSavingId(null);
    }
  };

  const handleConsult = (dossier) => {
    setConsultedDocument({
      idEntite: dossier.id,
      sujet: dossier.sujet,
      type: t('courrier_judiciaire'),
      dateCreation: dossier.date,
      source: dossier.tribunalSource,
      destinataire: dossier.destinataire,
      description: dossier.description,
      numeroCourrier: dossier.idBureauOrdre,
      numeroDossierJudiciaire: dossier.numeroDossier,
      etatArchive: dossier.etatArchive,
    });
  };

  if (currentServiceId !== OUVERTURE_DOSSIERS_SERVICE_ID) {
    return (
      <div className="page-container">
        <h1 className="page-title">{t('dossiers_acceptes_ouverture')}</h1>
        <div className="error-message">{t('acces_reserve_ouverture_dossiers')}</div>
      </div>
    );
  }

  if (loading) return <div className="loading">{t('chargement')}</div>;

  return (
    <div className="page-container" dir="rtl">
      <h1 className="page-title">{t('dossiers_acceptes_ouverture')}</h1>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-label">{t('a_completer')}</div>
          <div className="stat-value">{dossiersACompleter.length}</div>
        </div>
        <div className="stat-card accepted">
          <div className="stat-label">{t('dossiers_complets')}</div>
          <div className="stat-value">{dossiersComplets.length}</div>
        </div>
      </div>

      <section className="registry-panel">
        <div className="registry-panel-header">
          <h3>{t('dossiers_acceptes_a_traiter')}</h3>
          <button type="button" className="btn-secondary" onClick={fetchData}>{t('reinitialiser')}</button>
        </div>

        <div className="filters">
          <input
            value={motCle}
            onChange={(event) => setMotCle(event.target.value)}
            placeholder={t('rechercher_dossier')}
          />
        </div>

        <DossiersTable
          dossiers={dossiersAcceptes}
          savingId={savingId}
          t={t}
          onOpenNumberModal={openNumberModal}
          onConsult={handleConsult}
        />
      </section>

      {numberTarget && (
        <>
          <div className="modal-overlay" onClick={closeNumberModal} />
          <div className="modal form-card edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="registry-panel-header">
              <div>
                <h3>{t('attribuer_numero_dossier')}</h3>
                <p>{numberTarget.sujet || '-'}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={closeNumberModal}>{t('fermer')}</button>
            </div>

            <div className="form-grid">
              <div className="form-field full-width">
                <label>{t('numero_dossier_appel')} *</label>
                <input
                  value={numeroDossierInput}
                  onChange={(event) => setNumeroDossierInput(event.target.value)}
                  placeholder="2026/15/3"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSaveNumero(numberTarget)}
                disabled={savingId === numberTarget.id || !hasCompleteNumeroDossier(normalizeNumeroDossier(numeroDossierInput))}
              >
                {savingId === numberTarget.id ? t('sauvegarde_en_cours') : t('enregistrer_numero')}
              </button>
              <button type="button" className="btn-secondary" onClick={closeNumberModal}>{t('annuler')}</button>
            </div>
          </div>
        </>
      )}

      {consultedDocument && (
        <DocumentModal
          document={consultedDocument}
          onClose={() => setConsultedDocument(null)}
        />
      )}
    </div>
  );
}

function DossiersTable({ dossiers, savingId, t, onOpenNumberModal, onConsult }) {
  return (
    <div className="data-table-wrapper">
      <table className="modern-table">
        <thead>
          <tr>
            <th>{t('date')}</th>
            <th>{t('numero_bureau_ordre')}</th>
            <th>{t('tribunal_source')}</th>
            <th>{t('objet')}</th>
            <th>{t('numero_dossier_appel')}</th>
            <th>{t('etat')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {dossiers.length === 0 ? (
            <tr><td colSpan="7" style={{ textAlign: 'center' }}>{t('aucun_dossier_accepte')}</td></tr>
          ) : (
            dossiers.map((dossier) => {
              const isComplete = hasCompleteNumeroDossier(dossier.numeroDossier);
              return (
                <tr key={dossier.id}>
                  <td>{formatDate(dossier.date)}</td>
                  <td>{dossier.idBureauOrdre || '-'}</td>
                  <td>{dossier.tribunalSource || '-'}</td>
                  <td>{dossier.sujet || '-'}</td>
                  <td>{dossier.numeroDossier || '-'}</td>
                  <td>{isComplete ? t('dossier_complet') : t('a_completer')}</td>
                  <td className="action-icons">
                    <button type="button" onClick={() => onConsult(dossier)}>{t('consulter')}</button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onOpenNumberModal(dossier)}
                      disabled={savingId === dossier.id}
                    >
                      {isComplete ? t('modifier_numero') : t('attribuer_numero')}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function normalizeNumeroDossier(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\/+/g, '/');
}

function hasCompleteNumeroDossier(value) {
  return /^\d+\/\d+\/\d+$/.test(String(value || '').trim());
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeSearchText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (typeof data === 'string') return data;
  if (data?.error?.message) return data.error.message;
  if (data?.message) return data.message;
  if (error.message) return error.message;
  return fallback;
}

export default DossiersOuverture;
