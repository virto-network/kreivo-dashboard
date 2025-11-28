// Whitelist for Kreivo chain
// Include required storage queries and transactions
export const whitelist = [
  // Storage queries
  "query.System.Account",
  "query.Assets.Account",
  "query.Balances.Account",
  "query.Balances.TotalIssuance",
  
  // Common transactions
  "tx.Balances.transfer_keep_alive",
  "tx.Balances.transfer_all",
  "tx.Utility.batch_all",
  "tx.Utility.batch",
  "tx.System.remark",
  "tx.Assets.transfer",
  "tx.Assets.transfer_keep_alive",
  
  // All System pallet queries and calls
  "*.System",
  
  // All Assets pallet queries and calls
  "*.Assets",
  
  // All Balances pallet
  "*.Balances",
  
  // Communities pallet
  "tx.Communities.create",
  "tx.Communities.add_member",
  "tx.Communities.remove_member",
  "*.Communities",
  
  // CommunitiesManager pallet
  "tx.CommunitiesManager.register",
  "*.CommunitiesManager",
  
  // CommunityMemberships pallet
  "query.CommunityMemberships.itemPriceOf",
  "query.CommunityMemberships.Item",
  "tx.CommunityMemberships.buy_item",
  "*.CommunityMemberships",
]
