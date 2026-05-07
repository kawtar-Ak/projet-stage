// frontend/src/dashboards/AdminDashboard.js
import RoleDashboard from './RoleDashboard';

function AdminDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_admin"
      actions={[
        { to: '/equipements', labelKey: 'gerer_equipements', icon: 'EQ', tone: 'blue' },
        { to: '/messages-administratifs', labelKey: 'consulter_messages_admin', icon: 'MA', tone: 'green' },
        { to: '/acteurs-judiciaires', labelKey: 'consulter_acteurs_judiciaires', icon: 'AJ', tone: 'gold' },
        { to: '/transactions', labelKey: 'enregistrer_transactions', icon: 'TR', tone: 'blue' },
        { to: '/notifications', labelKey: 'notification_transaction', icon: 'NT', tone: 'red' },
        { to: '/archives', labelKey: 'archiver_entite_ou', icon: 'AR', tone: 'gold' },
        { to: '/services', labelKey: 'gerer_services', icon: 'SV', tone: 'green' },
        { to: '/utilisateurs', labelKey: 'gerer_utilisateurs', icon: 'US', tone: 'blue' },
      ]}
    />
  );
}

export default AdminDashboard;
