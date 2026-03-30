# Create Proposal Form

## Overview

Form for creating Treasury proposals in Kreivo using Community Referenda.

## Structure

### Created Components

- `CreateProposal.tsx` - Main form component
- `CreateProposal.css` - Form styles

### polkadot-api Integration

#### Required Dependencies

```bash
pnpm add polkadot-api @polkadot-api/descriptors-MYU7HCEV
```

#### Pending Implementation

The `handleSubmit` function should integrate with polkadot-api following this flow:

1. **Create Treasury Extrinsic**

   ```typescript
   // Similar to initiativeTreasuryRequest
   const treasurySpend = kreivoApi.tx.treasury.spend(amount, beneficiaryAddress)
   ```

2. **Create Proposal (Inline or with Preimage)**

   ```typescript
   const inlineProposal = kreivoApi.tx.utility
     .batchAll([treasurySpend])
     .method.toHex()

   let proposal
   if ((inlineProposal.length - 2) / 2 > 128) {
     // Use preimage for large proposals
     const preimageCall = kreivoApi.tx.preimage.notePreimage(inlineProposal)
     const hash = blake2AsHex(inlineProposal)
     proposal = {
       Lookup: {
         hash,
         len: (inlineProposal.length - 2) / 2,
       },
     }
   } else {
     proposal = {
       Inline: inlineProposal,
     }
   }
   ```

3. **Submit Referendum**

   ```typescript
   const referendumSubmit = kreivoApi.tx.communityReferenda.submit(
     {
       Communities: {
         communityId,
       },
     },
     proposal,
     {
       After: 0,
     },
   )
   ```

4. **Add Metadata (Title + Description)**

   ```typescript
   // Create metadata JSON with title and description
   const metadata = JSON.stringify({
     title: formData.title,
     description: formData.description,
   })

   const preimageMetadata = kreivoApi.tx.preimage.notePreimage(metadata)
   const metadataHash = blake2AsHex(metadata)

   const setMetadata = kreivoApi.tx.communityReferenda.setMetadata(
     referendumId, // Will be known after submission
     metadataHash,
   )
   ```

5. **Place Decision Deposit**

   ```typescript
   const placeDeposit =
     kreivoApi.tx.communityReferenda.placeDecisionDeposit(referendumId)
   ```

6. **Batch All Calls**

   ```typescript
   const batchTx = kreivoApi.tx.utility.batchAll([
     preimageCall?, // if needed
     referendumSubmit,
     preimageMetadata,
     setMetadata,
     placeDeposit
   ])

   await batchTx.signAndSend(address, { signer }, (result) => {
     console.log('Transaction status:', result.status)
   })
   ```

### Reference Files

- `/home/brayan/Documents/work/virto/xcm-programs/src/initiatives/index.ts`
- `/home/brayan/Documents/work/virto/xcm-programs/src/initiatives/treasury.ts`

### PAPI Descriptors

Descriptors are available at:

- `.papi/descriptors/dist/kreivo.d.ts`
- `.papi/metadata/kreivo.scale`

### Available Tracks

- **Grants Track** - Small community grants
- **Treasury Track** - Medium to large spending
- **Operations Track** - Technical operations

Each track has different decision curve parameters (approval and support thresholds).

## Current Status

✅ UI Form completed with validation
✅ VirtoConnect SDK integration
✅ Transaction signing implemented
✅ Error handling and notifications
✅ Visual feedback (spinner, notifications)
⚠️ Temporary implementation with `Balances.transfer_keep_alive` as placeholder

## TODO

- [ ] Verify exact pallet names in descriptor:
  - Treasury.spend or equivalent method
  - Preimage.note_preimage
  - CommunityReferenda.submit
  - CommunityReferenda.set_metadata
  - CommunityReferenda.place_decision_deposit
- [ ] Replace placeholder with real treasury calls
- [ ] Implement preimage logic for large proposals (>128 bytes)
- [ ] Add metadata with title and description
- [ ] Place decision deposit after submit
- [ ] Capture referendum ID from transaction events
- [ ] Redirect to created proposal after success

## Implementation Notes

The current code uses `Balances.transfer_keep_alive` as a placeholder because the exact method names in the Treasury, Preimage, and CommunityReferenda pallets need to be verified in the Kreivo descriptor.

To complete the implementation, review:

- `.papi/descriptors/dist/kreivo.d.ts` - Pallet and method names
- Examples in `/home/brayan/Documents/work/virto/xcm-programs/src/initiatives/`
