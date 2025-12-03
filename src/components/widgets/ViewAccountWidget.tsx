import React, { useState, useRef, useEffect } from "react"
import { WidgetProps } from "./WidgetRegistry"
import "./Widget.css"

export const ViewAccountWidget: React.FC<WidgetProps> = ({
  onComplete,
  onCancel,
}) => {
  const [address, setAddress] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) {
      onComplete({ address: address.trim() })
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
        <span className="widget-prefix">View Account:</span>
        <input
          ref={inputRef}
          type="text"
          className="widget-input"
          placeholder="Enter account address..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button
          type="submit"
          className="widget-submit"
          disabled={!address.trim()}
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
