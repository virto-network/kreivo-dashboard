export interface Command {
  id: string;
  label: string;
  keywords: string[];
  related: string[];
  category: string;
}

export const commands: Command[] = [
  {
    id: 'create-dao',
    label: 'Create DAO',
    keywords: ['create', 'dao', 'organization', 'new', 'setup'],
    related: ['view-daos', 'join-dao', 'dao-proposals'],
    category: 'DAO',
  },
  {
    id: 'view-daos',
    label: 'View DAOs',
    keywords: ['view', 'list', 'daos', 'organizations', 'browse'],
    related: ['create-dao', 'join-dao', 'dao-details'],
    category: 'DAO',
  },
  {
    id: 'join-dao',
    label: 'Join DAO',
    keywords: ['join', 'dao', 'member', 'participate', 'enter'],
    related: ['create-dao', 'view-daos', 'dao-proposals'],
    category: 'DAO',
  },
  {
    id: 'dao-proposals',
    label: 'DAO Proposals',
    keywords: ['proposal', 'vote', 'governance', 'dao', 'suggest'],
    related: ['create-dao', 'view-daos', 'vote-proposal'],
    category: 'DAO',
  },
  {
    id: 'vote-proposal',
    label: 'Vote on Proposal',
    keywords: ['vote', 'proposal', 'poll', 'decide', 'choice'],
    related: ['dao-proposals', 'view-proposals', 'proposal-details'],
    category: 'DAO',
  },

  {
    id: 'send-transaction',
    label: 'Send Transaction',
    keywords: ['send', 'transaction', 'transfer', 'pay', 'tx'],
    related: ['view-transactions', 'transaction-history', 'transaction-status'],
    category: 'Transaction',
  },
  

  {
    id: 'block-explorer',
    label: 'Block Explorer',
    keywords: ['block', 'explorer', 'chain', 'blocks', 'blockchain'],
    related: ['view-blocks', 'block-details', 'latest-blocks'],
    category: 'Explorer',
  },
  {
    id: 'view-blocks',
    label: 'View Latest Blocks',
    keywords: ['blocks', 'latest', 'chain', 'recent', 'blockchain'],
    related: ['block-explorer', 'block-details', 'block-height'],
    category: 'Explorer',
  },
  {
    id: 'block-details',
    label: 'Block Details',
    keywords: ['block', 'details', 'info', 'hash', 'number'],
    related: ['block-explorer', 'view-blocks', 'transaction-details'],
    category: 'Explorer',
  },
  {
    id: 'block-height',
    label: 'Block Height',
    keywords: ['height', 'block', 'number', 'latest', 'chain'],
    related: ['block-explorer', 'view-blocks', 'block-details'],
    category: 'Explorer',
  },


  {
    id: 'account-balance',
    label: 'Account Balance',
    keywords: ['balance', 'account', 'funds', 'tokens', 'wallet'],
    related: ['view-account', 'account-history', 'transfer-funds'],
    category: 'Account',
  },
  
  
  {
    id: 'join-community',
    label: 'Join Community',
    keywords: ['join', 'community', 'group', 'participate', 'enter'],
    related: ['view-communities', 'community-details', 'leave-community'],
    category: 'Community',
  },
  {
    id: 'add-member-community',
    label: 'Add Member to Community',
    keywords: ['add', 'member', 'community', 'invite'],
    related: ['view-communities', 'join-community', 'community-details'],
    category: 'Community',
  },
];

export const defaultSuggestions: string[] = [
  'create-dao',
  'block-explorer',
  'send-transaction',
];


