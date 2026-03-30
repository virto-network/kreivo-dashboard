import React from "react"
import "./Skeleton.css"

interface SkeletonLineProps {
  width?: string
  height?: string
  radius?: string
  className?: string
}

/**
 * Standard Skeleton component for loading states.
 */
const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = "100%",
  height = "16px",
  radius = "4px",
  className = "",
}) => (
  <div
    className={`skeleton-pulse ${className}`}
    style={{
      width,
      height,
      borderRadius: radius,
    }}
  />
)

export default SkeletonLine
