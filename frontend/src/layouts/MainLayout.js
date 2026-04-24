import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const serviceName = user?.nomService?.toLowerCase() || '';

    if (serviceName.includes('admin') || serviceName.includes('informatique')) {
      return [
        { label: 'Gérer les courriers', path: '/courriers' },
        { label: 'Registre', path: '/registre' },
        { label: 'Consulter messages et contenus administratifs', path: '/messages-administratifs' },
        { label: 'Consulter acteurs et messageries judiciaires', path: '/acteurs-judiciaires' },
        { label: 'Enregistrer des transactions', path: '/transactions' },
        { label: 'Notification transaction', path: '/notifications' },
        { label: 'Archiver Entité / OU', path: '/archives' },
        { label: 'Gérer les équipements', path: '/equipements' },
        { label: 'Gérer les services', path: '/services' },
        { label: 'Gérer les utilisateurs', path: '/utilisateurs' },
      ];
    }
    if (serviceName.includes('caisse')) {
      return [
        { label: 'Registre des transactions', path: '/registre-transactions' },
        { label: 'Notification transaction', path: '/notifications' },
        { label: 'Archive EntitéDJ', path: '/archives-entite-dj' },
        { label: 'Consulter actes et messages judiciaires', path: '/actes-messages' },
      ];
    }
    if (serviceName.includes('enregistrement')) {
      return [
        { label: 'Gestion des transactions', path: '/gestion-transactions' },
        { label: 'Consulter entités juridiques', path: '/entites-juridiques' },
        { label: 'Notification transaction', path: '/notifications' },
        { label: 'Archive EntitéUI', path: '/archives-entite-ui' },
        { label: 'Registre générateur', path: '/registre-generateur' },
      ];
    }
    if (serviceName.includes('greffier') || serviceName.includes('ouverture')) {
      return [
        { label: 'Créer dossier juridique', path: '/creer-dossier' },
        { label: 'Générer numéro de dossier', path: '/numeros-dossier' },
        { label: 'Consulter dossiers en cours', path: '/dossiers-encours' },
        { label: 'Transférer dossier', path: '/transferer-dossier' },
        { label: 'Suivi des retraits', path: '/retraits' },
      ];
    }
    return [
      { label: 'Consulter les dossiers', path: '/consulter-dossiers' },
      { label: 'Rechercher un dossier', path: '/rechercher' },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className="app-layout">
      <div className="main-content">
        {children}
      </div>
      <div className="sidebar">
        <div className="user-info">
          {user?.nomComplet || user?.login}
        </div>
        {menuItems.map((item, idx) => (
          <Link key={idx} to={item.path}>{item.label}</Link>
        ))}
        <hr />
        <button onClick={handleLogout} className="logout-btn">Déconnexion</button>
      </div>
    </div>
  );
}

export default MainLayout;