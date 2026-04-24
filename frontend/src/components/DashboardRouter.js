import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../dashboards/AdminDashboard';
import GreffierDashboard from '../dashboards/GreffierDashboard';
import EnregistrementDashboard from '../dashboards/EnregistrementDashboard';
import CaisseDashboard from '../dashboards/CaisseDashboard';
import EmployeDashboard from '../dashboards/EmployeDashboard';

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;

  const serviceName = user.nomService.toLowerCase();

  // Adapter ces conditions aux noms réels de vos services
  if (serviceName.includes('admin') || serviceName.includes('informatique')) {
    return <AdminDashboard />;
  }
  if (serviceName.includes('greffier') || serviceName.includes('ouverture')) {
    return <GreffierDashboard />;
  }
  if (serviceName.includes('enregistrement')) {
    return <EnregistrementDashboard />;
  }
  if (serviceName.includes('caisse')) {
    return <CaisseDashboard />;
  }
  return <EmployeDashboard />;
}

export default DashboardRouter;