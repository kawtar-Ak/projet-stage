import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function RoleDashboard({ titleKey, eyebrowKey = 'dashboard', subtitle, actions = [], variant = '' }) {
  const { t } = useTranslation();
  const visibleActions = actions.filter(Boolean);
  const className = ['role-dashboard', variant].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <div className="role-dashboard-header">
        <div>
          <span className="role-dashboard-eyebrow">{t(eyebrowKey)}</span>
          <h1>{t(titleKey)}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="role-dashboard-count">
          <strong>{visibleActions.length}</strong>
          <span>{t('actions')}</span>
        </div>
      </div>

      <div className="role-actions-grid">
        {visibleActions.map((action, index) => (
          <Link className="role-action-card" to={action.to} key={action.to}>
            <span className={`role-action-icon ${action.tone || ''}`}>
              {action.icon || String(index + 1).padStart(2, '0')}
            </span>
            <span className="role-action-content">
              <strong>{t(action.labelKey)}</strong>
              <small>{action.description || (action.descriptionKey ? t(action.descriptionKey) : t('ouvrir'))}</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default RoleDashboard;
