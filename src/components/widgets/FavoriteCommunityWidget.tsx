import React from "react"
import { Link } from "react-router-dom"
import { useCommunities } from "@/hooks/useCommunities"

interface FavoriteCommunityWidgetProps {
  communityId: string
  onUnfavorite: (communityId: string) => void
  dragHandleProps?: any
  noWrapper?: boolean
}

export const FavoriteCommunityWidget: React.FC<
  FavoriteCommunityWidgetProps
> = ({ communityId, onUnfavorite, dragHandleProps, noWrapper = false }) => {
  const { communities, isLoading } = useCommunities()

  // Find the community using the full list
  const community = communities.find((c) => c.id.toString() === communityId)

  // Deterministic styling based on ID
  const numId = parseInt(communityId, 10) || 0
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  ]
  const gradient = gradients[numId % gradients.length]

  const formatMembers = (count?: number) => {
    if (!count) return "0 members"
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k members`
    return `${count} members`
  }

  if (isLoading) {
    const loadingContent = (
      <div
        className="dashboard-box-content"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.875rem" }}
        >
          Loading...
        </div>
      </div>
    )

    if (noWrapper) return loadingContent

    return (
      <div className="dashboard-box fav-community-box">
        <div className="dashboard-box-header">
          <div
            style={{
              width: 150,
              height: 24,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 4,
            }}
            className="skeleton-pulse"
          ></div>
        </div>
        {loadingContent}
      </div>
    )
  }

  if (!community) {
    const notFoundContent = (
      <div
        className="dashboard-box-content"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(239, 68, 68, 0.8)", fontSize: "0.875rem" }}>
          Community not found
        </div>
      </div>
    )

    if (noWrapper) return notFoundContent

    return (
      <div className="dashboard-box fav-community-box">
        <div className="dashboard-box-header">
          <h3 className="dashboard-box-title">Community #{communityId}</h3>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onUnfavorite(communityId)
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              padding: 4,
            }}
            title="Remove from favorites"
          >
            <span className="material-icons-round" style={{ fontSize: 18 }}>
              star
            </span>
          </button>
        </div>
        {notFoundContent}
      </div>
    )
  }

  const mainContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="dashboard-box-content">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "#9ca3af",
              lineHeight: 1.5,
            }}
          >
            A promising community focused on open governance and growth.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 14 }}>
                group
              </span>
              {formatMembers(community.members)}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#22c55e",
                background: "rgba(34, 197, 94, 0.1)",
                padding: "4px 8px",
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              Active Track
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  if (noWrapper) return mainContent

  return (
    <Link
      to={`/bounties/${communityId}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        height: "100%",
      }}
    >
      <div className="dashboard-box" style={{ cursor: "pointer" }}>
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
            <h3
              className="dashboard-box-title"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: gradient,
                }}
              ></div>
              {community.name}
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onUnfavorite(communityId)
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
        </div>
        {mainContent}
      </div>
    </Link>
  )
}
