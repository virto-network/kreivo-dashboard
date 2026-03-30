# Create Proposal Form

## Overview

Formulario para crear propuestas de Treasury en Kreivo usando Community Referenda.

## Estructura

### Componentes Creados

- `CreateProposal.tsx` - Componente principal del formulario
- `CreateProposal.css` - Estilos del formulario

### Integración con polkadot-api

#### Dependencias Necesarias

```bash
pnpm add polkadot-api @polkadot-api/descriptors-MYU7HCEV
```

#### Implementación Pendiente

La función `handleSubmit` debe integrarse con polkadot-api siguiendo este flujo:

1. **Crear el extrinsic de Treasury**

   ```typescript
   // Similar a initiativeTreasuryRequest
   const treasurySpend = kreivoApi.tx.treasury.spend(amount, beneficiaryAddress)
   ```

2. **Crear la propuesta inline o con preimage**

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

3. **Submit referendum**

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

4. **Add metadata (descripción + título)**

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

5. **Place decision deposit**

   ```typescript
   const placeDeposit =
     kreivoApi.tx.communityReferenda.placeDecisionDeposit(referendumId)
   ```

6. **Batch all calls**

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

### Archivos de Referencia

- `/home/brayan/Documents/work/virto/xcm-programs/src/initiatives/index.ts`
- `/home/brayan/Documents/work/virto/xcm-programs/src/initiatives/treasury.ts`

### Descriptors de PAPI

Los descriptors están disponibles en:

- `.papi/descriptors/dist/kreivo.d.ts`
- `.papi/metadata/kreivo.scale`

### Tracks Disponibles

- **Grants Track** - Small community grants
- **Treasury Track** - Medium to large spending
- **Operations Track** - Technical operations

Cada track tiene diferentes parámetros de curvas de decisión (approval y support thresholds).

## Estado Actual

✅ Formulario UI completado con validación
✅ Integración con VirtoConnect SDK
✅ Firma de transacciones implementada
✅ Manejo de errores y notificaciones
✅ Feedback visual (spinner, notificaciones)
⚠️ Implementación temporal con `Balances.transfer_keep_alive` como placeholder

## TODO

- [ ] Verificar nombres exactos de pallets en descriptor:
  - Treasury.spend o método equivalente
  - Preimage.note_preimage
  - CommunityReferenda.submit
  - CommunityReferenda.set_metadata
  - CommunityReferenda.place_decision_deposit
- [ ] Reemplazar placeholder con llamadas reales de treasury
- [ ] Implementar lógica de preimage para propuestas grandes (>128 bytes)
- [ ] Agregar metadata con título y descripción
- [ ] Place decision deposit después de submit
- [ ] Capturar referendum ID desde eventos de la transacción
- [ ] Redirigir a propuesta creada después de éxito

## Notas de Implementación

El código actual usa `Balances.transfer_keep_alive` como placeholder porque los nombres exactos de los métodos en los pallets Treasury, Preimage y CommunityReferenda necesitan ser verificados en el descriptor de Kreivo.

Para completar la implementación, revisar:

- `.papi/descriptors/dist/kreivo.d.ts` - Nombres de pallets y métodos
- Ejemplos en `/home/brayan/Documents/work/virto/xcm-programs/src/initiatives/`
