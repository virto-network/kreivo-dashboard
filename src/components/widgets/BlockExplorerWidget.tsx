import React, { useState, useRef, useEffect } from "react"
import { WidgetProps } from "./WidgetRegistry"
import "./Widget.css"

export const BlockExplorerWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
}) => {
  const [blockHash, setBlockHash] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (blockHash.trim()) {
      onComplete({ blockHash: blockHash.trim() })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <form className="widget-form" onSubmit={handleSubmit}>
      <div className="widget-input-wrapper">
        <span className="widget-prefix">Block Hash:</span>
        <input
          ref={inputRef}
          type="text"
          className="widget-input"
          placeholder="Enter block hash or number..."
          value={blockHash}
          onChange={(e) => setBlockHash(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button
          type="submit"
          className="widget-submit"
          disabled={!blockHash.trim()}
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
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button type="button" className="widget-cancel" onClick={onCancel}>
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
    </form>
  )
}
