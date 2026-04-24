import { Link } from 'react-router-dom';

function EmployeDashboard() {
  return (
    <div>
      <h1>Dashboard Employé</h1>
      <ul>
        <li><Link to="/consulter-dossiers">Consulter les dossiers</Link></li>
        <li><Link to="/rechercher">Rechercher un dossier</Link></li>
      </ul>
    </div>
  );
}

export default EmployeDashboard;