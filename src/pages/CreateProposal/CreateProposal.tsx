import React, { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useVirto } from "@/contexts/VirtoContext"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom, take } from "rxjs"
import { kreivo } from "@polkadot-api/descriptors"
import { Binary } from "@polkadot-api/substrate-bindings"
import { blake2AsHex } from "@polkadot/util-crypto"
import { useNotification } from "@/hooks/useNotification"
import { useSpinner } from "@/hooks/useSpinner"
import { NostrService } from "@/services/nostr"
import "./CreateProposal.css"

const u8aToHex = (bytes: Uint8Array): string => {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface TreasuryProposal {
  title: string
  description: string
  beneficiary: string
  amount: string
  track: "grants" | "treasury" | "operations"
  communityId: number
}

const CreateProposal: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { sdk, isAuthenticated, userAddress } = useVirto()
  const { showSuccessNotification, showErrorNotification } = useNotification()
  const { showSpinner, hideSpinner } = useSpinner()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const communityIdParam = searchParams.get('communityId')
  const [communityIdFromUrl] = useState(communityIdParam ? parseInt(communityIdParam, 10) : null)

  const [formData, setFormData] = useState<TreasuryProposal>({
    title: "proposal title test",
    description: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    beneficiary: "5E4S9C7PNW1cdYEY9p2U3bATksAQ69njeKS2JTBpTYPxKWds",
    amount: "10",
    track: "grants",
    communityId: communityIdFromUrl || 1,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof TreasuryProposal, string>>>({})

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof TreasuryProposal]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TreasuryProposal, string>> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    } else if (formData.title.length < 10) {
      newErrors.title = "Title must be at least 10 characters"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    } else if (formData.description.length < 50) {
      newErrors.description = "Description must be at least 50 characters"
    }

    if (!formData.beneficiary.trim()) {
      newErrors.beneficiary = "Beneficiary address is required"
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!isAuthenticated) {
      showErrorNotification(
        "Authentication Error",
        "Please connect your wallet first"
      )
      return
    }

    if (!sdk) {
      showErrorNotification("SDK Error", "VirtoConnect SDK not available")
      return
    }

    if (!userAddress) {
      showErrorNotification(
        "Address Error",
        "User address not available. Please reconnect your wallet."
      )
      return
    }

    setIsSubmitting(true)
    showSpinner("Creating proposal...")

    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) {
        throw new Error("Chain client not available")
      }

      const typedApi = client.getTypedApi(kreivo)

      if (typedApi.tx.Utility) {
      } else {
        console.warn("Utility pallet not found in typedApi.tx")
      }

      let callsOnBatch: any[] = []

      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(formData.amount) * 1_000_000_000_000))
      const treasurySpendCall = typedApi.tx.Balances.transfer_keep_alive({
        dest: {
          type: "Id" as const,
          value: formData.beneficiary,
        },
        value: amountInSmallestUnit,
      })

      const salt = crypto.randomUUID();
      const remarkCall = typedApi.tx.System.remark_with_event({
        remark: Binary.fromText(`Proposal Salt: ${salt}`),
      });
      const batchCall = typedApi.tx.Utility.batch_all({
        calls: [treasurySpendCall.decodedCall, remarkCall.decodedCall],
      });

      const proposalCallData = await batchCall.getEncodedData()
      const inlineProposal = proposalCallData.asHex()

      const callLength = (inlineProposal.length - 2) / 2
      let proposal: any

      if (callLength > 128) {

        const preimageCall = typedApi.tx.Preimage.note_preimage({
          bytes: Binary.fromHex(inlineProposal),
        }).decodedCall
        callsOnBatch.push(preimageCall)

        const hash = blake2AsHex(inlineProposal)
        proposal = {
          type: "Lookup" as const,
          value: {
            hash,
            len: callLength,
          },
        }
      } else {

        proposal = {
          type: "Inline" as const,
          value: Binary.fromHex(inlineProposal),
        }
      }


      // Step 4: Submit referendum
      // const initiativeSubmit = typedApi.tx.CommunityReferenda.submit({
      //   proposal_origin: {
      //     type: "Communities" as const,
      //     value: {
      //       community_id: formData.communityId,
      //     },
      //   },
      //   proposal,
      //   enactment_moment: {
      //     type: "After" as const,
      //     value: 0,
      //   },
      // })

      // // console.log("Submit call created", initiativeSubmit)

      // const x = await initiativeSubmit.getEncodedData();
      // console.log("Submit call created", x)
      // console.log("Submit call created", x.asHex())

      // Step 5: Create final transaction to get the hash
      const communityId = typeof formData.communityId === 'string'
        ? parseInt(formData.communityId, 10)
        : formData.communityId;

      const initiativeSubmitCorrect = typedApi.tx.CommunityReferenda.submit({
        proposal_origin: {
          type: "Communities" as const,
          value: {
            community_id: communityId,
          },
        },
        proposal,
        enactment_moment: {
          type: "After" as const,
          value: 0,
        },
      })

      // console.log("Proposal submit call created:", initiativeSubmitCorrect)

      const finalCallData = await initiativeSubmitCorrect.getEncodedData();
      // console.log("Final call encoded hex:", finalCallData.asHex())


      const inclusionPromise = new Promise<{ blockHash: string, txHash: string }>((resolve, reject) => {
        sdk.onTransactionUpdate((event: any) => {
          // console.log("SDK Transaction Event:", event.type, event);

          if (event.type === 'included') {
            const tx = event.transaction;
            const blockHash = tx.blockHash instanceof Uint8Array ? u8aToHex(tx.blockHash) : tx.blockHash;
            const txHash = tx.hash instanceof Uint8Array ? u8aToHex(tx.hash) : tx.hash;

            // console.log(`Event: Transaction included in block: ${blockHash}`);
            resolve({ blockHash, txHash });
          }

          if (event.type === 'failed') {
            reject(event.transaction.error || "Transaction failed event");
          }
        });
      });

      const txResultPromise = sdk.custom.submitCallAsync(
        sdk.auth.sessionSigner,
        { callDataHex: finalCallData.asHex() },
      )

      const [inclusionResult] = await Promise.all([
        inclusionPromise,
        txResultPromise
      ]);

      // console.log("Inclusion verified, block hash:", inclusionResult?.blockHash);

      if (inclusionResult?.blockHash) {
        try {
          const { blockHash } = inclusionResult;
          // console.log(`Processing block: ${blockHash}`);

          const events = await typedApi.query.System.Events.getValue({ at: blockHash });
          let myProposalId = null;

          for (const event of events) {
            const { event: { type, value } } = event;
            if (type === 'CommunityReferenda' && value.type === 'Submitted') {
              // console.log("Found Submitted event:", value);
              myProposalId = value.value.index;
              break;
            }
          }

          if (myProposalId === null || myProposalId === undefined) {
            console.warn("Event not found in block. Using fallback strategy...");
            await new Promise(r => setTimeout(r, 1000));
            const referendaEntries = await typedApi.query.CommunityReferenda.ReferendumInfoFor.getEntries()
            let maxId = -1;
            for (const { keyArgs, value } of referendaEntries) {
              const [referendumId] = keyArgs
              const info = value
              if (info.type === 'Ongoing') {
                const currentId = Number(referendumId);
                if (currentId > maxId) maxId = currentId;
              }
            }
            if (maxId !== -1) myProposalId = maxId;
          }

          if (myProposalId !== null && myProposalId !== undefined) {
            // console.log(`Found proposal ID: ${myProposalId}. Publishing to Nostr...`)
            await NostrService.publishProposalMetadata(
              formData.title,
              formData.description,
              myProposalId.toString(),
              {
                track: formData.track,
                beneficiary: formData.beneficiary,
                amount: formData.amount,
                communityId: formData.communityId,
                proposer: userAddress,
              }
            )
            // console.log("Nostr event published, ID:", nostrEventId)
          } else {
            console.warn("Could not find any new proposal ID. Metadata not published.")
          }

        } catch (e) {
          console.error("Error linking proposal ID (will use fallback if implemented or just notify):", e);
        }
      }

      showSuccessNotification(
        "Proposal Submitted!",
        "Proposal created successfully."
      )
      setTimeout(() => {
        navigate(formData.communityId ? `/bounties/${formData.communityId}` : "/bounties")
      }, 1500)
    } catch (error: any) {
      showErrorNotification(
        "Transaction Error",
        error?.message || "Failed to create proposal. Please try again."
      )
    } finally {
      setIsSubmitting(false)
      hideSpinner()
    }
  }

  return (
    <div className="create-proposal">
      <div className="create-proposal__header">
        <button
          className="create-proposal__back-button"
          onClick={() => navigate(-1)}
        >
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className="create-proposal__title">Create Treasury Proposal</h1>
      </div>

      <form className="create-proposal__form" onSubmit={handleSubmit}>
        <div className="create-proposal__section">
          <h2 className="create-proposal__section-title">Basic Information</h2>

          <div className="create-proposal__field">
            <label htmlFor="title" className="create-proposal__label">
              Proposal Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className={`create-proposal__input ${errors.title ? "create-proposal__input--error" : ""}`}
              placeholder="e.g., Q1 2024 Developer Grants Program"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            {errors.title && (
              <span className="create-proposal__error">{errors.title}</span>
            )}
          </div>

          <div className="create-proposal__field">
            <label htmlFor="track" className="create-proposal__label">
              Track *
            </label>
            <select
              id="track"
              name="track"
              className="create-proposal__select"
              value={formData.track}
              onChange={handleInputChange}
              disabled={isSubmitting}
            >
              <option value="grants">Grants Track - Small community grants</option>
              <option value="treasury">Treasury Track - Medium to large spending</option>
              <option value="operations">Operations Track - Technical operations</option>
            </select>
          </div>

          <div className="create-proposal__field">
            <label htmlFor="description" className="create-proposal__label">
              Description (Markdown Supported) *
            </label>
            <textarea
              id="description"
              name="description"
              className={`create-proposal__textarea ${errors.description ? "create-proposal__input--error" : ""}`}
              placeholder="Provide a detailed description of your proposal using markdown formatting...

# Example
## Subheading
- List item 1
- List item 2

**Bold text** and *italic text*

[Link text](https://example.com)"
              rows={8}
              value={formData.description}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            {errors.description && (
              <span className="create-proposal__error">{errors.description}</span>
            )}
            <span className="create-proposal__hint">
              {formData.description.length} / 500 characters minimum. Markdown formatting supported.
            </span>
          </div>
        </div>

        <div className="create-proposal__section">
          <h2 className="create-proposal__section-title">Treasury Request</h2>

          <div className="create-proposal__field">
            <label htmlFor="beneficiary" className="create-proposal__label">
              Beneficiary Address *
            </label>
            <input
              type="text"
              id="beneficiary"
              name="beneficiary"
              className={`create-proposal__input ${errors.beneficiary ? "create-proposal__input--error" : ""}`}
              placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
              value={formData.beneficiary}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            {errors.beneficiary && (
              <span className="create-proposal__error">{errors.beneficiary}</span>
            )}
            <span className="create-proposal__hint">
              The Substrate address that will receive the funds
            </span>
          </div>

          <div className="create-proposal__field">
            <label htmlFor="amount" className="create-proposal__label">
              Amount (USDC) *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              className={`create-proposal__input ${errors.amount ? "create-proposal__input--error" : ""}`}
              placeholder="10000"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            {errors.amount && (
              <span className="create-proposal__error">{errors.amount}</span>
            )}
            <span className="create-proposal__hint">
              The amount of USDC to request from the treasury
            </span>
          </div>

          {/* Only show Community ID field if not pre-filled from URL */}
          {communityIdFromUrl === null && (
            <div className="create-proposal__field">
              <label htmlFor="communityId" className="create-proposal__label">
                Community ID *
              </label>
              <input
                type="number"
                id="communityId"
                name="communityId"
                className="create-proposal__input"
                placeholder="0"
                value={formData.communityId}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <span className="create-proposal__hint">
                The ID of the community submitting this proposal
              </span>
            </div>
          )}
        </div>

        <div className="create-proposal__actions">
          <button
            type="button"
            className="create-proposal__button create-proposal__button--secondary"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="create-proposal__button create-proposal__button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="create-proposal__spinner"></span>
                Creating Proposal...
              </>
            ) : (
              "Create Proposal"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateProposal

