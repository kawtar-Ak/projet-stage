import axios from './axiosConfig';

export const LOOKUP_LISTS = [
  { key: 'courrier.etat', label: 'Etats des courriers' },
  { key: 'judiciaire.typeDocument', label: 'Types de documents judiciaires' },
  { key: 'administratif.source', label: 'Sources administratives' },
  { key: 'equipement.type', label: 'Types des equipements' },
  { key: 'equipement.etat', label: 'Etats des equipements' }
];

export async function getLookupItems(listName) {
  const response = await axios.get(`/api/lookups/${encodeURIComponent(listName)}`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getAllLookupItems() {
  const response = await axios.get('/api/lookups');
  return Array.isArray(response.data) ? response.data : [];
}

export async function createLookupItem(payload) {
  const response = await axios.post('/api/lookups', payload);
  return response.data;
}

export async function updateLookupItem(id, payload) {
  const response = await axios.put(`/api/lookups/${id}`, payload);
  return response.data;
}

export async function deleteLookupItem(id) {
  await axios.delete(`/api/lookups/${id}`);
}

export function itemsToOptions(items, fallback) {
  const source = Array.isArray(items) && items.length > 0 ? items : fallback;
  return source.map((item) => ({
    value: String(item.value ?? item.Value ?? ''),
    label: item.label ?? item.Label ?? item.value ?? item.Value ?? ''
  }));
}
