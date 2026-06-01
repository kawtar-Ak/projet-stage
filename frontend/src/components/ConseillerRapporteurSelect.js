import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

export const CONSEILLER_RAPPORTEUR_SERVICE_ID = 15;

export function isConseillerRapporteurService(serviceId) {
  return Number(serviceId) === CONSEILLER_RAPPORTEUR_SERVICE_ID;
}

function ConseillerRapporteurSelect({ serviceId, value, onChange, t, required = false }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const enabled = isConseillerRapporteurService(serviceId);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    setLoading(true);
    axios.get('/api/utilisateurs')
      .then((res) => {
        if (!active) return;
        const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setUsers(items);
      })
      .catch(() => {
        if (active) setUsers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  const conseillerUsers = useMemo(
    () => users.filter((user) => Number(user.idService || user.serviceId) === CONSEILLER_RAPPORTEUR_SERVICE_ID),
    [users]
  );

  if (!enabled) return null;

  return (
    <div className="form-field">
      <label>{translate(t, 'conseiller_destinataire', 'Conseiller rapporteur destinataire')} *</label>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">
          {loading
            ? translate(t, 'chargement', 'Chargement...')
            : `-- ${translate(t, 'selectionner_utilisateur', 'Selectionner un utilisateur')} --`}
        </option>
        {conseillerUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.nomComplet || user.login}
          </option>
        ))}
      </select>
    </div>
  );
}

function translate(t, key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

export default ConseillerRapporteurSelect;
