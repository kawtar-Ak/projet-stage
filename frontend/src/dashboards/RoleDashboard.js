import { useTranslation } from 'react-i18next';
import JudicialSearch from '../components/JudicialSearch';

function RoleDashboard({ titleKey, eyebrowKey = 'dashboard', subtitle, variant = '', showHeader = true }) {
  const { t } = useTranslation();
  const className = ['role-dashboard', variant].filter(Boolean).join(' ');

  return (
    <div className={className}>
      {showHeader && (
        <div className="role-dashboard-header">
          <div>
            <span className="role-dashboard-eyebrow">{t(eyebrowKey)}</span>
            <h1>{t(titleKey)}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      )}

      <JudicialSearch />
    </div>
  );
}

export default RoleDashboard;
