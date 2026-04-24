// frontend/src/dashboards/AdminDashboard.js
import { Link } from 'react-router-dom';

function AdminDashboard() {
  return (
    <div>
      <h1>Dashboard Administrateur</h1>
      <ul>
        <li><Link to="/equipements">Gérer les équipements</Link></li>
        <li><Link to="/messages-administratifs">Consulter les messages et contenus administratifs</Link></li>
        <li><Link to="/acteurs-judiciaires">Consulter les acteurs et messageries judiciaires</Link></li>
        <li><Link to="/transactions">Enregistrer des transactions</Link></li>
        <li><Link to="/notifications">Notification transaction</Link></li>
        <li><Link to="/archives">Archiver Entité / OU</Link></li>
        <li><Link to="/services">Gérer les services</Link></li>          {/* nouveau */}
        <li><Link to="/utilisateurs">Gérer les utilisateurs</Link></li>  {/* nouveau */}
      </ul>
    </div>
  );
}

export default AdminDashboard;