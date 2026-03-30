import React from "react"
import { useNavigate } from "react-router-dom"
import "./BackButton.css"

interface BackButtonProps {
  label?: string
  to?: string | -1
  className?: string
  onClick?: () => void
}

/**
 * Reusable BackButton component with premium dark style.
 * Standardized across Governance, Explorer, and Communities.
 */
const BackButton: React.FC<BackButtonProps> = ({
  label,
  to = -1,
  className = "",
  onClick,
}) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onClick) {
      onClick()
      return
    }

    if (to === -1) {
      navigate(-1)
    } else {
      navigate(to as string)
    }
  }

  return (
    <button
      className={`back-button-root ${label ? "back-button-root--with-label" : ""} ${className}`}
      onClick={handleBack}
      aria-label={label || "Go back"}
    >
      <span className="material-icons-round">arrow_back</span>
      {label && <span className="back-button-root__label">{label}</span>}
    </button>
  )
}

export default BackButton
