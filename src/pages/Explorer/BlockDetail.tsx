import React, { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useStateObservable } from "@react-rxjs/core"
import { blockInfoState$ } from "../block.state"
import "./BlockDetail.css"

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

const BlockDetail: React.FC = () => {
  const { blockNumber } = useParams<{ blockNumber: string }>()
  const blockInfo = useStateObservable(blockInfoState$(blockNumber || ""))

  if (!blockNumber) {
    return (
      <div className="block-detail-page">
        <div className="block-detail-container">
          <h1>Block Not Found</h1>
          <p>No block number provided.</p>
          <Link to="/">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  if (!blockInfo) {
    return (
      <div className="block-detail-page">
        <div className="block-detail-container">
          <div className="block-detail-loading">
            <div className="loading-spinner"></div>
            <p>Loading block #{blockNumber}...</p>
          </div>
        </div>
      </div>
    )
  }

  const formatHash = (hash: string) => {
    if (!hash) return "N/A"
    return `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}`
  }

  const safeStringify = (obj: any, space?: number): string => {
    return JSON.stringify(
      obj,
      (_key, value) => {
        if (typeof value === "bigint") {
          return value.toString()
        }
        return value
      },
      space,
    )
  }

  const formatEventType = (event: any) => {
    if (!event) return "Unknown"
    if (event.event?.type && event.event?.value?.type) {
      return `${event.event.type}.${event.event.value.type}`
    }
    if (event.type && event.value) {
      return `${event.type}.${event.value.type}`
    }
    return "Unknown Event"
  }

  const getEventPhase = (event: any) => {
    if (!event?.phase) return null
    if (event.phase.type === "ApplyExtrinsic") {
      return `Extrinsic #${event.phase.value}`
    }
    return event.phase.type
  }

  const getEventDetails = (event: any) => {
    const details: any = {}

    if (event.event?.value?.value?.dispatch_info) {
      const dispatchInfo = event.event.value.value.dispatch_info
      if (dispatchInfo.weight) {
        details.weight = dispatchInfo.weight.ref_time || "N/A"
        details.proofSize = dispatchInfo.weight.proof_size || "N/A"
      }
      if (dispatchInfo.class) {
        details.class = dispatchInfo.class.type || "N/A"
      }
      if (dispatchInfo.pays_fee) {
        details.paysFee = dispatchInfo.pays_fee.type || "N/A"
      }
    }

    return details
  }

  return (
    <div className="block-detail-page">
      <div className="block-detail-container">
        <div className="block-detail-header">
          <Link to="/" className="block-detail-back">
            ← Back to Dashboard
          </Link>
          <h1 className="block-detail-title">
            Block #{blockInfo.number.toLocaleString()}
          </h1>
          <div
            className={`block-detail-status block-status-${blockInfo.status}`}
          >
            {blockInfo.status}
          </div>
        </div>

        <div className="block-detail-content">
          <div className="block-detail-section">
            <h2 className="block-detail-section-title">Block Information</h2>
            <div className="block-detail-info-grid">
              <div className="block-detail-info-item">
                <span className="block-detail-label">Block Number:</span>
                <span className="block-detail-value">
                  {blockInfo.number.toLocaleString()}
                </span>
              </div>
              <div className="block-detail-info-item">
                <span className="block-detail-label">Hash:</span>
                <span className="block-detail-value block-detail-hash">
                  {formatHash(blockInfo.hash)}
                </span>
              </div>
              <div className="block-detail-info-item">
                <span className="block-detail-label">Parent Hash:</span>
                <span className="block-detail-value block-detail-hash">
                  {blockInfo.parent ? (
                    <Link to={`/explorer/${blockInfo.number - 1}`}>
                      {formatHash(blockInfo.parent)}
                    </Link>
                  ) : (
                    formatHash(blockInfo.parent || "N/A")
                  )}
                </span>
              </div>
              <div className="block-detail-info-item">
                <span className="block-detail-label">State Root:</span>
                <span className="block-detail-value block-detail-hash">
                  {blockInfo.header?.stateRoot
                    ? formatHash(blockInfo.header.stateRoot)
                    : "N/A"}
                </span>
              </div>
              <div className="block-detail-info-item">
                <span className="block-detail-label">Extrinsics Root:</span>
                <span className="block-detail-value block-detail-hash">
                  {blockInfo.header?.extrinsicRoot
                    ? formatHash(blockInfo.header.extrinsicRoot)
                    : "N/A"}
                </span>
              </div>
              <div className="block-detail-info-item">
                <span className="block-detail-label">Extrinsics Count:</span>
                <span className="block-detail-value">
                  {blockInfo.body ? blockInfo.body.length : 0}
                </span>
              </div>
              <div className="block-detail-info-item">
                <span className="block-detail-label">Events Count:</span>
                <span className="block-detail-value">
                  {blockInfo.events ? blockInfo.events.length : 0}
                </span>
              </div>
            </div>
          </div>

          {blockInfo.events && blockInfo.events.length > 0 && (
            <div className="block-detail-section">
              <h2 className="block-detail-section-title">
                Events ({blockInfo.events.length})
              </h2>
              <div className="block-detail-events">
                {blockInfo.events.map((event: any, index: number) => (
                  <EventItem
                    key={index}
                    event={event}
                    formatEventType={formatEventType}
                    getEventPhase={getEventPhase}
                    getEventDetails={getEventDetails}
                    safeStringify={safeStringify}
                  />
                ))}
              </div>
            </div>
          )}

          {blockInfo.body && blockInfo.body.length > 0 && (
            <div className="block-detail-section">
              <h2 className="block-detail-section-title">
                Extrinsics ({blockInfo.body.length})
              </h2>
              <div className="block-detail-extrinsics">
                {blockInfo.body.map((extrinsic: string, index: number) => (
                  <div key={index} className="block-detail-extrinsic">
                    <div className="block-detail-extrinsic-index">#{index}</div>
                    <div className="block-detail-extrinsic-hash">
                      {formatHash(extrinsic)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BlockDetail
