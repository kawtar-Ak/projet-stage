import RoleDashboard from './RoleDashboard';

function CaisseDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_caisse"
      actions={[
        { to: '/registre-transactions', labelKey: 'registre_transactions', icon: 'RG', tone: 'blue' },
        { to: '/notifications', labelKey: 'notification_transaction', icon: 'NT', tone: 'red' },
        { to: '/archives-entite-dj', labelKey: 'archive_entite_dj', icon: 'AR', tone: 'gold' },
        { to: '/actes-messages-judiciaires', labelKey: 'consulter_actes_messages_judiciaires', icon: 'MJ', tone: 'green' },
      ]}
    />
  );
}

export default CaisseDashboard;
