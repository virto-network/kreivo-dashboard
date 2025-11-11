import { create } from 'zustand';

export interface TransactionState {
  id: string;
  hash?: string;
  pallet: string;
  method: string;
  status: 'pending' | 'included' | 'finalized' | 'failed';
  error?: string | {
    type: string;
    value: {
      type: string;
    };
  };
  timestamp: number;
  progress: number;
}

interface TransactionStore {
  transactions: Map<string, TransactionState>;
  addTransaction: (id: string, pallet: string, method: string) => void;
  updateTransactionStatus: (id: string, status: TransactionState['status'], error?: string | { type: string; value: { type: string } }) => void;
  updateTransactionProgress: (id: string, progress: number) => void;
  removeTransaction: (id: string) => void;
  getTransactions: () => TransactionState[];
  updateTransactionHash: (id: string, hash: string) => void;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: new Map(),

  addTransaction: (id: string, pallet: string, method: string) => {
    if (!id) {
      console.warn('Store: Cannot add transaction without ID');
      return;
    }
    
    set((state) => {
      const newTransactions = new Map(state.transactions);
      newTransactions.set(id, {
        id,
        pallet: pallet || 'Unknown',
        method: method || 'Unknown',
        status: 'pending',
        timestamp: Date.now(),
        progress: 0
      });
      return { transactions: newTransactions };
    });
  },

  updateTransactionStatus: (id: string, status: TransactionState['status'], error?: string | { type: string; value: { type: string } }) => {
    set((state) => {
      const newTransactions = new Map(state.transactions);
      const transaction = newTransactions.get(id);
      if (transaction) {
        newTransactions.set(id, {
          ...transaction,
          status,
          error,
          progress: status === 'finalized' ? 100 : status === 'included' ? 50 : transaction.progress
        });
      }
      return { transactions: newTransactions };
    });
  },

  updateTransactionProgress: (id: string, progress: number) => {
    set((state) => {
      const newTransactions = new Map(state.transactions);
      const transaction = newTransactions.get(id);
      if (transaction && transaction.status !== 'finalized' && transaction.status !== 'failed') {
        newTransactions.set(id, {
          ...transaction,
          progress: Math.min(progress, 95) // Don't reach 100% until finalized
        });
      }
      return { transactions: newTransactions };
    });
  },

  removeTransaction: (id: string) => {
    set((state) => {
      const newTransactions = new Map(state.transactions);
      newTransactions.delete(id);
      return { transactions: newTransactions };
    });
  },

  getTransactions: () => {
    const transactions = Array.from(get().transactions.values());
    return transactions;
  },

  updateTransactionHash: (id: string, hash: string) => {
    set((state) => {
      const newTransactions = new Map(state.transactions);
      const transaction = newTransactions.get(id);
      if (transaction) {
        newTransactions.set(id, {
          ...transaction,
          hash: hash
        });
      }
      return { transactions: newTransactions };
    });
  }
})); 