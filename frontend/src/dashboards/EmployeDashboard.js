import RoleDashboard from './RoleDashboard';

function EmployeDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_employe"
      actions={[
        { to: '/consulter-dossiers', labelKey: 'consulter_dossiers', icon: 'CD', tone: 'green' },
        { to: '/rechercher', labelKey: 'rechercher_dossier', icon: 'RD', tone: 'blue' },
      ]}
    />
  );
}

export default EmployeDashboard;
