import RoleDashboard from './RoleDashboard';

function GreffierDashboard() {
  return (
    <RoleDashboard
      titleKey="dashboard_greffier"
      actions={[
        { to: '/creer-dossier', labelKey: 'creer_dossier_juridique', icon: 'DJ', tone: 'blue' },
        { to: '/numeros-dossier', labelKey: 'generer_numero_dossier', icon: 'ND', tone: 'gold' },
        { to: '/dossiers-encours', labelKey: 'consulter_dossiers_en_cours', icon: 'EC', tone: 'green' },
        { to: '/transferer-dossier', labelKey: 'transferer_dossier', icon: 'TF', tone: 'blue' },
        { to: '/retraits', labelKey: 'suivi_retraits', icon: 'RT', tone: 'red' },
      ]}
    />
  );
}

export default GreffierDashboard;
