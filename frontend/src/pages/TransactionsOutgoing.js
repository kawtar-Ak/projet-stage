import React from 'react';
import { useTranslation } from 'react-i18next';

function TransactionsOutgoing() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <h1 className="page-title">{t('transactions_outgoing')}</h1>
      <div className="data-table-wrapper">
        <p>La consultation des transactions envoyees n'est pas encore branchee cote backend.</p>
      </div>
    </div>
  );
}

export default TransactionsOutgoing;
