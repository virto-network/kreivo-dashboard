import React, { useState } from "react"

interface ExtrinsicItemProps {
  index: number
  extrinsic: string
  decoded?: any
  formatHash: (hash: string) => string
  safeStringify: (obj: any, space?: number) => string
}

const ExtrinsicItem: React.FC<ExtrinsicItemProps> = ({
  index,
  extrinsic,
  decoded,
  formatHash,
  safeStringify,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const title = decoded
    ? `${decoded.pallet}.${decoded.call}`
    : formatHash(extrinsic)

  return (
    <div className="block-detail-extrinsic">
      <div className="block-detail-extrinsic-header">
        <div className="block-detail-extrinsic-main">
          <div className="block-detail-extrinsic-index">#{index}</div>
          <div className="block-detail-extrinsic-name">{title}</div>
        </div>
        <button
          className="block-detail-extrinsic-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      {isExpanded && (
        <div className="block-detail-extrinsic-data">
          <div className="block-detail-extrinsic-hash-row">
            <span className="block-detail-extrinsic-hash-label">Hash:</span>
            <span className="block-detail-extrinsic-hash-value">
              {extrinsic}
            </span>
          </div>
          {decoded && (
            <pre className="block-detail-extrinsic-args">
              {safeStringify(decoded.args, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default ExtrinsicItem
