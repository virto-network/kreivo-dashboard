import { useEffect, useCallback } from 'react';
import { useTransactionStore } from '@/stores/transactionStore';

interface TransactionEvent {
  id: string;
  type: 'submitted' | 'pending' | 'included' | 'finalized' | 'failed';
  transaction: {
    hash?: string;
    txHash?: string;
    pallet?: string;
    method?: string;
    error?: any;
  };
}

interface ExtractedTransactionData {
  hash: string | null;
  pallet: string;
  method: string;
  error?: any;
}

export const useTransactionListener = () => {
  const { addTransaction, updateTransactionStatus, updateTransactionHash } = useTransactionStore();

  const extractTransactionData = useCallback((event: CustomEvent): ExtractedTransactionData | null => {
    try {
      const { transaction } = event.detail as TransactionEvent;
      
      if (!transaction) {
        console.warn('Transaction object is missing in event');
        return null;
      }

      const hash = transaction.hash || transaction.txHash || null;
      
      const pallet = transaction.pallet || 'System';
      const method = transaction.method || 'remark_with_event';
      
      return {
        hash,
        pallet,
        method,
        error: transaction.error
      };
    } catch (error) {
      console.error('Error extracting transaction data:', error);
      return null;
    }
  }, []);

  const validateTransactionId = useCallback((event: CustomEvent): string | null => {
    try {
      const transactionId = event.detail?.id;
      
      if (!transactionId || typeof transactionId !== 'string') {
        console.warn('Invalid or missing transaction ID:', transactionId);
        return null;
      }
      
      return transactionId;
    } catch (error) {
      console.error('Error validating transaction ID:', error);
      return null;
    }
  }, []);

  const handleSubmittedTransaction = useCallback((event: CustomEvent) => {
    const transactionId = validateTransactionId(event);
    const transactionData = extractTransactionData(event);
    
    if (!transactionId || !transactionData) {
      console.warn('Cannot add transaction: missing required data');
      return;
    }

    try {
      addTransaction(transactionId, transactionData.pallet, transactionData.method);
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  }, [validateTransactionId, extractTransactionData, addTransaction]);

  const handleStatusUpdate = useCallback((event: CustomEvent, status: 'included' | 'finalized' | 'failed') => {
    const transactionId = validateTransactionId(event);
    const transactionData = extractTransactionData(event);
    
    if (!transactionId) {
      console.warn(`Cannot update transaction status to ${status}: missing transaction ID`);
      return;
    }

    try {
      if (transactionData?.hash) {
        updateTransactionHash(transactionId, transactionData.hash);
      }
      
      if (status === 'failed' && transactionData?.error) {
        updateTransactionStatus(transactionId, status, transactionData.error);
      } else {
        updateTransactionStatus(transactionId, status);
      }
    } catch (error) {
      console.error(`Error updating transaction status to ${status}:`, error);
    }
  }, [validateTransactionId, extractTransactionData, updateTransactionHash, updateTransactionStatus]);

  const eventHandlers = useCallback(() => ({
    submitted: () => handleSubmittedTransaction,
    pending: () => handleSubmittedTransaction,
    included: () => (event: CustomEvent) => handleStatusUpdate(event, 'included'),
    finalized: () => (event: CustomEvent) => handleStatusUpdate(event, 'finalized'),
    failed: () => (event: CustomEvent) => handleStatusUpdate(event, 'failed'),
  }), [handleSubmittedTransaction, handleStatusUpdate]);

  const handleTransactionUpdate = useCallback((event: CustomEvent) => {
    try {
      const { type } = event.detail as TransactionEvent;
      
      if (!type) {
        console.warn('Transaction event missing type');
        return;
      }

      const handlers = eventHandlers();
      const handler = handlers[type as keyof typeof handlers];
      
      if (handler) {
        handler()(event);
      } else {
        console.warn('Unknown transaction event type:', type);
      }
    } catch (error) {
      console.error('Error handling transaction update:', error);
    }
  }, [eventHandlers]);

  useEffect(() => {
    if (!addTransaction || !updateTransactionStatus || !updateTransactionHash) {
      console.error('Transaction store methods not available');
      return;
    }

    try {
      document.addEventListener('transactionUpdate', handleTransactionUpdate as EventListener);
    } catch (error) {
      console.error('Error setting up transaction listener:', error);
    }

    return () => {
      try {
        document.removeEventListener('transactionUpdate', handleTransactionUpdate as EventListener);
        console.log('Transaction listener cleanup complete');
      } catch (error) {
        console.error('Error cleaning up transaction listener:', error);
      }
    };
  }, [handleTransactionUpdate, addTransaction, updateTransactionStatus, updateTransactionHash]);
}; 