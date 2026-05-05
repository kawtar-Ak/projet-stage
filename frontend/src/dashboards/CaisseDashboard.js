import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function CaisseDashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard_caisse')}</h1>
      <ul>
        <li><Link to="/registre-transactions">{t('registre_transactions')}</Link></li>
        <li><Link to="/notifications">{t('notification_transaction')}</Link></li>
        <li><Link to="/archives-entite-dj">{t('archive_entite_dj')}</Link></li>
        <li><Link to="/actes-messages-judiciaires">{t('consulter_actes_messages_judiciaires')}</Link></li>
      </ul>
    </div>
  );
}

export default CaisseDashboard;
