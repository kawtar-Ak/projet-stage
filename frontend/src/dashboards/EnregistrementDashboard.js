import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function EnregistrementDashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard_enregistrement')}</h1>
      <ul>
        <li><Link to="/gestion-transactions">{t('gestion_transactions')}</Link></li>
        <li><Link to="/entites-juridiques">{t('consulter_entites_juridiques')}</Link></li>
        <li><Link to="/notifications">{t('notification_transaction')}</Link></li>
        <li><Link to="/archives-entite-ui">{t('archive_entite_ui')}</Link></li>
        <li><Link to="/registre-generateur">{t('registre_generateur')}</Link></li>
      </ul>
    </div>
  );
}

export default EnregistrementDashboard;
