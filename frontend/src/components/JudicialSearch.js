import { useEffect, useRef, useState } from 'react';
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
  const [movementHistory, setMovementHistory] = useState(null);

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

      const mappedResults = mergeSearchResultsByDossier(filteredItems)
        .map((dossier) => {
          const movements = getDocumentTransactions(dossier, transactions);
          return {
            ...dossier,
            latestTransaction: movements[0] || null,
            movements,
          };
        })
        .sort((a, b) => getDossierSortTime(b) - getDossierSortTime(a))
        .slice(0, 8);

      setResults(mappedResults);
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
      lienPdf: dossier.lienPdf,
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
          <div className="data-table-wrapper judicial-search-table-wrapper" dir={(i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar') ? 'rtl' : 'ltr'}>
            <table className="modern-table judicial-search-table">
              <colgroup>
                <col className="search-dossier-col" />
                <col className="search-bo-col" />
                <col className="search-subject-col" />
                <col className="search-status-col" />
                <col className="search-service-col" />
                <col className="search-location-col" />
                <col className="search-movement-col" />
                <col className="search-responder-col" />
                <col className="search-actions-col" />
              </colgroup>
              <thead>
                <tr>
                  <th>{translate(t, 'numero_dossier', 'Numero dossier')}</th>
                  <th>{t('numero_bureau_ordre')}</th>
                  <th>{t('sujet')}</th>
                  <th>{t('etat')}</th>
                  <th>{t('service_actuel')}</th>
                  <th>{t('emplacement')}</th>
                  <th>{translate(t, 'derniere_transaction', 'Derniere transaction')}</th>
                  <th>{t('traite_par')}</th>
                  <th>{translate(t, 'toutes_transactions', 'Toutes les transactions')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((dossier) => {
                  const transaction = dossier.latestTransaction;
                  const movements = dossier.movements || [];
                  const currentService = getLocalizedServiceName(
                    {
                      idService: transaction?.currentServiceId || transaction?.destinationServiceId || dossier.idService,
                      nomService: transaction?.currentServiceNom || transaction?.destinationServiceNom || dossier.serviceNom || dossier.nomService
                    },
                    i18n,
                    getCurrentServiceLabel(dossier, services, i18n)
                  );
                  const location = dossier.emplacement || transaction?.currentLocation || '-';
                  const trackingStatus = transaction?.statut || dossier.etatArchive || 'Nouveau';

                  return (
                    <tr key={dossier.id}>
                      <td>
                        <button
                          type="button"
                          className="table-link-button"
                          onClick={() => handleConsult(dossier)}
                        >
                          {dossier.numeroDossier || t('sans_numero')}
                        </button>
                      </td>
                      <td>BO {dossier.idBureauOrdre || '-'}</td>
                      <td>{dossier.sujet || dossier.tribunalSource || '-'}</td>
                      <td>{formatStatus(trackingStatus, t)}</td>
                      <td dir="auto">{currentService}</td>
                      <td>{location}</td>
                      <td title={formatMovement(transaction, t, i18n)}>
                        {transaction ? <MovementFlow movement={transaction} i18n={i18n} /> : t('aucun_mouvement')}
                      </td>
                      <td title={formatResponder(transaction, i18n, t)}>{formatResponder(transaction, i18n, t)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          aria-label={`${translate(t, 'toutes_transactions', 'Toutes les transactions')} ${dossier.numeroDossier || ''}`}
                          onClick={() => setMovementHistory(dossier)}
                        >
                          {t('consulter')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {consultedDocument && (
        <DocumentModal
          document={consultedDocument}
          onClose={() => setConsultedDocument(null)}
        />
      )}
      {movementHistory && (
        <MovementHistoryModal
          dossier={movementHistory}
          i18n={i18n}
          t={t}
          onClose={() => setMovementHistory(null)}
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

function mergeSearchResultsByDossier(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!item) return;
    const key = getDossierGroupKey(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...item,
        sourceIds: [item.id].filter((value) => value !== undefined && value !== null),
      });
      return;
    }

    map.set(key, {
      ...existing,
      ...item,
      id: existing.id,
      numeroDossier: existing.numeroDossier || item.numeroDossier,
      idBureauOrdre: existing.idBureauOrdre || item.idBureauOrdre,
      sujet: existing.sujet || item.sujet,
      tribunalSource: existing.tribunalSource || item.tribunalSource,
      description: existing.description || item.description,
      lienPdf: existing.lienPdf || item.lienPdf,
      sourceIds: Array.from(new Set([
        ...(existing.sourceIds || [existing.id]),
        item.id,
      ].filter((value) => value !== undefined && value !== null))),
      date: getTime(item.date || item.creationTime) > getTime(existing.date || existing.creationTime)
        ? item.date
        : existing.date,
    });
  });

  return Array.from(map.values());
}

function getDossierGroupKey(item) {
  const numeroDossier = normalizeSearchText(item.numeroDossier);
  if (numeroDossier) return `dossier:${numeroDossier}`;

  const bureauOrdre = normalizeSearchText(item.idBureauOrdre);
  if (bureauOrdre) return `bo:${bureauOrdre}`;

  return `id:${item.id}`;
}

function getDossierSortTime(dossier) {
  return getTime(
    dossier.latestTransaction?.dateReponse ||
    dossier.latestTransaction?.dateEnvoi ||
    dossier.date ||
    dossier.creationTime ||
    dossier.dateCreation
  );
}

function getDocumentTransactions(dossier, transactions) {
  const sourceIds = new Set((dossier.sourceIds || [dossier.id]).map((id) => Number(id)));
  const dossierHasNumber = hasDossierNumber(dossier);
  const matches = transactions.filter((tx) => {
    if (!isJudicialTransaction(tx)) return false;

    if (sourceIds.has(Number(tx.documentId))) return true;
    if (isSameDossierNumber(tx.numeroDossierJudiciaire, dossier)) return true;

    return !dossierHasNumber &&
      normalizeSearchText(tx.numeroCourrier || tx.numeroBureauOrdre) === normalizeSearchText(dossier.idBureauOrdre);
  });

  return matches.sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi));
}

function isJudicialTransaction(transaction) {
  return normalizeSearchText(transaction?.documentType).includes('judiciaire');
}

function hasDossierNumber(dossier) {
  return getDossierNumberCandidates(dossier).some((value) => normalizeSearchText(value));
}

function isSameDossierNumber(transactionNumber, dossier) {
  const transactionParts = getNumberParts(transactionNumber);
  if (transactionParts.length < 3) return false;

  return getDossierNumberCandidates(dossier)
    .filter(Boolean)
    .some((candidate) => {
      const candidateParts = getNumberParts(candidate);
      return normalizeSearchText(transactionNumber) === normalizeSearchText(candidate) ||
        sameNumberParts(transactionParts, candidate) ||
        sameNumberSet(transactionParts, candidate) ||
        sameNumberSet(candidateParts, transactionNumber);
    });
}

function getCurrentServiceLabel(dossier, services, i18n) {
  if (dossier.serviceNom || dossier.nomService) {
    return getLocalizedServiceName({ idService: dossier.idService, nomService: dossier.serviceNom || dossier.nomService }, i18n);
  }
  const service = services.find((item) => Number(item.idService) === Number(dossier.idService));
  return service ? getLocalizedServiceName(service, i18n) : (dossier.idService ? `Service #${dossier.idService}` : '-');
}

function formatMovement(transaction, t, i18n) {
  if (!transaction) return t('aucun_mouvement');
  const from = formatTransactionService(transaction.sourceServiceNom, transaction.sourceServiceId, i18n);
  const to = formatTransactionService(
    transaction.destinationServiceNom || transaction.currentServiceNom,
    transaction.destinationServiceId || transaction.currentServiceId,
    i18n
  );
  return `${from} → ${to}`;
}

function MovementFlow({ movement, i18n }) {
  const from = formatTransactionService(movement.sourceServiceNom, movement.sourceServiceId, i18n);
  const to = formatTransactionService(
    movement.destinationServiceNom || movement.currentServiceNom,
    movement.destinationServiceId || movement.currentServiceId,
    i18n
  );

  return (
    <div className="movement-flow" dir="ltr">
      <span className="movement-flow-node" dir="auto">{from}</span>
      <span className="movement-flow-arrow" aria-hidden="true">→</span>
      <span className="movement-flow-node" dir="auto">{to}</span>
    </div>
  );
}

function formatTransactionService(serviceName, serviceId, i18n) {
  return getLocalizedServiceName({ idService: serviceId, nomService: serviceName }, i18n);
}

function formatSender(movement, i18n) {
  return movement.senderUserName || formatTransactionService(movement.sourceServiceNom, movement.sourceServiceId, i18n);
}

function formatResponder(transaction, i18n, t) {
  if (!transaction) return '-';
  const responderServiceName = transaction.responderServiceName || transaction.destinationServiceNom;
  const responderServiceId = transaction.responderServiceId || transaction.destinationServiceId;
  const responder = [
    transaction.responderUserName,
    getLocalizedServiceName({ idService: responderServiceId, nomService: responderServiceName }, i18n, '')
  ].filter(Boolean).join(' - ');

  if (responder) return responder;

  return transaction.statut ? formatStatus(transaction.statut, t) : '-';
}

function formatStatus(value, t) {
  return getLocalizedStatus(value, t);
}

function getTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function formatDateTime(value, i18n) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const locale = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar') ? 'ar-MA' : 'fr-FR';
  return date.toLocaleString(locale);
}

function MovementHistoryModal({ dossier, i18n, t, onClose }) {
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const isArabic = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('ar');
  const direction = isArabic ? 'rtl' : 'ltr';
  const movements = [...(dossier.movements || [])]
    .sort((a, b) => getTime(b.dateReponse || b.dateEnvoi) - getTime(a.dateReponse || a.dateEnvoi));
  const title = translate(t, 'toutes_transactions', 'Toutes les transactions');
  const dossierNumber = dossier.numeroDossier || dossier.idBureauOrdre || '-';

  const syncTopScroll = () => {
    if (syncingScrollRef.current) return;
    if (topScrollRef.current && tableScrollRef.current) {
      syncingScrollRef.current = true;
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        syncingScrollRef.current = false;
      });
    }
  };

  const syncTableScroll = () => {
    if (syncingScrollRef.current) return;
    if (topScrollRef.current && tableScrollRef.current) {
      syncingScrollRef.current = true;
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        syncingScrollRef.current = false;
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal movement-history-modal" dir={direction} onClick={(event) => event.stopPropagation()}>
        <div className="movement-history-header">
          <div>
            <h2>{title}</h2>
            <p className="modal-subtitle">{dossierNumber}</p>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label={t('fermer')}>
            &times;
          </button>
        </div>
        {movements.length === 0 ? (
          <div className="admin-search-empty">{t('aucun_mouvement')}</div>
        ) : (
          <div className="movement-history-table-shell">
            <div
              className="movement-scrollbar movement-scrollbar-top"
              ref={topScrollRef}
              onScroll={syncTopScroll}
              aria-hidden="true"
            >
              <div className="movement-scrollbar-spacer" />
            </div>
            <div
              className="data-table-wrapper movement-history-table-wrapper"
              ref={tableScrollRef}
              onScroll={syncTableScroll}
            >
              <table className="modern-table movement-history-table">
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{translate(t, 'mouvement', 'Mouvement')}</th>
                    <th>{t('etat')}</th>
                    <th>{translate(t, 'envoye_par', 'Envoye par')}</th>
                    <th>{t('traite_par')}</th>
                    <th>{t('message')}</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDateTime(movement.dateReponse || movement.dateEnvoi, i18n)}</td>
                      <td title={formatMovement(movement, t, i18n)}><MovementFlow movement={movement} i18n={i18n} /></td>
                      <td>{formatStatus(movement.statut, t)}</td>
                      <td dir="auto">{formatSender(movement, i18n)}</td>
                      <td>{formatResponder(movement, i18n, t)}</td>
                      <td>{movement.messageReponse || movement.message || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>{t('fermer')}</button>
        </div>
      </div>
    </div>
  );
}

function translate(t, key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

export default JudicialSearch;
