// frontend/src/dashboards/AdminDashboard.js
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function AdminDashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard_admin')}</h1>
      <ul>
        <li><Link to="/equipements">{t('gerer_equipements')}</Link></li>
        <li><Link to="/messages-administratifs">{t('consulter_messages_admin')}</Link></li>
        <li><Link to="/acteurs-judiciaires">{t('consulter_acteurs_judiciaires')}</Link></li>
        <li><Link to="/transactions">{t('enregistrer_transactions')}</Link></li>
        <li><Link to="/notifications">{t('notification_transaction')}</Link></li>
        <li><Link to="/archives">{t('archiver_entite_ou')}</Link></li>
        <li><Link to="/services">{t('gerer_services')}</Link></li>
        <li><Link to="/utilisateurs">{t('gerer_utilisateurs')}</Link></li>
      </ul>
    </div>
  );
}

export default AdminDashboard;
