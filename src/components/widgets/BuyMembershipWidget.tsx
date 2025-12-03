import React, { useState, useRef, useEffect, useCallback } from "react"
import { WidgetProps } from "./WidgetRegistry"
import { useAutoResizeInput } from "@/hooks/useAutoResizeInput"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom } from "rxjs"
import { take } from "rxjs/operators"
import { kreivo } from "@polkadot-api/descriptors"
import { useVirto } from "@/contexts/VirtoContext"
import { useCommunities } from "@/hooks/useCommunities"
import "./Widget.css"
import "./InlineSelect.css"

interface ParsedSegment {
  type: "text" | "community"
  value: string
  display: string
  start: number
  end: number
}

interface MembershipItem {
  itemId: number
  price: bigint
}

export const BuyMembershipWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
}) => {
  const { sdk, userAddress, isAuthenticated } = useVirto()
  const { communities: communitiesData, isLoading: communitiesLoading } =
    useCommunities()
  const [input, setInput] = useState("")
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showCommunityList, setShowCommunityList] = useState(false)
  const [selectedCommunityIndex, setSelectedCommunityIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const { inputRef, measureRef } = useAutoResizeInput(
    input,
    "for #community buy 10 memberships",
  )
  const containerRef = useRef<HTMLDivElement>(null)

  const communities = communitiesData.map((c) => ({
    id: c.id.toString(),
    name: c.name,
  }))

  useEffect(() => {
    inputRef.current?.focus()
  }, [inputRef])

  const parseInput = useCallback(
    (
      text: string,
      cursorPos: number,
    ): {
      segments: ParsedSegment[]
      activeHashtag: string | null
      hashtagStart: number | null
      quantity: number | null
    } => {
      const segments: ParsedSegment[] = []
      let activeHashtag: string | null = null
      let hashtagStart: number | null = null

      const hashtagRegex = /#(\w*)/g
      const quantityRegex = /(?:for\s+#\w+\s+)?buy\s+(\d+)\s+memberships?/i

      let lastIndex = 0
      const matches: Array<{
        type: "hashtag"
        start: number
        end: number
        value: string
      }> = []

      let match
      while ((match = hashtagRegex.exec(text)) !== null) {
        matches.push({
          type: "hashtag",
          start: match.index,
          end: match.index + match[0].length,
          value: match[1],
        })
      }

      matches.sort((a, b) => a.start - b.start)

      matches.forEach((m) => {
        if (m.start > lastIndex) {
          segments.push({
            type: "text",
            value: text.substring(lastIndex, m.start),
            display: text.substring(lastIndex, m.start),
            start: lastIndex,
            end: m.start,
          })
        }

        segments.push({
          type: "community",
          value: m.value,
          display: `#${m.value}`,
          start: m.start,
          end: m.end,
        })

        if (cursorPos >= m.start && cursorPos <= m.end) {
          activeHashtag = m.value
          hashtagStart = m.start
        }

        lastIndex = m.end
      })

      if (lastIndex < text.length) {
        segments.push({
          type: "text",
          value: text.substring(lastIndex),
          display: text.substring(lastIndex),
          start: lastIndex,
          end: text.length,
        })
      }

      let quantity: number | null = null
      const quantityMatch = quantityRegex.exec(text)
      if (quantityMatch) {
        quantity = parseInt(quantityMatch[1], 10)
      }

      return {
        segments,
        activeHashtag,
        hashtagStart,
        quantity,
      }
    },
    [],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const newCursorPos = e.target.selectionStart || 0
    const oldValue = input

    const parsed = parseInput(newValue, newCursorPos)
    const communitySegment = parsed.segments.find((s) => s.type === "community")

    if (communitySegment) {
      const afterCommunity = newValue.substring(communitySegment.end)
      if (!afterCommunity.trim().startsWith("buy")) {
        const communityName = communitySegment.value
        const hasValidCommunityName = communityName.length > 0
        const justTypedSpace =
          newValue.length > oldValue.length &&
          newValue[newCursorPos - 1] === " " &&
          communitySegment.end === newCursorPos - 1 &&
          hasValidCommunityName
        if (justTypedSpace && hasValidCommunityName) {
          const beforeCommunity = newValue.substring(0, communitySegment.end)
          const afterCommunityText = newValue.substring(
            communitySegment.end + 1,
          )
          const autoText = " buy 1 memberships"
          const finalValue = beforeCommunity + autoText + afterCommunityText
          setInput(finalValue)
          const newPos = communitySegment.end + 5 // Position after "buy "
          setCursorPosition(newPos)
          setShowCommunityList(false)
          setTimeout(() => {
            inputRef.current?.setSelectionRange(newPos, newPos)
            inputRef.current?.focus()
          }, 0)
          return
        }
      }
    }

    if (newValue === "#" && oldValue === "") {
      const finalValue = "for #"
      setInput(finalValue)
      setCursorPosition(5)
      setTimeout(() => {
        inputRef.current?.setSelectionRange(5, 5)
        inputRef.current?.focus()
      }, 0)
      return
    }

    setInput(newValue)
    setCursorPosition(newCursorPos)

    setShowCommunityList(parsed.activeHashtag !== null)
    setSelectedCommunityIndex(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommunityList) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedCommunityIndex((prev) =>
            prev < communities.length - 1 ? prev + 1 : prev,
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedCommunityIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case "Enter":
        case "Tab": {
          e.preventDefault()
          const parsedComm = parseInput(input, cursorPosition)
          if (
            parsedComm.hashtagStart !== null &&
            communities[selectedCommunityIndex]
          ) {
            handleCommunitySelect(communities[selectedCommunityIndex])
          }
          break
        }
        case "Escape":
          e.preventDefault()
          setShowCommunityList(false)
          break
      }
    } else {
      if (e.key === "Escape") {
        onCancel()
      } else if (e.key === "Enter" && input.trim() && !isSubmitting) {
        const parsed = parseInput(input, cursorPosition)
        const community = parsed.segments.find((s) => s.type === "community")

        if (community && parsed.quantity) {
          handleSubmitTransaction(community.value, parsed.quantity)
        }
      }
    }
  }

  const handleCommunitySelect = (community: (typeof communities)[0]) => {
    const parsed = parseInput(input, cursorPosition)
    if (parsed.hashtagStart !== null) {
      const before = input.substring(0, parsed.hashtagStart)
      const after = input.substring(
        parsed.hashtagStart + (parsed.activeHashtag?.length || 0) + 1,
      )

      const prefix = before.trim() === "" ? "for " : before
      const autoText = " buy 1 memberships"
      const newInput = `${prefix}#${community.name}${autoText}${after}`
      setInput(newInput)
      setShowCommunityList(false)
      setTimeout(() => {
        const newPos = prefix.length + community.name.length + 6 // Position after "buy "
        inputRef.current?.setSelectionRange(newPos, newPos)
        inputRef.current?.focus()
      }, 0)
    }
  }

  const findCheapestMemberships = useCallback(
    async (
      communityId: number,
      quantity: number,
    ): Promise<MembershipItem[]> => {
      setIsSearching(true)
      try {
        const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
        if (!client) throw new Error("Chain client not available")
        const typedApi = client.getTypedApi(kreivo)

        const availableMemberships: MembershipItem[] = []

        for (let itemId = 0; itemId < 100; itemId++) {
          try {
            const priceData =
              await typedApi.query.CommunityMemberships.ItemPriceOf.getValue(
                0,
                itemId,
              )
            console.log("priceData", priceData)
            console.log("itemId", itemId)
            console.log("communityId", communityId)
            if (priceData) {
              const [price, buyer] = priceData
              if (!buyer) {
                availableMemberships.push({ itemId, price })
                if (availableMemberships.length >= quantity * 2) {
                  break
                }
              }
            }
          } catch (e) {
            console.debug("Catching error searching for memberships:", e)
            continue
          }
        }

        if (availableMemberships.length === 0) {
          throw new Error(
            "No memberships available for sale in this community.",
          )
        }

        if (availableMemberships.length < quantity) {
          throw new Error(
            `Only ${availableMemberships.length} memberships available, but ${quantity} requested.`,
          )
        }

        availableMemberships.sort((a, b) => Number(a.price - b.price))
        return availableMemberships.slice(0, quantity)
      } catch (error) {
        console.error("Error searching for memberships:", error)
        throw error
      } finally {
        setIsSearching(false)
      }
    },
    [],
  )

  const handleSubmitTransaction = async (
    communityName: string,
    quantity: number,
  ) => {
    if (!isAuthenticated) {
      setSubmitError("Please connect your wallet first.")
      return
    }

    if (!sdk) {
      setSubmitError("VirtoConnect SDK not available.")
      return
    }

    if (!userAddress) {
      setSubmitError(
        "User address not available. Please reconnect your wallet.",
      )
      return
    }

    if (quantity <= 0) {
      setSubmitError("Quantity must be greater than 0.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      console.log(
        "Buying memberships for community:",
        communityName,
        "Quantity:",
        quantity,
      )

      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) {
        throw new Error("Chain client not available")
      }
      const typedApi = client.getTypedApi(kreivo)

      const community = communities.find(
        (c) => c.name.toLowerCase() === communityName.toLowerCase(),
      )
      if (!community) {
        throw new Error(`Community "${communityName}" not found`)
      }
      const communityIdNum = parseInt(community.id)

      const memberships = await findCheapestMemberships(
        communityIdNum,
        quantity,
      )

      console.log(`Found ${memberships.length} memberships to purchase`)
      if (memberships.length === 1) {
        const membership = memberships[0]
        const tx = typedApi.tx.CommunityMemberships.buy_item({
          collection: 0,
          item: membership.itemId,
          bid_price: membership.price,
        })

        const encodedCallHex = await tx.getEncodedData()
        const encodedCallHexString = encodedCallHex.asHex()

        console.log("Encoded Call Hex:", encodedCallHexString)
        console.log("Signing and submitting transaction...")

        const txResult = await sdk.custom.submitCallAsync(
          sdk.auth.sessionSigner,
          { callDataHex: encodedCallHexString },
        )

        console.log("Transaction result:", txResult)
        onComplete({
          communityId: communityIdNum,
          communityName,
          quantity: 1,
          itemIds: [membership.itemId],
          totalPrice: membership.price.toString(),
          txHash: txResult?.txHash || txResult?.hash || "submitted",
          success: true,
        })
      } else {
        const buyTxs = memberships.map((membership) =>
          typedApi.tx.CommunityMemberships.buy_item({
            collection: 0,
            item: membership.itemId,
            bid_price: membership.price,
          }),
        )

        const buyCallsData = await Promise.all(
          buyTxs.map((tx) => tx.decodedCall),
        )

        const batchTx = typedApi.tx.Utility.batch_all({
          calls: buyCallsData,
        })

        const encodedCallHex = await batchTx.getEncodedData()
        const encodedCallHexString = encodedCallHex.asHex()

        console.log("Encoded Call Hex:", encodedCallHexString)
        console.log("Signing and submitting batch transaction...")

        const txResult = await sdk.custom.submitCallAsync(
          sdk.auth.sessionSigner,
          { callDataHex: encodedCallHexString },
        )

        const totalPrice = memberships.reduce((sum, m) => sum + m.price, 0n)

        console.log("Transaction result:", txResult)
        onComplete({
          communityId: communityIdNum,
          communityName,
          quantity: memberships.length,
          itemIds: memberships.map((m) => m.itemId),
          totalPrice: totalPrice.toString(),
          txHash: txResult?.txHash || txResult?.hash || "submitted",
          success: true,
        })
      }
    } catch (error: any) {
      console.error("Transaction error:", error)
      setSubmitError(error.message || "Transaction failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const parsed = parseInput(input, cursorPosition)
  const communitySegment = parsed.segments.find((s) => s.type === "community")

  const filteredCommunities =
    parsed.activeHashtag !== null
      ? parsed.activeHashtag === ""
        ? communities
        : communities.filter((c) =>
            c.name.toLowerCase().includes(parsed.activeHashtag!.toLowerCase()),
          )
      : communities

  if (communitiesLoading) {
    return (
      <div className="widget-form" ref={containerRef}>
        <div className="widget-input-wrapper">
          <span className="widget-prefix">Buy Membership:</span>
          <div
            style={{
              padding: "12px",
              color: "rgba(255, 255, 255, 0.6)",
              textAlign: "center",
            }}
          >
            Loading communities...
          </div>
        </div>
      </div>
    )
  }

  const isValidSubmit =
    communitySegment && parsed.quantity && parsed.quantity > 0

  return (
    <div className="widget-form" ref={containerRef}>
      <span
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre",
          fontSize: "1rem",
          fontFamily: 'var(--font-primary, "Outfit", sans-serif)',
          padding: "0",
          margin: "0",
          height: "auto",
          width: "auto",
        }}
        aria-hidden="true"
      />
      <div className="widget-input-wrapper">
        <span className="widget-prefix">Buy Memberships:</span>
        <div className="inline-select-container">
          <input
            ref={inputRef}
            type="text"
            className="widget-input"
            placeholder="for #community buy 10 memberships"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={(e) => {
              setCursorPosition(e.currentTarget.selectionStart || 0)
            }}
            autoComplete="off"
            disabled={isSubmitting || isSearching}
          />
          {showCommunityList && filteredCommunities.length > 0 && (
            <div className="inline-select-dropdown">
              {filteredCommunities.map((community, index) => (
                <div
                  key={community.id}
                  className={`inline-select-item ${
                    index === selectedCommunityIndex
                      ? "inline-select-item-selected"
                      : ""
                  }`}
                  onClick={() => handleCommunitySelect(community)}
                  onMouseEnter={() => setSelectedCommunityIndex(index)}
                >
                  <span className="inline-select-prefix">#</span>
                  {community.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="widget-submit"
          onClick={() => {
            if (communitySegment && parsed.quantity) {
              handleSubmitTransaction(communitySegment.value, parsed.quantity)
            }
          }}
          disabled={!isValidSubmit || isSubmitting || isSearching}
        >
          {isSubmitting || isSearching ? (
            <svg
              className="spinner"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </button>
        <button
          type="button"
          className="widget-cancel"
          onClick={onCancel}
          disabled={isSubmitting || isSearching}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      {isSearching && (
        <div
          style={{
            marginTop: "8px",
            color: "#60a5fa",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          Searching for available memberships...
        </div>
      )}
      {submitError && (
        <div
          className="widget-error"
          style={{
            marginTop: "8px",
            color: "#ef4444",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          {submitError}
        </div>
      )}
    </div>
  )
}
