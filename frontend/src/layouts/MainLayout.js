import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [openGroupKey, setOpenGroupKey] = useState('');

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
    const isConseillerRapporteur = serviceId === 15 || serviceName.includes('conseiller') || serviceName.includes('المستشار');
    const isServiceChief = serviceId === 5 || serviceName.includes('chef de service');
    const isNotificationCopies = serviceId === 7 || serviceName.includes('notification') || serviceName.includes('copies');
    const searchLink = { labelKey: 'menu_recherche', icon: 'search', path: '/recherche' };

    const commonLinks = [
      { labelKey: 'dashboard', icon: 'grid', path: '/dashboard' },
      searchLink,
      { labelKey: 'menu_courriers', icon: 'mail', path: '/courriers' },
      { labelKey: 'menu_dossiers_juridiques', icon: 'folder', path: '/courriers-juridiques' },
      { labelKey: 'mes_entites', icon: 'building', path: '/mes-entites' },
      { labelKey: 'circulations', icon: 'send', path: '/circulations' },
      { labelKey: 'registre_transactions', icon: 'send', path: '/transactions-outgoing' },
      { labelKey: 'notifications', icon: 'bell', path: '/notifications' }
    ];

    const adminLinks = [
      ...commonLinks,
      { labelKey: 'menu_archives_juridiques', icon: 'archive', path: '/archives-juridiques' },
      { labelKey: 'gestion_copies', icon: 'folder', path: '/gestion-copies' },
      { labelKey: 'equipements', icon: 'settings', path: '/equipements' },
      { labelKey: 'services', icon: 'service', path: '/services' },
      { labelKey: 'utilisateurs', icon: 'users', path: '/utilisateurs' },
      { labelKey: 'gestion_listes', icon: 'settings', path: '/gestion-listes' }
    ];

    if (isConseillerRapporteur) {
      return [
        { labelKey: 'dashboard', icon: 'grid', path: '/dashboard' },
        searchLink
      ];
    }

    if (isServiceChief || user?.readOnly || serviceId === 1 || serviceName.includes('informatique')) {
      return adminLinks;
    }

    if (isNotificationCopies) {
      return [
        { labelKey: 'dashboard', icon: 'grid', path: '/dashboard' },
        searchLink,
        { labelKey: 'mes_entites', icon: 'building', path: '/mes-entites' },
        { labelKey: 'circulations', icon: 'send', path: '/circulations' },
        { labelKey: 'registre_transactions', icon: 'send', path: '/transactions-outgoing' },
        { labelKey: 'notifications', icon: 'bell', path: '/notifications' },
        { labelKey: 'gestion_copies', icon: 'folder', path: '/gestion-copies' }
      ];
    }

    if (serviceId === 13 || serviceName.includes('archivage') || serviceName.includes('archive')) {
      return [
        { labelKey: 'dashboard', icon: 'grid', path: '/dashboard' },
        searchLink,
        { labelKey: 'mes_entites', icon: 'building', path: '/mes-entites' },
        { labelKey: 'notifications', icon: 'bell', path: '/notifications' },
        { labelKey: 'menu_archives_juridiques', icon: 'archive', path: '/archives-juridiques' },
        { labelKey: 'registre_transactions', icon: 'send', path: '/transactions-outgoing' }
      ];
    }

    if (serviceId === 3 || serviceName.includes('ouverture')) {
      return [
        { labelKey: 'dashboard', icon: 'grid', path: '/dashboard' },
        searchLink,
        { labelKey: 'menu_dossiers_juridiques', icon: 'folder', path: '/courriers-juridiques' },
        { labelKey: 'mes_entites', icon: 'building', path: '/mes-entites' },
        { labelKey: 'notifications', icon: 'bell', path: '/notifications' },
        { labelKey: 'dossiers_acceptes_ouverture', icon: 'folder', path: '/dossiers-ouverture' },
        { labelKey: 'registre_transactions', icon: 'send', path: '/transactions-outgoing' }
      ];
    }

    if ([2, 3, 13].includes(serviceId) || serviceName.includes('bureau') || serviceName.includes('greffe')) {
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

  const buildMenuGroups = (items) => {
    const groupedItems = items.filter((item) => item.path !== '/dashboard');
    const groupDefinitions = [
      {
        key: 'documents',
        labelKey: 'menu_group_documents',
        icon: 'folder',
        paths: ['/recherche', '/courriers', '/courriers-juridiques', '/mes-entites']
      },
      {
        key: 'transactions',
        labelKey: 'menu_group_transactions',
        icon: 'send',
        paths: ['/notifications', '/circulations', '/transactions-outgoing']
      },
      {
        key: 'administration',
        labelKey: 'menu_group_administration',
        icon: 'settings',
        paths: ['/equipements', '/services', '/utilisateurs', '/gestion-listes']
      },
      {
        key: 'special',
        labelKey: 'menu_group_special',
        icon: 'grid',
        paths: []
      }
    ];

    const grouped = groupedItems.reduce(
      (acc, item) => {
        const matchedGroup = groupDefinitions.find((group) => group.paths.includes(item.path));
        const groupKey = matchedGroup?.key || 'special';
        acc[groupKey].push(item);
        return acc;
      },
      { documents: [], transactions: [], administration: [], special: [] }
    );

    return groupDefinitions
      .map((group) => ({ ...group, items: grouped[group.key] }))
      .filter((group) => group.items.length > 0);
  };

  const menuItems = getMenuItems();
  const topMenuItems = menuItems.filter((item) => item.path === '/dashboard');
  const menuGroups = buildMenuGroups(menuItems);
  const displayName = user?.nomComplet || user?.login || t('administrateur');
  const rawServiceLabel = user?.nomService || t('service_informatique');
  const serviceLabel = String(rawServiceLabel).trim().toLowerCase() === 'abp' ? '' : rawServiceLabel;
  const menuPositionClass = currentLanguage === 'ar' ? 'menu-right' : 'menu-left';
  const layoutClassName = `app-layout ${menuPositionClass}${user?.readOnly ? ' read-only-mode' : ''}`;

  return (
    <div className={layoutClassName}>
      <aside className="sidebar">
        <div className="sidebar-brand" aria-label="Justice">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 3v18" />
              <path d="M5 21h14" />
              <path d="M3 7h2c2.2 0 4.8-.9 7-2 2.2 1.1 4.8 2 7 2h2" />
              <path d="M6 7 3 15" />
              <path d="M6 7l3 8" />
              <path d="M3 15h6" />
              <path d="M18 7l-3 8" />
              <path d="M18 7l3 8" />
              <path d="M15 15h6" />
            </svg>
          </div>
        </div>

        <div className="user-info">
          <div className="user-avatar" aria-hidden="true"></div>
          <div>
            <strong>{displayName}</strong>
            {serviceLabel && <span>{serviceLabel}</span>}
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
            <span>AR</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {topMenuItems.map((item, idx) => (
            <NavLink
              key={`${item.path}-${idx}`}
              to={item.path}
              className={({ isActive }) => `sidebar-main-link${isActive ? ' active' : ''}`}
            >
              <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true"></span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}

          {menuGroups.map((group) => (
            <section className={`sidebar-section${openGroupKey === group.key ? ' open' : ''}`} key={group.key}>
              <button
                type="button"
                className="sidebar-section-title"
                onClick={() => setOpenGroupKey((currentGroupKey) => (currentGroupKey === group.key ? '' : group.key))}
                aria-expanded={openGroupKey === group.key}
              >
                <span>{t(group.labelKey)}</span>
                <span className="sidebar-section-title-icons">
                  <span className={`nav-icon nav-icon-${group.icon}`} aria-hidden="true"></span>
                  <span className="sidebar-section-chevron" aria-hidden="true"></span>
                </span>
              </button>

              <div className="sidebar-section-links" hidden={openGroupKey !== group.key}>
                {group.items.map((item, idx) => (
                  <NavLink
                    key={`${item.path}-${idx}`}
                    to={item.path}
                    className={({ isActive }) => (isActive ? 'active' : undefined)}
                  >
                    <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true"></span>
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          <span className="nav-icon nav-icon-logout" aria-hidden="true"></span>
          <span>{t('deconnexion')}</span>
        </button>
      </aside>

      <main className="main-content">
        {user?.readOnly && (
          <div className="read-only-banner">
            {t('mode_consultation_banniere')}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
