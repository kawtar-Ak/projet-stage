import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function EmployeDashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard_employe')}</h1>
      <ul>
        <li><Link to="/consulter-dossiers">{t('consulter_dossiers')}</Link></li>
        <li><Link to="/rechercher">{t('rechercher_dossier')}</Link></li>
      </ul>
    </div>
  );
}

export default EmployeDashboard;
