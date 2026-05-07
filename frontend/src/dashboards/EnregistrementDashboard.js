import RoleDashboard from './RoleDashboard';

function EnregistrementDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_enregistrement"
      actions={[
        { to: '/gestion-transactions', labelKey: 'gestion_transactions', icon: 'GT', tone: 'blue' },
        { to: '/entites-juridiques', labelKey: 'consulter_entites_juridiques', icon: 'EJ', tone: 'green' },
        { to: '/notifications', labelKey: 'notification_transaction', icon: 'NT', tone: 'red' },
        { to: '/archives-entite-ui', labelKey: 'archive_entite_ui', icon: 'AR', tone: 'gold' },
        { to: '/registre-generateur', labelKey: 'registre_generateur', icon: 'RG', tone: 'blue' },
      ]}
    />
  );
}

export default EnregistrementDashboard;
