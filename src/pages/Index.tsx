import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { recentEvents$ } from "./events.state"
import { useStateObservable, withDefault } from "@react-rxjs/core"
import { CommandSearch } from "@/components/CommandSearch"
import { Command } from "@/data/commands.en"
import { useCommunities } from "@/hooks/useCommunities"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom, map, switchMap } from "rxjs"
import { WalletWidget } from "@/components/WalletWidget"
import "./Index.css"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDashboardLayout } from "@/hooks/useDashboardLayout"
import { FavoriteCommunityWidget } from "@/components/widgets/FavoriteCommunityWidget"
import { client$ } from "@/state/chains/chain.state"

interface SortableWidgetWrapperProps {
  id: string
  renderWidget: (dragHandleProps: any) => React.ReactNode
}

const SortableWidgetWrapper: React.FC<SortableWidgetWrapperProps> = ({
  id,
  renderWidget,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0 : 1, // Hide original when dragging (DragOverlay handles it)
  }
  return (
    <div ref={setNodeRef} style={style} className="dashboard-widget-wrapper">
      {renderWidget({ ...attributes, ...listeners })}
    </div>
  )
}

const finalizedNum$ = client$.pipeState(
  switchMap((client) => client.finalizedBlock$),
  map((v: any) => v.number),
  withDefault(0),
)
const finalized$ = finalizedNum$.pipeState(
  map((v) => v.toLocaleString()),
  withDefault("0"),
)
const best$ = client$.pipeState(
  switchMap((client) => client.bestBlocks$),
  map(([v]) => v.number.toLocaleString()),
  withDefault("0"),
)

const Index: React.FC = () => {
  const { layout, isLoaded, updateLayout, toggleFavorite } =
    useDashboardLayout()
  const [currentPage, setCurrentPage] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const itemsPerPage = 6
  const totalPages = Math.ceil(layout.length / itemsPerPage)

  const isDragging = activeId !== null
  // Edge detection for auto-pagination during drag
  useEffect(() => {
    if (!isDragging) return
    let timeoutId: any
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX } = e
      const edgeThreshold = window.innerWidth * 0.1 // 10%
      if (timeoutId) return // wait for debounce

      if (
        clientX > window.innerWidth - edgeThreshold &&
        currentPage < totalPages - 1
      ) {
        timeoutId = setTimeout(() => {
          setCurrentPage((prev) => prev + 1)
          timeoutId = null
        }, 1000)
      } else if (clientX < edgeThreshold && currentPage > 0) {
        timeoutId = setTimeout(() => {
          setCurrentPage((prev) => prev - 1)
          timeoutId = null
        }, 1000)
      }
    }
    window.addEventListener("mousemove", handleMouseMove, { capture: true })
    return () => {
      window.removeEventListener("mousemove", handleMouseMove, {
        capture: true,
      })
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isDragging, currentPage, totalPages])

  // Ensure we don't stay on an empty page if items are removed
  useEffect(() => {
    if (layout.length > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1))
    }
  }, [layout.length, totalPages, currentPage])

  const visibleLayout = layout.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (over && active.id !== over.id) {
      const oldIndex = layout.indexOf(active.id as string)
      const newIndex = layout.indexOf(over.id as string)
      updateLayout(arrayMove(layout, oldIndex, newIndex))
    }
  }

  const navigate = useNavigate()
  const [blockTimeElapsed, setBlockTimeElapsed] = useState<number>(0)
  const [blocksCount, setBlocksCount] = useState<number>(() => {
    const saved = sessionStorage.getItem("explorer-blocks-count")
    return saved ? parseInt(saved, 10) : 30
  })
  const [latestBlockKey, setLatestBlockKey] = useState<number>(0)
  const [commandTrigger, setCommandTrigger] = useState<{
    commandId: string
    initialData?: any
  } | null>(null)
  const [showCommunityMenu, setShowCommunityMenu] = useState(false)
  const [showExplorerMenu, setShowExplorerMenu] = useState(false)
  const communityMenuRef = React.useRef<HTMLDivElement>(null)
  const explorerMenuRef = React.useRef<HTMLDivElement>(null)
  const events = useStateObservable(recentEvents$)
  const finalized = useStateObservable(finalized$)
  const finalizedNum = useStateObservable(finalizedNum$)
  const best = useStateObservable(best$)
  const { communities, isLoading: communitiesLoading } = useCommunities(3)

  const blocksWithEvents = React.useMemo(() => {
    const blockNumbers = new Set<number>()
    if (Array.isArray(events)) {
      events.forEach((event: any) => {
        if (event && typeof event.number === "number") {
          blockNumbers.add(event.number)
        }
      })
    }
    return blockNumbers
  }, [events])

  // Initialize blocksCount when best block is available
  useEffect(() => {
    if (best && blocksCount === 0) {
      const bestNum = Number(best.replace(/,/g, ""))
      if (!isNaN(bestNum) && bestNum > 0) {
        setBlocksCount(30)
        sessionStorage.setItem("explorer-blocks-count", "30")
      }
    }
  }, [best, blocksCount])

  useEffect(() => {
    const subscription = chainClient$.subscribe({
      next: ({ chainHead }) => {
        if (!chainHead) return

        const fetchBlockNumber = async (
          hash: string,
        ): Promise<number | null> => {
          try {
            const header = await firstValueFrom(chainHead.header$(hash)).catch(
              () => null,
            )
            if (!header) return null
            const headerObj = header as any
            return "number" in headerObj
              ? Number(headerObj.number)
              : "blockNumber" in headerObj
                ? Number(headerObj.blockNumber)
                : null
          } catch (error) {
            console.error("Error fetching block number:", error)
            return null
          }
        }

        const followSub = chainHead.follow$.subscribe({
          next: async (event) => {
            if (event.type === "newBlock") {
              const blockHash = (event as any).blockHash || (event as any).hash
              if (blockHash && typeof blockHash === "string") {
                const blockNumber = await fetchBlockNumber(blockHash)
                if (blockNumber !== null) {
                  setBlocksCount((prev) => {
                    const newCount = Math.min(prev + 1, 30)
                    sessionStorage.setItem(
                      "explorer-blocks-count",
                      newCount.toString(),
                    )
                    setLatestBlockKey(blockNumber)
                    return newCount
                  })
                }
              }
            }

            if (event.type === "initialized") {
              await firstValueFrom(chainHead.finalized$).catch(() => null)
            }
          },
        })

        return () => {
          followSub.unsubscribe()
        }
      },
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setBlockTimeElapsed(0)
    const timerInterval = setInterval(() => {
      setBlockTimeElapsed((prev) => prev + 0.1)
    }, 100)
    return () => clearInterval(timerInterval)
  }, [best])

  useEffect(() => {
    if (latestBlockKey > 0) {
      const timer = setTimeout(() => {
        const elements = document.querySelectorAll(
          ".explorer-block-square.latest-block",
        )
        elements.forEach((el) => {
          el.classList.remove("latest-block")
          void (el as HTMLElement).offsetWidth
          el.classList.add("latest-block")
        })
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [latestBlockKey])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        communityMenuRef.current &&
        !communityMenuRef.current.contains(event.target as Node)
      ) {
        setShowCommunityMenu(false)
      }
      if (
        explorerMenuRef.current &&
        !explorerMenuRef.current.contains(event.target as Node)
      ) {
        setShowExplorerMenu(false)
      }
    }

    if (showCommunityMenu || showExplorerMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showCommunityMenu, showExplorerMenu])

  const handleCommunityActionClick = (
    action: "create" | "add-member" | "remove-member" | "buy-membership",
    e: React.MouseEvent,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setShowCommunityMenu(false)
    const commandMap = {
      create: "create-community",
      "add-member": "add-member-community",
      "remove-member": "remove-member-community",
      "buy-membership": "buy-membership",
    }
    setCommandTrigger({
      commandId: commandMap[action],
      initialData: {},
    })
  }

  const handleExplorerActionClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowExplorerMenu(false)
    setCommandTrigger({
      commandId: "block-explorer",
      initialData: {},
    })
  }

  const renderWidgetById = React.useCallback(
    (id: string, dragHandleProps: any) => {
      let title = ""
      let content = null
      let menu = null
      let linkTo = null
      let headerIcon = null

      if (id.startsWith("fav_community_")) {
        const communityId = id.replace("fav_community_", "")
        const community = communities.find(
          (c) => c.id.toString() === communityId,
        )
        title = community?.name || `Community #${communityId}`
        linkTo = `/bounties/${communityId}`
        content = (
          <FavoriteCommunityWidget
            communityId={communityId}
            onUnfavorite={toggleFavorite}
            noWrapper={true}
          />
        )
        headerIcon = (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(communityId)
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#fbbf24",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Remove from favorites"
            className="fav-star-button"
          >
            <span className="material-icons-round" style={{ fontSize: 20 }}>
              star
            </span>
          </button>
        )
      } else if (id === "explorer") {
        title = "Explorer"
        menu = (
          <div className="communities-menu-container" ref={explorerMenuRef}>
            <button
              className="communities-menu-button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowExplorerMenu(!showExplorerMenu)
              }}
              title="Explorer actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            {showExplorerMenu && (
              <div className="communities-dropdown-menu">
                <button
                  className="communities-menu-item"
                  onClick={handleExplorerActionClick}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  View Block
                </button>
              </div>
            )}
          </div>
        )
        content = (
          <div className="explorer-main">
            <div className="explorer-left">
              <div className="explorer-block-number">
                {best ? `# ${best}` : "Loading..."}
              </div>
              <div className="explorer-finalized">
                Finalized: {finalized ? `# ${finalized}` : "Loading..."}
              </div>
              <div className="explorer-blocks-grid">
                {Array.from({ length: 30 }).map((_, i) => {
                  const gridIndex = (4 - Math.floor(i / 6)) * 6 + (i % 6)
                  const hasBlock = gridIndex < blocksCount
                  const blockNumber = best
                    ? Number(best.replace(/,/g, "")) -
                      (blocksCount - 1 - gridIndex)
                    : null
                  const isFinalized =
                    blockNumber !== null &&
                    finalizedNum !== null &&
                    blockNumber <= finalizedNum
                  const isIncluded = hasBlock && !isFinalized
                  const hasEvents =
                    blockNumber !== null && blocksWithEvents.has(blockNumber)
                  const isLatest = blockNumber === latestBlockKey && hasBlock

                  return (
                    <Link
                      key={i}
                      to={
                        hasBlock && blockNumber !== null
                          ? `/explorer/${blockNumber}`
                          : "#"
                      }
                      className={`explorer-block-square ${hasBlock ? "visible" : "hidden"} ${isIncluded ? "included" : ""} ${isFinalized ? "finalized" : ""} ${hasEvents ? "with-events" : ""} ${isLatest ? "latest-block" : ""}`}
                      title={
                        hasBlock && blockNumber !== null
                          ? `Block #${blockNumber}`
                          : undefined
                      }
                      style={{ textDecoration: "none", display: "block" }}
                      onClick={(e) => {
                        if (!hasBlock || blockNumber === null)
                          e.preventDefault()
                      }}
                    ></Link>
                  )
                })}
              </div>
            </div>
            <div className="explorer-right">
              <div className="explorer-timer">
                <svg
                  key={best || "initial"}
                  className="explorer-timer-svg"
                  viewBox="0 -3 50 50"
                >
                  <path d="M2.5 25.98Q0 21.65 2.5 17.32L10 4.33Q12.5 0 17.5 0L32.5 0Q37.5 0 40 4.33L47.5 17.32Q50 21.65 47.5 25.98L40 38.971Q37.5 43.3 32.5 43.3L17.5 43.3Q12.5 43.3 10 38.971Z"></path>
                </svg>
                <div className="explorer-timer-text">
                  {blockTimeElapsed.toFixed(1)}s
                </div>
              </div>
              <div className="explorer-events">
                {events.length > 0 ? (
                  events.slice(0, 4).map((evt: any, index: number) => (
                    <div key={index} className="explorer-event">
                      {evt.event?.type && evt.event?.value?.type
                        ? `${evt.event.type}.${evt.event.value.type}`
                        : "Unknown"}
                    </div>
                  ))
                ) : (
                  <div className="explorer-event">No events</div>
                )}
              </div>
            </div>
          </div>
        )
      } else if (id === "communities_card") {
        title = "Communities"
        linkTo = "/communities"
        menu = (
          <div
            className="communities-menu-container"
            ref={communityMenuRef}
            onClick={(e) => e.preventDefault()}
          >
            <button
              className="communities-menu-button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowCommunityMenu(!showCommunityMenu)
              }}
              title="Community actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            {showCommunityMenu && (
              <div className="communities-dropdown-menu">
                <button
                  className="communities-menu-item"
                  onClick={(e) => handleCommunityActionClick("create", e)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Create Community
                </button>
                <button
                  className="communities-menu-item"
                  onClick={(e) => handleCommunityActionClick("add-member", e)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  Add Member
                </button>
              </div>
            )}
          </div>
        )
        content = (
          <div className="community-list">
            {communitiesLoading ? (
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "0.9rem",
                }}
              >
                Loading communities...
              </div>
            ) : communities.length === 0 ? (
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "0.9rem",
                }}
              >
                No communities found
              </div>
            ) : (
              communities.map((community, index) => {
                const gradient = [
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                ][index % 3]
                const indicator = ["#10b981", "#3b82f6", "#fbbf24"][index % 3]
                const membersText = community.members
                  ? community.members >= 1000
                    ? `${(community.members / 1000).toFixed(1)}k members`
                    : `${community.members} members`
                  : "0 members"
                return (
                  <Link
                    key={community.id}
                    to={`/bounties/${community.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="community-item">
                      <div
                        className="community-logo"
                        style={{ background: gradient }}
                      ></div>
                      <div className="community-info">
                        <div className="community-name">{community.name}</div>
                        <div className="community-members">{membersText}</div>
                      </div>
                      <div
                        className="community-indicator"
                        style={{ backgroundColor: indicator }}
                      ></div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )
      } else if (id === "wallet") {
        title = "Wallet"
        content = (
          <WalletWidget
            onTransferClick={(asset: "KSM" | "DUSD") =>
              setCommandTrigger({
                commandId: "send-transaction",
                initialData: { asset },
              })
            }
            noWrapper={true}
          />
        )
      } else if (id === "marketplace") {
        title = "Marketplace"
        linkTo = "/marketplace"
        headerIcon = (
          <div className="dashboard-box-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </div>
        )
        content = (
          <>
            <div className="coming-soon-banner">Coming Soon</div>
            <div className="marketplace-grid">
              <div className="marketplace-item">
                <div
                  className="marketplace-item-image"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                ></div>
                <div className="marketplace-item-info">
                  <div className="marketplace-item-title">Cosmic Queen</div>
                  <div className="marketplace-item-price">2.5 ETH</div>
                </div>
              </div>
              <div className="marketplace-item">
                <div
                  className="marketplace-item-image"
                  style={{
                    background:
                      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  }}
                ></div>
                <div className="marketplace-item-info">
                  <div className="marketplace-item-title">Pixel Worlds</div>
                  <div className="marketplace-item-price">1.2 ETH</div>
                </div>
              </div>
              <div className="marketplace-item">
                <div
                  className="marketplace-item-image"
                  style={{
                    background:
                      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  }}
                ></div>
                <div className="marketplace-item-info">
                  <div className="marketplace-item-title">Molten Horde</div>
                  <div className="marketplace-item-price">0.9 ETH</div>
                </div>
              </div>
              <div className="marketplace-item">
                <div
                  className="marketplace-item-image"
                  style={{
                    background:
                      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                  }}
                ></div>
                <div className="marketplace-item-info">
                  <div className="marketplace-item-title">Cyber Sky</div>
                  <div className="marketplace-item-price">1.1 ETH</div>
                </div>
              </div>
            </div>
          </>
        )
      } else if (id === "bounties") {
        title = "Bounties"
        headerIcon = (
          <div className="dashboard-box-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        )
        content = (
          <div
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "0.9rem",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            Select a community to view its proposals
          </div>
        )
      } else if (id === "payments") {
        title = "Recent Payments"
        linkTo = "/payments"
        headerIcon = (
          <div className="dashboard-box-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </div>
        )
        content = (
          <>
            <div className="coming-soon-banner">Coming Soon</div>
            <div className="payment-list">
              <div className="payment-item">
                <div className="payment-info">
                  <div className="payment-name">NFT Purchase</div>
                  <div className="payment-time">2 hours ago</div>
                </div>
                <div className="payment-amount" style={{ color: "#E53E3E" }}>
                  -2.5 ETH
                </div>
              </div>
              <div className="payment-item">
                <div className="payment-info">
                  <div className="payment-name">Staking Reward</div>
                  <div className="payment-time">1 day ago</div>
                </div>
                <div className="payment-amount" style={{ color: "#48BB78" }}>
                  +0.15 ETH
                </div>
              </div>
              <div className="payment-item">
                <div className="payment-info">
                  <div className="payment-name">DeFi Swap</div>
                  <div className="payment-time">3 days ago</div>
                </div>
                <div className="payment-amount" style={{ color: "#E53E3E" }}>
                  -500 USDC
                </div>
              </div>
            </div>
          </>
        )
      }

      const boxContent = (
        <div className="dashboard-box">
          <div className="dashboard-box-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                {...dragHandleProps}
                className="drag-handle-icon"
                title="Drag to reorder"
              >
                <span
                  className="material-icons-round"
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    cursor: "grab",
                    fontSize: "20px",
                  }}
                >
                  drag_indicator
                </span>
              </div>
              <h3 className="dashboard-box-title">{title}</h3>
            </div>
            {menu || headerIcon}
          </div>
          <div className="dashboard-box-content">{content}</div>
        </div>
      )

      if (linkTo) {
        return (
          <Link
            to={linkTo}
            style={{ textDecoration: "none", color: "inherit" }}
            className="dashboard-box-link"
          >
            {boxContent}
          </Link>
        )
      }

      return boxContent
    },
    [
      toggleFavorite,
      explorerMenuRef,
      showExplorerMenu,
      setShowExplorerMenu,
      handleExplorerActionClick,
      best,
      finalized,
      finalizedNum,
      blocksCount,
      blocksWithEvents,
      latestBlockKey,
      blockTimeElapsed,
      events,
      communityMenuRef,
      showCommunityMenu,
      handleCommunityActionClick,
      communitiesLoading,
      communities,
      setCommandTrigger,
    ],
  )

  if (!isLoaded) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-grid">
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            Loading dashboard layout...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleLayout} strategy={rectSortingStrategy}>
          <div className="dashboard-grid">
            {Array.from({ length: 6 }).map((_, i) => {
              const id = visibleLayout[i]
              if (id) {
                return (
                  <SortableWidgetWrapper
                    key={id}
                    id={id}
                    renderWidget={(dragHandleProps) =>
                      renderWidgetById(id, dragHandleProps)
                    }
                  />
                )
              }
              // Render empty slot to maintain grid structure
              return (
                <div key={`empty-${i}`} className="dashboard-grid-empty-slot" />
              )
            })}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: { opacity: "0.5" },
              },
            }),
          }}
        >
          {activeId ? (
            <div className="dashboard-widget-wrapper dragging">
              {renderWidgetById(activeId, {})}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {totalPages > 1 && (
        <div className="dashboard-pagination">
          <button
            className="dashboard-page-btn"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
          >
            <span className="material-icons-round">chevron_left</span>
          </button>
          <div className="dashboard-page-dots">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`dashboard-page-dot ${i === currentPage ? "active" : ""}`}
                onClick={() => setCurrentPage(i)}
                title={`Page ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="dashboard-page-btn"
            disabled={currentPage === totalPages - 1}
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
            }
          >
            <span className="material-icons-round">chevron_right</span>
          </button>
        </div>
      )}

      {/* Prompt Input Section */}
      <CommandSearch
        onCommandSelect={(command: Command) => {
          console.log("Command selected:", command)
        }}
        onWidgetComplete={(command: Command, data: any) => {
          if (command.id === "block-explorer" && data?.blockHash) {
            const blockNumber = data.blockHash.match(/^\d+$/)
              ? data.blockHash
              : null
            if (blockNumber) {
              navigate(`/explorer/${blockNumber}`)
            } else {
              navigate(`/explorer/${data.blockHash}`)
            }
          }
          if (command.id === "send-transaction") {
            console.log("Transaction completed:", data)
            if (data.success) {
              console.log(`✅ Transaction sent successfully!`)
              console.log(`   Asset: ${data.asset}`)
              console.log(`   Amount: ${data.amount}`)
              console.log(`   To: ${data.address}`)
              console.log(`   TxHash: ${data.txHash}`)
            }
          }
        }}
        externalTrigger={commandTrigger}
        onExternalTriggerHandled={() => setCommandTrigger(null)}
      />
    </div>
  )
}

export default Index
