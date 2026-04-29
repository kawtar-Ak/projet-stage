import React from 'react';
import { useTranslation } from 'react-i18next';

function Dashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard')}</h1>
      <div className="dashboard-pending-section">
        <h2>{t('transactions_outgoing')}</h2>
        <p>{t('aucune_transaction')}</p>
      </div>
    </div>
  );
}

export default Dashboard;
