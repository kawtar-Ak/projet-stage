import RoleDashboard from './RoleDashboard';

function GreffierDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_greffier"
      actions={[
        { to: '/courriers', labelKey: 'menu_courriers', icon: '@', tone: 'blue' },
        { to: '/courriers-juridiques', labelKey: 'menu_dossiers_juridiques', icon: 'F', tone: 'gold' },
        { to: '/mes-entites', labelKey: 'mes_entites', icon: 'D', tone: 'green' },
        { to: '/notifications', labelKey: 'notifications', icon: '!', tone: 'red' },
        { to: '/transactions-outgoing', labelKey: 'registre_transactions', icon: '<', tone: 'blue' },
        { to: '/circulations', labelKey: 'circulations', icon: 'C', tone: 'gold' },
        { to: '/equipements', labelKey: 'gerer_equipements', icon: 'EQ', tone: 'green' },
      ]}
    />
  );
}

export default GreffierDashboard;
