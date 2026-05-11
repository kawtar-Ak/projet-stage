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
  if (user.idService === 2 || serviceName.includes('greffe') || serviceName.includes('bureau') || serviceName.includes('مكتب الضبط')) {
    return <GreffierDashboard />;
  }
  if (serviceName.includes('enregistrement')) {
    return <EnregistrementDashboard />;
  }
  if (user.idService === 3 || serviceName.includes('ouverture') || serviceName.includes('فتح الملفات')) {
    return <CaisseDashboard />;
  }
  return <EmployeDashboard />;
}

export default DashboardRouter;
