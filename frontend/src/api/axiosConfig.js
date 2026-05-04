import axios from 'axios';

const ABP_API_URL = process.env.REACT_APP_ABP_API_URL || 'http://localhost:44301';
const LEGACY_API_URL = process.env.REACT_APP_LEGACY_API_URL || 'http://localhost:5127';

const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

axios.interceptors.request.use(config => {
  const currentToken = localStorage.getItem('token');

  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }

  const originalUrl = config.url;
  config.url = mapLegacyUrlToAbp(config.url);
  config.baseURL = shouldUseAbp(config.url, originalUrl) ? ABP_API_URL : LEGACY_API_URL;
  config.params = mapLegacyParamsToAbp(config.url, config.params);
  config.data = mapLegacyPayloadToAbp(config.url, config.data);

  return config;
});

axios.interceptors.response.use(
  response => {
    response.data = mapAbpResponseToLegacy(response.config.url, response.data);
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.clear();
      delete axios.defaults.headers.common.Authorization;

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

function shouldUseAbp(url = '', originalUrl = '') {
  return url === '/connect/token' ||
    url !== originalUrl ||
    url?.startsWith('/api/app/') ||
    url?.startsWith('/api/courriers/') ||
    url?.startsWith('/api/acteursjudiciaires/') ||
    url?.startsWith('/api/services/') ||
    url?.startsWith('/api/equipements/') ||
    url?.startsWith('/api/utilisateurs/') ||
    url === '/api/transactions/export-selected';
}

function mapLegacyUrlToAbp(url = '') {
  const serviceId = Number(localStorage.getItem('idService') || 0);

  return url
    .replace(/^\/api\/courriers\/(export\/excel|import\/excel|upload-document)(\?.*)?$/, '/api/courriers/$1$2')
    .replace(/^\/api\/courriers\/search(\?.*)?$/, '/api/app/courrier-administratif/search$1')
    .replace(/^\/api\/courriers\/waridat$/, '/api/app/courrier-administratif/waridat')
    .replace(/^\/api\/courriers\/archiver\/(\d+)$/, '/api/app/courrier-administratif/$1/archiver')
    .replace(/^\/api\/courriers(\/\d+)?$/, match => match.replace('/api/courriers', '/api/app/courrier-administratif'))
    .replace(/^\/api\/acteursjudiciaires\/(export\/excel|import\/excel|upload-pdf|upload-document)(\?.*)?$/, '/api/acteursjudiciaires/$1$2')
    .replace(/^\/api\/acteursjudiciaires\/search(\?.*)?$/, '/api/app/courrier-judiciaire/search$1')
    .replace(/^\/api\/acteursjudiciaires\/archives(\?.*)?$/, '/api/app/courrier-judiciaire/archives$1')
    .replace(/^\/api\/acteursjudiciaires\/archiver\/(\d+)$/, '/api/app/courrier-judiciaire/$1/archiver')
    .replace(/^\/api\/acteursjudiciaires\/(\d+)\/retraits$/, '/api/app/courrier-judiciaire/$1/retraits')
    .replace(/^\/api\/acteursjudiciaires\/retraits\/(\d+)\/retour$/, '/api/app/courrier-judiciaire/retour/$1')
    .replace(/^\/api\/acteursjudiciaires(\/\d+)?$/, match => match.replace('/api/acteursjudiciaires', '/api/app/courrier-judiciaire'))
    .replace(/^\/api\/services\/(export\/excel|import\/preview|import\/execute)(\?.*)?$/, '/api/services/$1$2')
    .replace(/^\/api\/services(\/\d+)?$/, match => match.replace('/api/services', '/api/app/service'))
    .replace(/^\/api\/equipements\/(export\/excel|import\/preview|import\/execute)(\?.*)?$/, '/api/equipements/$1$2')
    .replace(/^\/api\/equipements(\/\d+)?$/, match => match.replace('/api/equipements', '/api/app/equipement'))
    .replace(/^\/api\/equipements\/(\d+)\/charger$/, '/api/app/equipement/$1/charger')
    .replace(/^\/api\/equipements\/(\d+)\/decharger$/, '/api/app/equipement/$1/decharger')
    .replace(/^\/api\/utilisateurs\/(export\/excel|template|import\/preview|import\/execute)(\?.*)?$/, '/api/utilisateurs/$1$2')
    .replace(/^\/api\/utilisateurs(\/\d+)?$/, match => match.replace('/api/utilisateurs', '/api/app/utilisateur'))
    .replace(/^\/api\/transactions$/, '/api/app/transaction-workflow')
    .replace(/^\/api\/transactions\/incoming$/, `/api/app/transaction-workflow/incoming/${serviceId}`)
    .replace(/^\/api\/transactions\/outgoing$/, `/api/app/transaction-workflow/outgoing/${serviceId}`)
    .replace(/^\/api\/transactions\/pending-returns$/, `/api/app/transaction-workflow/pending-returns/${serviceId}`)
    .replace(/^\/api\/transactions\/export-selected$/, '/api/transactions/export-selected')
    .replace(/^\/api\/transactions\/(\d+)\/respond$/, '/api/app/transaction-workflow/$1/respond')
    .replace(/^\/api\/transactions\/(\d+)\/cancel$/, `/api/app/transaction-workflow/$1/cancel/${serviceId}`)
    .replace(/^\/api\/transactions\/(\d+)\/mark-returned$/, `/api/app/transaction-workflow/$1/mark-returned/${serviceId}`);
}

function mapLegacyParamsToAbp(url = '', params) {
  if (
    url === '/api/app/service' ||
    url === '/api/app/equipement' ||
    url === '/api/app/utilisateur' ||
    url === '/api/app/courrier-administratif' ||
    url === '/api/app/courrier-judiciaire'
  ) {
    return {
      skipCount: 0,
      maxResultCount: 1000
    };
  }

  return params;
}

function mapLegacyPayloadToAbp(url = '', data) {
  if (!data || typeof data !== 'object' || data instanceof FormData) return data;

  if (url?.startsWith('/api/app/service')) {
    return {
      nomService: data.nomService,
      description: data.description || '',
      etage: data.etage || null
    };
  }

  if (url?.startsWith('/api/app/equipement')) {
    return {
      serial: data.serial,
      type: data.type,
      etat: data.etat,
      serviceId: data.serviceId ?? data.idService
    };
  }

  if (url?.startsWith('/api/app/utilisateur')) {
    const payload = {
      nomComplet: data.nomComplet,
      login: data.login,
      serviceId: data.serviceId ?? data.idService
    };
    if (data.password) payload.password = data.password;
    return payload;
  }

  if (url === '/api/app/transaction-workflow') {
    return {
      documentId: data.documentId,
      documentType: data.documentType,
      sourceServiceId: data.sourceServiceId ?? Number(localStorage.getItem('idService') || 0),
      destinationServiceId: data.destinationServiceId,
      destinationUserId: data.destinationUserId,
      doitRevenir: data.doitRevenir,
      message: data.message || ''
    };
  }

  if (url?.startsWith('/api/app/courrier-administratif')) {
    return {
      idBureauOrdre: data.idBureauOrdre,
      date: data.date,
      source: data.source,
      sujet: data.sujet,
      destinataire: data.destinataire,
      description: data.description || '',
      etat: data.etat || 'Nouveau',
      lienPdf: data.lienPdf || '',
      direction: data.direction || 'Entrant',
      numeroDeCourrier: data.numeroDeCourrier || '',
      typeRegistre: data.typeRegistre || 'Waridat',
      typeCorrespondance: data.typeCorrespondance || null,
      parentId: data.parentId || null,
      estTransmissible: Boolean(data.estTransmissible),
      idService: data.idService ?? data.serviceId ?? Number(localStorage.getItem('idService') || 1)
    };
  }

  if (url?.startsWith('/api/app/courrier-judiciaire')) {
    return {
      idBureauOrdre: data.idBureauOrdre,
      date: data.date,
      tribunalSource: data.tribunalSource,
      sujet: data.sujet,
      direction: data.direction || 'Entrant',
      destinataire: data.destinataire || '',
      description: data.description || '',
      etatArchive: data.etatArchive || 'Nouveau',
      emplacement: data.emplacement || '',
      lienPdf: data.lienPdf || data.pdfPath || '',
      estTransmissible: Boolean(data.estTransmissible),
      idService: data.idService ?? data.serviceId ?? Number(localStorage.getItem('idService') || 1),
      numeroDossier: data.numeroDossier,
      numeroDossierAnnee: data.numeroDossierAnnee,
      numeroDossierNombre: data.numeroDossierNombre,
      numeroDossierSujet: data.numeroDossierSujet,
      dateDeRetrait: data.dateDeRetrait,
      motifDeRetrait: data.motifDeRetrait,
      effectuePar: data.effectuePar,
      dateDeRetour: data.dateDeRetour,
      notes: data.notes
    };
  }

  return data;
}

function mapAbpResponseToLegacy(url = '', data) {
  if (!data) return data;
  const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : null);

  if (url?.startsWith('/api/app/service')) {
    return items ? items.map(mapService) : mapService(data);
  }

  if (url?.startsWith('/api/app/equipement')) {
    return items ? items.map(mapEquipement) : mapEquipement(data);
  }

  if (url?.startsWith('/api/app/utilisateur')) {
    return items ? items.map(mapUtilisateur) : mapUtilisateur(data);
  }

  if (url?.startsWith('/api/app/courrier-administratif')) {
    return items ? items.map(mapCourrierAdministratif) : mapCourrierAdministratif(data);
  }

  if (url?.startsWith('/api/app/courrier-judiciaire')) {
    return items ? items.map(mapCourrierJudiciaire) : mapCourrierJudiciaire(data);
  }

  if (url?.startsWith('/api/app/transaction-workflow')) {
    return items ? items.map(mapTransaction) : mapTransaction(data);
  }

  return data;
}

function mapService(item) {
  return {
    ...item,
    idService: item.id,
    nomService: item.nomService,
    description: item.description,
    etage: item.etage
  };
}

function mapEquipement(item) {
  return {
    ...item,
    idService: item.serviceId,
    serviceNom: item.serviceNom,
    serviceEtage: item.serviceEtage
  };
}

function mapUtilisateur(item) {
  return {
    ...item,
    idService: item.serviceId,
    nomService: item.serviceNom
  };
}

function mapTransaction(item) {
  return item;
}

function mapCourrierAdministratif(item) {
  return {
    ...item,
    idService: item.idService ?? item.serviceId,
    nomService: item.nomService ?? item.serviceNom
  };
}

function mapCourrierJudiciaire(item) {
  return {
    ...item,
    idService: item.idService ?? item.serviceId,
    nomService: item.nomService ?? item.serviceNom,
    retraits: item.retraits || []
  };
}

export default axios;
