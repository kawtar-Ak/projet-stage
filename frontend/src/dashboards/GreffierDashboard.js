import { Link } from 'react-router-dom';

function GreffierDashboard() {
  return (
    <div>
      <h1>Dashboard Greffier (Bureau d'ouverture)</h1>
      <ul>
        <li><Link to="/creer-dossier">Créer un dossier juridique</Link></li>
        <li><Link to="/numeros-dossier">Générer / attribuer numéro de dossier</Link></li>
        <li><Link to="/dossiers-encours">Consulter les dossiers en cours</Link></li>
        <li><Link to="/transferer-dossier">Transférer un dossier</Link></li>
        <li><Link to="/retraits">Suivi des retraits</Link></li>
      </ul>
    </div>
  );
}

export default GreffierDashboard;