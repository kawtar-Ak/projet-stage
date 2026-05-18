import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div>{t('chargement')}</div>;
  return user ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
