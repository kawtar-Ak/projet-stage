import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('i18nextLng', lng);
  };

  const getMenuItems = () => {
    const serviceName = user?.nomService?.toLowerCase() || '';

    // Liens communs (disponibles pour tous les services)
    const commonLinks = [
        { label: 'dashboard', path: '/dashboard' },
        { label: 'mes_entites', path: '/mes-entites' },
        { label: 'transactions_outgoing', path: '/transactions-outgoing' },
        { label: 'notifications', path: '/notifications' }
    ];

    // Liens spécifiques selon le service
    if (serviceName.includes('admin') || serviceName.includes('informatique')) {
        return [
            ...commonLinks,
        { label: 'Gérer les courriers', path: '/courriers' },
        { label: 'Registre', path: '/registre' },
        { label: 'Consulter messages et contenus administratifs', path: '/messages-administratifs' },
        { label: 'Consulter acteurs et messageries judiciaires', path: '/acteurs-judiciaires' },
        { label: 'Gérer les équipements', path: '/equipements' },
        { label: 'Gérer les services', path: '/services' },
        { label: 'Gérer les utilisateurs', path: '/utilisateurs' },
        ];
    }
    if (serviceName.includes('caisse')) {
        return [ ...commonLinks, { label: 'registre', path: '/registre' } ];
    }
    if (serviceName.includes('enregistrement')) {
        return [ ...commonLinks, { label: 'registre', path: '/registre' } ];
    }
    if (serviceName.includes('greffier') || serviceName.includes('ouverture')) {
        return [ ...commonLinks, { label: 'registre', path: '/registre' } ];
    }
    // Autres services (par défaut)
    return commonLinks;
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
        {/* Sélecteur de langue */}
        <div className="language-switcher" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
          <button onClick={() => changeLanguage('fr')} className="btn-secondary" style={{ fontSize: '0.8rem' }}>🇫🇷 FR</button>
          <button onClick={() => changeLanguage('ar')} className="btn-secondary" style={{ fontSize: '0.8rem' }}>🇸🇦 AR</button>
        </div>
        {menuItems.map((item, idx) => (
          <Link key={idx} to={item.path}>{t(item.label)}</Link>
        ))}
        <hr />
        <button onClick={handleLogout} className="logout-btn">{t('deconnexion')}</button>
      </div>
    </div>
  );
}

export default MainLayout;
