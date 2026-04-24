import { Link } from 'react-router-dom';

function EnregistrementDashboard() {
  return (
    <div>
      <h1>Dashboard Bureau d'enregistrement</h1>
      <ul>
        <li><Link to="/gestion-transactions">Gestion des transactions</Link></li>
        <li><Link to="/entites-juridiques">Consulter les entités juridiques</Link></li>
        <li><Link to="/notifications">Notification transaction</Link></li>
        <li><Link to="/archives-entite-ui">Archive EntitéUI</Link></li>
        <li><Link to="/registre-generateur">Registre générateur</Link></li>
      </ul>
    </div>
  );
}

export default EnregistrementDashboard;