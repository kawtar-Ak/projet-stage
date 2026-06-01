import RoleDashboard from './RoleDashboard';

function ConseillerRapporteurDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_conseiller_rapporteur"
      showHeader={false}
      actions={[
        { to: '/recherche', labelKey: 'menu_recherche', icon: 'R', tone: 'red' },
      ]}
    />
  );
}

export default ConseillerRapporteurDashboard;
