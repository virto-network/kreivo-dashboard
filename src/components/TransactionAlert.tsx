import React, { useEffect, useState } from 'react';
import type { TransactionState } from '@/stores/transactionStore';

interface TransactionAlertProps {
  transaction: TransactionState;
  onClose: () => void;
  isCollapsed?: boolean;
}

const TransactionAlert: React.FC<TransactionAlertProps> = ({ transaction, onClose, isCollapsed = false }) => {
  const [localProgress, setLocalProgress] = useState(transaction.progress);

  useEffect(() => {
    if (transaction.status === 'pending') {
      const interval = setInterval(() => {
        setLocalProgress(prev => {
          const increment = 0.5;
          return Math.min(prev + increment, 45); // Maximum 45% while pending
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (transaction.status === 'included') {
      // When included in block, slower progress up to 90%
      const interval = setInterval(() => {
        setLocalProgress(prev => {
          const increment = 0.3; // Slower increment
          return Math.min(prev + increment, 90);
        });
      }, 1500);

      return () => clearInterval(interval);
    } else {
      setLocalProgress(transaction.progress);
    }
  }, [transaction.status, transaction.progress]);

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'included':
        return 'bg-blue-500';
      case 'finalized':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (transaction.status) {
      case 'pending':
        return 'Sending transaction...';
      case 'included':
        return 'Included in block';
      case 'finalized':
        return 'Finalized';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'pending':
        return (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'included':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'finalized':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatHash = (hash: string) => {
    if (!hash || typeof hash !== 'string') {
      return 'Unknown hash';
    }
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  if (isCollapsed) {
    return (
      <div className="w-24 bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-in">
        <div className="p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">{transaction.id}</span>
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-in">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium text-gray-900">ID: {transaction.hash ? formatHash(transaction.hash) : transaction.id}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center mb-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getStatusText()}</span>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ease-out ${
              transaction.status === 'failed' ? 'bg-red-500' :
              transaction.status === 'finalized' ? 'bg-green-500' :
              transaction.status === 'included' ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${localProgress}%` }}
          ></div>
        </div>

        {transaction.status === 'failed' && transaction.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {typeof transaction.error === 'string' ? (
              transaction.error
            ) : (
              <div>
                <div className="font-medium">Error Type: {transaction.error.type}</div>
                {transaction.error.value && typeof transaction.error.value === 'object' && 'type' in transaction.error.value && (
                  <div>Value Type: {transaction.error.value.type}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionAlert; 