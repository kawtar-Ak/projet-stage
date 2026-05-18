import JudicialSearch from '../components/JudicialSearch';

const stats = [
  { label: 'Modules actifs', value: '10', hint: 'Espaces de gestion', tone: 'blue' },
  { label: 'Services', value: '20', hint: 'Structure courante', tone: 'green' },
  { label: 'Acces rapide', value: '5', hint: 'Operations frequentes', tone: 'gold' },
  { label: 'Supervision', value: '24/7', hint: 'Suivi continu', tone: 'red' },
];

function AdminDashboard() {
  return (
    <div className="admin-shell">
      <section className="admin-kpis">
        {stats.map((stat) => (
          <div className={`admin-kpi ${stat.tone}`} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.hint}</small>
          </div>
        ))}
      </section>

      <JudicialSearch />
    </div>
  );
}

export default AdminDashboard;
