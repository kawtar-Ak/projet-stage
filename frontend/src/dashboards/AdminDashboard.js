import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ActionIcon from '../components/ActionIcon';
import JudicialSearch from '../components/JudicialSearch';

const stats = [
  { label: 'Modules actifs', value: '10', hint: 'Espaces de gestion', tone: 'blue' },
  { label: 'Services', value: '20', hint: 'Structure courante', tone: 'green' },
  { label: 'Acces rapide', value: '5', hint: 'Operations frequentes', tone: 'gold' },
  { label: 'Supervision', value: '24/7', hint: 'Suivi continu', tone: 'red' },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const quickLinks = [
    { path: '/mes-entites', icon: 'fileText', label: t('mes_entites'), description: t('quick_link_desc') },
    { path: '/dossiers-ouverture', icon: 'edit', label: t('dossiers_acceptes_ouverture'), description: t('dossiers_acceptes_ouverture_desc') },
    { path: '/archives-juridiques', icon: 'archive', label: t('menu_archives_juridiques'), description: t('quick_link_desc') },
    { path: '/notifications', icon: 'reply', label: t('notifications'), description: t('notification_transaction') },
  ];

  return (
    <div className="admin-shell">
      <section className="admin-kpis">
        {stats.map((stat) => (
          <div className={`admin-kpi ${stat.tone}`} key={stat.label}>
            <span className="admin-kpi-marker" aria-hidden="true" />
            <div className="admin-kpi-content">
              <span className="admin-kpi-label">{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.hint}</small>
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
              <small>{link.description}</small>
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

export default AdminDashboard;
