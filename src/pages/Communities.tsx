import React, { useState, useRef, useEffect } from "react"
import { useCommunities } from "@/hooks/useCommunities"
import "./Communities.css"

export interface CommunitiesProps {
  onActionClick?: (
    action: "create" | "add-member" | "remove-member" | "buy-membership",
  ) => void
}

const Communities: React.FC<CommunitiesProps> = ({ onActionClick }) => {
  const { communities, isLoading, error } = useCommunities()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const getGradient = (id: number) => {
    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    ]
    return gradients[id % gradients.length]
  }

  const getIndicator = (id: number) => {
    const indicators = [
      "#10b981",
      "#3b82f6",
      "#fbbf24",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4",
    ]
    return indicators[id % indicators.length]
  }

  const formatMembers = (members: number) => {
    if (!members) return "0 members"
    if (members >= 1000) {
      return `${(members / 1000).toFixed(1)}k members`
    }
    return `${members} members`
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMenu])

  const handleActionClick = (
    action: "create" | "add-member" | "remove-member" | "buy-membership",
  ) => {
    setShowMenu(false)
    if (onActionClick) {
      onActionClick(action)
    }
  }

  return (
    <div className="communities-page">
      <div className="communities-header">
        <h1 className="communities-title">Communities</h1>
        <div className="communities-menu-container" ref={menuRef}>
          <button
            className="communities-menu-button"
            onClick={() => setShowMenu(!showMenu)}
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
          {showMenu && (
            <div className="communities-dropdown-menu">
              <button
                className="communities-menu-item"
                onClick={() => handleActionClick("create")}
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
                onClick={() => handleActionClick("add-member")}
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
              <button
                className="communities-menu-item"
                onClick={() => handleActionClick("remove-member")}
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
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                Remove Member
              </button>
              <button
                className="communities-menu-item"
                onClick={() => handleActionClick("buy-membership")}
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
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                Buy Membership
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="communities-loading">Loading communities...</div>
      ) : error ? (
        <div className="communities-error">Error: {error}</div>
      ) : communities.length === 0 ? (
        <div className="communities-empty">No communities found</div>
      ) : (
        <div className="communities-list">
          {communities.map((community) => (
            <div key={community.id} className="communities-item">
              <div
                className="communities-logo"
                style={{ background: getGradient(community.id) }}
              ></div>
              <div className="communities-info">
                <div className="communities-name">{community.name}</div>
                <div className="communities-members">
                  {formatMembers(community.members)}
                </div>
              </div>
              <div
                className="communities-indicator"
                style={{ backgroundColor: getIndicator(community.id) }}
              ></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Communities
