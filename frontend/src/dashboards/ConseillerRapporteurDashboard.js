import RoleDashboard from './RoleDashboard';

function ConseillerRapporteurDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_conseiller_rapporteur"
      actions={[
        { to: '/notifications', labelKey: 'documents_retourner', icon: 'RT', tone: 'red' },
        { to: '/transactions-outgoing', labelKey: 'registre_transactions', icon: 'RG', tone: 'blue' },
        { to: '/circulations', labelKey: 'circulations', icon: 'C', tone: 'gold' },
      ]}
    />
  );
}

export default ConseillerRapporteurDashboard;
