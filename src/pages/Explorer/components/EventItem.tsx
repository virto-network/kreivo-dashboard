import React, { useState } from "react"

interface EventItemProps {
  event: any
  formatEventType: (event: any) => string
  getEventPhase: (event: any) => string | null
  getEventDetails: (event: any) => any
  safeStringify: (obj: any, space?: number) => string
}

const EventItem: React.FC<EventItemProps> = ({
  event,
  formatEventType,
  getEventPhase,
  getEventDetails,
  safeStringify,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const eventType = formatEventType(event)
  const phase = getEventPhase(event)
  const details = getEventDetails(event)

  return (
    <div className="block-detail-event">
      <div className="block-detail-event-header">
        <div className="block-detail-event-main">
          <div className="block-detail-event-type-badge">{eventType}</div>
          {phase && <div className="block-detail-event-phase">{phase}</div>}
        </div>
        <button
          className="block-detail-event-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      {Object.keys(details).length > 0 && (
        <div className="block-detail-event-summary">
          {details.weight && (
            <div className="block-detail-event-detail-item">
              <span className="block-detail-event-detail-label">Weight:</span>
              <span className="block-detail-event-detail-value">
                {details.weight}
              </span>
            </div>
          )}
          {details.proofSize && details.proofSize !== "O" && (
            <div className="block-detail-event-detail-item">
              <span className="block-detail-event-detail-label">
                Proof Size:
              </span>
              <span className="block-detail-event-detail-value">
                {details.proofSize}
              </span>
            </div>
          )}
          {details.class && (
            <div className="block-detail-event-detail-item">
              <span className="block-detail-event-detail-label">Class:</span>
              <span className="block-detail-event-detail-value">
                {details.class}
              </span>
            </div>
          )}
          {details.paysFee && (
            <div className="block-detail-event-detail-item">
              <span className="block-detail-event-detail-label">Pays Fee:</span>
              <span className="block-detail-event-detail-value">
                {details.paysFee}
              </span>
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="block-detail-event-data">
          <pre>{safeStringify(event, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default EventItem
