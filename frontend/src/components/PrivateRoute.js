import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  return user ? children : <Navigate to="/login" />;
}
function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('dashboard')}</h1>;
}
export default PrivateRoute;