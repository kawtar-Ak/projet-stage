import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ActionIcon from '../components/ActionIcon';
import JudicialSearch from '../components/JudicialSearch';

const stats = [
  { labelKey: 'modules_actifs', value: '10', tone: 'blue' },
  { labelKey: 'services', value: '20', tone: 'green' },
  { labelKey: 'acces_rapide', value: '5', tone: 'gold' },
  { labelKey: 'supervision', value: '24/7', tone: 'red' },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const quickLinks = [
    { path: '/mes-entites', icon: 'fileText', label: t('mes_entites') },
    { path: '/dossiers-ouverture', icon: 'edit', label: t('dossiers_acceptes_ouverture') },
    { path: '/archives-juridiques', icon: 'archive', label: t('menu_archives_juridiques') },
    { path: '/notifications', icon: 'reply', label: t('notifications') },
  ];

  return (
    <div className="admin-shell">
      <section className="admin-kpis">
        {stats.map((stat) => (
          <div className={`admin-kpi ${stat.tone}`} key={stat.labelKey}>
            <span className="admin-kpi-marker" aria-hidden="true" />
            <div className="admin-kpi-content">
              <span className="admin-kpi-label">{t(stat.labelKey)}</span>
              <strong>{stat.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <JudicialSearch />

      <section className="admin-quick-links" aria-label={t('actions')}>
        {quickLinks.map((link) => (
          <button
            type="button"
            className="admin-quick-link"
            key={link.path}
            onClick={() => navigate(link.path)}
          >
            <span className="admin-quick-link-icon" aria-hidden="true">
              <ActionIcon name={link.icon} />
            </span>
            <span className="admin-quick-link-copy">
              <strong>{link.label}</strong>
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

export default AdminDashboard;
