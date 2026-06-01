import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../dashboards/AdminDashboard';
import GreffierDashboard from '../dashboards/GreffierDashboard';
import EnregistrementDashboard from '../dashboards/EnregistrementDashboard';
import CaisseDashboard from '../dashboards/CaisseDashboard';
import EmployeDashboard from '../dashboards/EmployeDashboard';
import ConseillerRapporteurDashboard from '../dashboards/ConseillerRapporteurDashboard';

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;

  const serviceName = user.nomService.toLowerCase();

  if (user.idService === 15 || serviceName.includes('conseiller') || serviceName.includes('المستشار')) {
    return <ConseillerRapporteurDashboard />;
  }
  if (user.readOnly || user.idService === 5 || serviceName.includes('admin') || serviceName.includes('informatique') || serviceName.includes('chef de service')) {
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
