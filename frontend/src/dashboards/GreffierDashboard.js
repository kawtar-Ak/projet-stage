import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function GreffierDashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard_greffier')}</h1>
      <ul>
        <li><Link to="/creer-dossier">{t('creer_dossier_juridique')}</Link></li>
        <li><Link to="/numeros-dossier">{t('generer_numero_dossier')}</Link></li>
        <li><Link to="/dossiers-encours">{t('consulter_dossiers_en_cours')}</Link></li>
        <li><Link to="/transferer-dossier">{t('transferer_dossier')}</Link></li>
        <li><Link to="/retraits">{t('suivi_retraits')}</Link></li>
      </ul>
    </div>
  );
}

export default GreffierDashboard;
