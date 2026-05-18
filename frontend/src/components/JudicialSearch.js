import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DocumentModal from './DocumentModal';
import { DEFAULT_SERVICES } from '../constants/defaultServices';
import { getLocalizedServiceName, getLocalizedStatus } from '../utils/localization';

function JudicialSearch() {
  const { t, i18n } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consultedDocument, setConsultedDocument] = useState(null);
  const [services, setServices] = useState(DEFAULT_SERVICES);

  useEffect(() => {
    const timeout = setTimeout(searchJudicialFiles, 300);
    return () => clearTimeout(timeout);
  }, [keyword]);

  useEffect(() => {
    axios.get('/api/services')
      .then((response) => {
        setServices(Array.isArray(response.data) && response.data.length > 0 ? response.data : DEFAULT_SERVICES);
      })
      .catch(() => setServices(DEFAULT_SERVICES));
  }, []);

  const searchJudicialFiles = async () => {
    const motCle = keyword.trim();
    if (!motCle) {
      setResults([]);
      setError('');
      return;
    }

    setLoading(true);
    try {
      const [dossiersResponse, archivesResponse] = await Promise.all([
        axios.get('/api/acteursjudiciaires'),
        axios.get('/api/acteursjudiciaires/archives').catch(() => ({ data: [] })),
      ]);
      const items = mergeById(
        toArray(dossiersResponse.data),
        toArray(archivesResponse.data)
      );

      const transactionsResponse = await axios.get('/api/transactions', {
        params: { skipCount: 0, maxResultCount: 1000 }
      }).catch(() => ({ data: [] }));
      const transactions = toArray(transactionsResponse.data);

      const normalizedKeyword = normalizeSearchText(motCle);
      const keywordNumberParts = getNumberParts(motCle);
      const isNumberSearch = keywordNumberParts.length >= 2;
      const filteredItems = items.filter((dossier) => {
        if (isNumberSearch) {
          return matchDossierNumber(dossier, motCle, keywordNumberParts);
        }

        return [
          dossier.id,
          dossier.idBureauOrdre,
          dossier.numeroDossier,
          dossier.numeroDossierAnnee,
          dossier.tribunalSource,
          dossier.sujet,
          dossier.destinataire,
          dossier.description,
          dossier.etatArchive,
          dossier.emplacement,
        ].some((value) => {
          const normalizedValue = normalizeSearchText(value);
          return normalizedValue && normalizedValue.includes(normalizedKeyword);
        });
      });

      setResults(filteredItems.slice(0, 8).map((dossier) => ({
        ...dossier,
        latestTransaction: getLatestTransaction(dossier, transactions),
      })));
      setError('');
    } catch {
      setError(t('erreur_recherche_dossiers_juridiques'));
      setResults([]);
    } finally {
      setLoading(false);
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

  return (
    <section className="admin-judicial-search">
      <div className="admin-search-header">
        <div>
          <span>{t('recherche_juridique')}</span>
          <h2>{t('rechercher_dossier_juridique')}</h2>
        </div>
        {loading && <small>{t('recherche_en_cours')}</small>}
      </div>

      <div className="admin-judicial-searchbar">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t('placeholder_recherche_juridique')}
        />
        <button type="button" className="btn-secondary" onClick={() => setKeyword('')}>
          {t('reinitialiser')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-search-results">
        {!keyword.trim() ? (
          <div className="admin-search-empty">{t('saisir_mot_cle_dossiers')}</div>
        ) : results.length === 0 && !loading ? (
          <div className="admin-search-empty">{t('aucun_dossier_trouve')}</div>
        ) : (
          results.map((dossier) => {
            const currentService = getLocalizedServiceName(
              {
                idService: transaction?.currentServiceId || transaction?.destinationServiceId || dossier.idService,
                nomService: transaction?.currentServiceNom || transaction?.destinationServiceNom || dossier.serviceNom || dossier.nomService
              },
              i18n,
              getCurrentServiceLabel(dossier, services, i18n)
            );
            const transaction = dossier.latestTransaction;
            const location = dossier.emplacement || transaction?.currentLocation || '-';
            const trackingStatus = transaction?.statut || dossier.etatArchive || 'Nouveau';

            return (
              <button
                type="button"
                className="admin-search-result admin-tracking-result"
                key={dossier.id}
                onClick={() => handleConsult(dossier)}
              >
                <span className="admin-result-identity">
                  <span className="admin-result-title">
                    <strong>{dossier.numeroDossier || t('sans_numero')}</strong>
                    <em>{formatStatus(trackingStatus, t)}</em>
                  </span>
                  <small>BO {dossier.idBureauOrdre || '-'} | {dossier.tribunalSource || '-'}</small>
                  <small>{dossier.sujet || '-'}</small>
                </span>

                <span className="admin-result-location">
                  <span>
                    <b>{t('service_actuel')}</b>
                    <small>{transaction?.currentServiceNom || transaction?.destinationServiceNom || currentService}</small>
                  </span>
                  <span>
                    <b>{t('emplacement')}</b>
                    <small>{location}</small>
                  </span>
                  <span>
                    <b>{t('dernier_mouvement')}</b>
                    <small>{formatMovement(transaction, t)}</small>
                  </span>
                  <span>
                    <b>{t('traite_par')}</b>
                    <small>{formatResponder(transaction, i18n)}</small>
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {consultedDocument && (
        <DocumentModal
          document={consultedDocument}
          onClose={() => setConsultedDocument(null)}
        />
      )}
    </section>
  );
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function getNumberParts(value) {
  return String(value ?? '').match(/\d+/g) || [];
}

function matchDossierNumber(dossier, keyword, keywordParts) {
  const normalizedKeyword = normalizeSearchText(keyword);
  const candidates = getDossierNumberCandidates(dossier, keywordParts);

  return candidates.some((value) => {
    const normalizedValue = normalizeSearchText(value);
    if (!normalizedValue) return false;
    return normalizedValue === normalizedKeyword ||
      normalizedValue.includes(normalizedKeyword) ||
      sameNumberParts(keywordParts, value) ||
      sameNumberSet(keywordParts, value);
  });
}

function getDossierNumberCandidates(dossier, keywordParts = []) {
  const annee = dossier.numeroDossierAnnee;
  const nombre = dossier.numeroDossierNombre;
  const sujet = dossier.numeroDossierSujet;
  const candidates = [dossier.numeroDossier];

  if (annee && nombre && sujet) {
    candidates.push(
      `${annee}/${nombre}/${sujet}`,
      `${nombre}/${annee}/${sujet}`,
      `${nombre}/${sujet}/${annee}`,
      `${sujet}/${annee}/${nombre}`,
      `${sujet}/${nombre}/${annee}`
    );
  }

  if (keywordParts.length <= 2) {
    candidates.push(dossier.idBureauOrdre);
  }

  return candidates;
}

function sameNumberParts(keywordParts, value) {
  if (keywordParts.length === 0) return false;
  const valueParts = getNumberParts(value);
  if (valueParts.length !== keywordParts.length) return false;
  return keywordParts.every((part, index) => valueParts[index] === part);
}

function sameNumberSet(keywordParts, value) {
  if (keywordParts.length < 3) return false;
  const valueParts = getNumberParts(value);
  if (valueParts.length !== keywordParts.length) return false;
  return keywordParts.every((part) => valueParts.includes(part));
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function mergeById(...lists) {
  const map = new Map();
  lists.flat().forEach((item) => {
    if (!item) return;
    map.set(item.id ?? `${item.numeroDossier}-${item.idBureauOrdre}`, item);
  });
  return Array.from(map.values());
}

function getLatestTransaction(dossier, transactions) {
  const matches = transactions.filter((tx) => {
    return Number(tx.documentId) === Number(dossier.id) ||
      normalizeSearchText(tx.numeroDossierJudiciaire) === normalizeSearchText(dossier.numeroDossier) ||
      normalizeSearchText(tx.numeroCourrier) === normalizeSearchText(dossier.idBureauOrdre);
  });

  return matches.sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi))[0] || null;
}

function getCurrentServiceLabel(dossier, services, i18n) {
  if (dossier.serviceNom || dossier.nomService) {
    return getLocalizedServiceName({ idService: dossier.idService, nomService: dossier.serviceNom || dossier.nomService }, i18n);
  }
  const service = services.find((item) => Number(item.idService) === Number(dossier.idService));
  return service ? getLocalizedServiceName(service, i18n) : (dossier.idService ? `Service #${dossier.idService}` : '-');
}

function formatMovement(transaction, t) {
  if (!transaction) return t('aucun_mouvement');
  const from = transaction.sourceServiceNom || '-';
  const to = transaction.destinationServiceNom || transaction.currentServiceNom || '-';
  return `${from} -> ${to}`;
}

function formatResponder(transaction, i18n) {
  if (!transaction?.responderUserName && !transaction?.responderServiceName) return '-';
  return [
    transaction.responderUserName,
    getLocalizedServiceName({ idService: transaction.responderServiceId, nomService: transaction.responderServiceName }, i18n, '')
  ].filter(Boolean).join(' | ');
}

function formatStatus(value, t) {
  return getLocalizedStatus(value, t);
}

function getTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export default JudicialSearch;
