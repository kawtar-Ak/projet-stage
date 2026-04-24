import { Link } from 'react-router-dom';

function CaisseDashboard() {
  return (
    <div>
      <h1>Dashboard Caisse</h1>
      <ul>
        <li><Link to="/registre-transactions">Registre des transactions</Link></li>
        <li><Link to="/notifications">Notification transaction</Link></li>
        <li><Link to="/archives-entite-dj">Archive EntitéDJ</Link></li>
        <li><Link to="/actes-messages-judiciaires">Consulter les actes et messages judiciaires</Link></li>
      </ul>
    </div>
  );
}

export default CaisseDashboard;