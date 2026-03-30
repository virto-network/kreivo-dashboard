import React from "react"

interface SkeletonLineProps {
  width?: string
  height?: string
  radius?: string
}

const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = "80px",
  height = "16px",
  radius = "4px",
}) => (
  <div
    className="skeleton-pulse"
    style={{
      width,
      height,
      borderRadius: radius,
    }}
  />
)

export default SkeletonLine
