import { useParams, Link } from "react-router-dom"
import BackButton from "@/components/ui/BackButton/BackButton"
import { useStateObservable } from "@react-rxjs/core"
import { blockInfoState$ } from "../block.state"
import EventItem from "./components/EventItem"
import ExtrinsicItem from "./components/ExtrinsicItem"
import "./BlockDetail.css"

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
          <BackButton label="Back to Dashboard" to="/" />
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
                  <ExtrinsicItem
                    key={index}
                    index={index}
                    extrinsic={extrinsic}
                    decoded={
                      blockInfo.decodedBody
                        ? blockInfo.decodedBody[index]
                        : null
                    }
                    formatHash={formatHash}
                    safeStringify={safeStringify}
                  />
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
