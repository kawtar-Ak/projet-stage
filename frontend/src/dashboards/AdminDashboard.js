import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import DocumentModal from '../components/DocumentModal';
import { DEFAULT_SERVICES } from '../constants/defaultServices';

const stats = [
  { label: 'Modules actifs', value: '10', hint: 'Espaces de gestion', tone: 'blue' },
  { label: 'Services', value: '20', hint: 'Structure courante', tone: 'green' },
  { label: 'Acces rapide', value: '5', hint: 'Operations frequentes', tone: 'gold' },
  { label: 'Supervision', value: '24/7', hint: 'Suivi continu', tone: 'red' },
];

function AdminDashboard() {
  const { t } = useTranslation();
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
      setError('Impossible de rechercher les dossiers juridiques.');
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
    <div className="admin-shell">
      <section className="admin-kpis">
        {stats.map((stat) => (
          <div className={`admin-kpi ${stat.tone}`} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.hint}</small>
          </div>
        ))}
      </section>

      <section className="admin-judicial-search">
        <div className="admin-search-header">
          <div>
            <span>Recherche juridique</span>
            <h2>Rechercher un dossier juridique</h2>
          </div>
          {loading && <small>Recherche...</small>}
        </div>

        <div className="admin-judicial-searchbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Numero de dossier, tribunal, objet, destinataire..."
          />
          <button type="button" className="btn-secondary" onClick={() => setKeyword('')}>
            Reinitialiser
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="admin-search-results">
          {!keyword.trim() ? (
            <div className="admin-search-empty">Saisissez un mot-cle pour afficher les dossiers.</div>
          ) : results.length === 0 && !loading ? (
            <div className="admin-search-empty">Aucun dossier trouve.</div>
          ) : (
            results.map((dossier) => {
              const currentService = getCurrentServiceLabel(dossier, services);
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
                      <strong>{dossier.numeroDossier || 'Sans numero'}</strong>
                      <em>{formatStatus(trackingStatus)}</em>
                    </span>
                    <small>BO {dossier.idBureauOrdre || '-'} | {dossier.tribunalSource || '-'}</small>
                    <small>{dossier.sujet || '-'}</small>
                  </span>

                  <span className="admin-result-location">
                    <span>
                      <b>Service actuel</b>
                      <small>{transaction?.currentServiceNom || transaction?.destinationServiceNom || currentService}</small>
                    </span>
                    <span>
                      <b>Emplacement</b>
                      <small>{location}</small>
                    </span>
                    <span>
                      <b>Dernier mouvement</b>
                      <small>{formatMovement(transaction)}</small>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {consultedDocument && (
        <DocumentModal
          document={consultedDocument}
          onClose={() => setConsultedDocument(null)}
        />
      )}
    </div>
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

function getCurrentServiceLabel(dossier, services) {
  if (dossier.serviceNom || dossier.nomService) return dossier.serviceNom || dossier.nomService;
  const service = services.find((item) => Number(item.idService) === Number(dossier.idService));
  return service?.nomService || (dossier.idService ? `Service #${dossier.idService}` : '-');
}

function formatMovement(transaction) {
  if (!transaction) return 'Aucun mouvement';
  const from = transaction.sourceServiceNom || '-';
  const to = transaction.destinationServiceNom || transaction.currentServiceNom || '-';
  return `${from} -> ${to}`;
}

function formatStatus(value) {
  const status = String(value || '').toLowerCase();
  if (status.includes('attente')) return 'En attente';
  if (status.includes('accept')) return 'Accepté';
  if (status.includes('retourn')) return 'Retourné';
  if (status.includes('refus')) return 'Refusé';
  if (status.includes('annul')) return 'Annulé';
  return value || '-';
}

function getTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export default AdminDashboard;
