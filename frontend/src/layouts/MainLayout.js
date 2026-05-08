import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'fr').split('-')[0];

  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const getMenuItems = () => {
    const serviceName = user?.nomService?.toLowerCase() || '';
    const serviceId = user?.idService;

    const commonLinks = [
      { labelKey: 'dashboard', icon: 'grid', path: '/dashboard' },
      { labelKey: 'menu_courriers', icon: 'mail', path: '/courriers' },
      { labelKey: 'menu_dossiers_juridiques', icon: 'folder', path: '/courriers-juridiques' },
      { labelKey: 'mes_entites', icon: 'building', path: '/mes-entites' },
      { labelKey: 'circulations', icon: 'send', path: '/circulations' },
      { labelKey: 'registre_transactions', icon: 'send', path: '/transactions-outgoing' },
      { labelKey: 'notifications', icon: 'bell', path: '/notifications' }
    ];

    if (serviceId === 13 || serviceName.includes('archivage') || serviceName.includes('archive')) {
      return [
        { labelKey: 'dashboard', icon: 'grid', path: '/dashboard' },
        { labelKey: 'notifications', icon: 'bell', path: '/notifications' },
        { labelKey: 'menu_archives_juridiques', icon: 'archive', path: '/archives-juridiques' },
        { labelKey: 'registre_transactions', icon: 'send', path: '/transactions-outgoing' }
      ];
    }

    if (serviceId === 1 || serviceName.includes('خلية المعلومات')) {
      return [
        ...commonLinks,
        { labelKey: 'menu_archives_juridiques', icon: 'archive', path: '/archives-juridiques' },
        { labelKey: 'equipements', icon: 'settings', path: '/equipements' },
        { labelKey: 'services', icon: 'service', path: '/services' },
        { labelKey: 'utilisateurs', icon: 'users', path: '/utilisateurs' }
      ];
    }

    if (
      serviceName.includes('الحفظ') ||
      serviceName.includes('رئيس المصلحة') ||
      serviceName.includes('مكتب الضبط') ||
      serviceName.includes('فتح الملفات') ||
      [2, 3, 5, 13].includes(serviceId)
    ) {
      if (serviceId === 2 || serviceName.includes('bureau') || serviceName.includes('greffe')) {
        return [
          ...commonLinks,
          { labelKey: 'gerer_equipements', icon: 'settings', path: '/equipements' }
        ];
      }

      return commonLinks;
    }

    return commonLinks;
  };

  const menuItems = getMenuItems();
  const displayName = user?.nomComplet || user?.login || t('administrateur');
  const serviceLabel = user?.nomService || 'IT';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand" aria-label="Justice">
          <div className="brand-mark">⚖</div>
        </div>

        <div className="user-info">
          <div className="user-avatar" aria-hidden="true"></div>
          <div>
            <strong>{displayName}</strong>
            <span>{serviceLabel}</span>
            <small>{t('connecte')}</small>
          </div>
        </div>

        <div className="language-switcher" aria-label={t('changer_langue')}>
          <button onClick={() => changeLanguage('fr')} className={currentLanguage === 'fr' ? 'active' : ''}>
            <strong>FR</strong>
            <span>FR</span>
          </button>
          <button onClick={() => changeLanguage('ar')} className={currentLanguage === 'ar' ? 'active' : ''}>
            <strong>AR</strong>
            <span>SA</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => (
            <NavLink
              key={`${item.path}-${idx}`}
              to={item.path}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true"></span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          <span className="nav-icon nav-icon-logout" aria-hidden="true"></span>
          <span>{t('deconnexion')}</span>
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

export default MainLayout;
