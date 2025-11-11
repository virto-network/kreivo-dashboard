import React, { useEffect, useState } from 'react';
import { useTransactionStore } from '@/stores/transactionStore';
import TransactionAlert from './TransactionAlert';

const TransactionAlertContainer: React.FC = () => {
  const { removeTransaction, getTransactions } = useTransactionStore();
  const transactionList = getTransactions();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const transactionsToRemove = transactionList.filter(
      t => t.status === 'finalized' || t.status === 'failed'
    );

    transactionsToRemove.forEach(transaction => {
      const timer = setTimeout(() => {
        removeTransaction(transaction.id);
      }, 10000);

      return () => clearTimeout(timer);
    });
  }, [transactionList, removeTransaction]);

  if (transactionList.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 max-h-screen overflow-y-auto">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            {isCollapsed ? "Tx" : "Transactions"}
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title={isCollapsed ? "Show details" : "Hide details"}
          >
            {isCollapsed ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {transactionList.map((transaction) => (
          <div key={transaction.id} className="border-b border-gray-100 last:border-b-0">
            <TransactionAlert
              transaction={transaction}
              onClose={() => removeTransaction(transaction.id)}
              isCollapsed={isCollapsed}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionAlertContainer; 