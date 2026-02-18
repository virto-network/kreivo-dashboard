import React from "react"

interface BountyVotingResultsProps {
  voting: {
    forVotes: number
    forPercentage: number
    forCount: number
    againstVotes: number
    againstPercentage: number
    againstCount: number
    quorumCurrent: number
    quorumRequired: number
    quorumReached: boolean
    showCurves?: boolean
    curves?: {
      decisionPeriod: number
      support: any
      approval: any
    }
    progress?: number
    timeLeft?: string
    currentApproval?: number
    currentSupport?: number
  }
}

const BountyVotingResults: React.FC<BountyVotingResultsProps> = ({
  voting,
}) => {
  const showCurves = voting.showCurves !== undefined ? voting.showCurves : true

  const generatePath = (curve: any, decisionPeriod: number) => {
    if (!curve || !decisionPeriod) return ""

    if (curve.type === "LinearDecreasing") {
      const startY = 100 - curve.start
      const endY = 100 - curve.end

      let kneeX = 100
      if (curve.length && decisionPeriod > 0) {
        kneeX = (curve.length / decisionPeriod) * 100
      }
      if (kneeX > 100) kneeX = 100

      return `M0,${startY} L${kneeX},${endY} L100,${endY}`
    } else if (curve.type === "Reciprocal") {
      // Reciprocal: factor / (x + x_offset) + y_offset
      const points: string[] = []
      const steps = 50

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps
        const xInfo = progress * decisionPeriod

        const numerator = BigInt(curve.factor)
        const denominator = BigInt(Math.floor(xInfo)) + BigInt(curve.xOffset)
        const yVal = Number(numerator / denominator) + curve.yOffset

        const percentage = (yVal / 1_000_000_000) * 100
        const svgY = 100 - percentage

        points.push(`${progress * 100},${svgY}`)
      }
      return `M${points.join(" L")}`
    } else if (curve.type === "SteppedDecreasing") {
      const points: string[] = []
      const steps = 100
      for (let i = 0; i <= steps; i++) {
        const startY = 100 - curve.begin
        const endY = 100 - curve.end
        points.push(`0,${startY} 100,${endY}`)
      }
      const startY = 100 - curve.begin
      const endY = 100 - curve.end
      return `M0,${startY} L100,${endY}`
    }
    if (curve.start !== undefined && curve.end !== undefined) {
      const startY = 100 - curve.start
      const endY = 100 - curve.end
      let kneeX = 100
      if (curve.length && decisionPeriod > 0) {
        kneeX = (curve.length / decisionPeriod) * 100
      }
      if (kneeX > 100) kneeX = 100
      return `M0,${startY} L${kneeX},${endY} L100,${endY}`
    }

    return ""
  }

  return (
    <div className="bounty-voting-results">
      <h3 className="bounty-voting-results__title">Current Results</h3>

      <div className="bounty-voting-results__section">
        <div className="bounty-voting-results__header">
          <span className="bounty-voting-results__label bounty-voting-results__label--for">
            For
          </span>
          <span className="bounty-voting-results__value">
            {voting.forVotes}{" "}
          </span>
        </div>
        <div className="bounty-voting-results__bar-container">
          <div
            className="bounty-voting-results__bar bounty-voting-results__bar--for"
            style={{ width: `${voting.forPercentage}%` }}
          ></div>
        </div>
        <div className="bounty-voting-results__stats">
          <span className="bounty-voting-results__percentage">
            {voting.forPercentage}%
          </span>
          <span className="bounty-voting-results__count">
            {voting.forCount} votes
          </span>
        </div>
      </div>

      <div className="bounty-voting-results__section">
        <div className="bounty-voting-results__header">
          <span className="bounty-voting-results__label bounty-voting-results__label--against">
            Against
          </span>
          <span className="bounty-voting-results__value">
            {voting.againstVotes}{" "}
          </span>
        </div>
        <div className="bounty-voting-results__bar-container">
          <div
            className="bounty-voting-results__bar bounty-voting-results__bar--against"
            style={{ width: `${voting.againstPercentage}%` }}
          ></div>
        </div>
        <div className="bounty-voting-results__stats">
          <span className="bounty-voting-results__percentage">
            {voting.againstPercentage}%
          </span>
          <span className="bounty-voting-results__count">
            {voting.againstCount} votes
          </span>
        </div>
      </div>

      {/* Quorum */}
      <div className="bounty-voting-results__quorum">
        <div className="bounty-voting-results__quorum-header">
          <span className="bounty-voting-results__quorum-label">Quorum</span>
          <span
            className={`bounty-voting-results__quorum-status ${voting.quorumReached ? "bounty-voting-results__quorum-status--reached" : ""}`}
          >
            <span className="material-symbols-outlined bounty-voting-results__quorum-icon">
              {voting.quorumReached ? "check_circle" : "radio_button_unchecked"}
            </span>
            {voting.quorumReached ? "Reached" : "Not Reached"}
          </span>
        </div>
        <div className="bounty-voting-results__quorum-bar-container">
          <div
            className="bounty-voting-results__quorum-threshold"
            style={{ left: `${voting.quorumRequired}%` }}
            title="Quorum Threshold"
          ></div>
          <div
            className="bounty-voting-results__quorum-bar"
            style={{ width: `${voting.quorumCurrent}%` }}
          ></div>
        </div>
        <div className="bounty-voting-results__quorum-stats">
          <span className="bounty-voting-results__quorum-stat">
            Current: {voting.quorumCurrent}%
          </span>
          <span className="bounty-voting-results__quorum-stat">
            Required: {voting.quorumRequired}%
          </span>
        </div>
      </div>

      {showCurves && (
        <div className="bounty-voting-results__curves">
          <div className="bounty-voting-results__curves-header">
            <h4 className="bounty-voting-results__curves-title">
              Decision Curves
            </h4>
          </div>

          <div className="bounty-voting-results__curves-chart">
            <svg
              className="bounty-voting-results__curves-svg"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient
                  id="gradientApproval"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient
                  id="gradientSupport"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <g
                className="grid-lines"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              >
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((x) => (
                  <line
                    key={`v-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="100"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {[0, 25, 50, 75, 100].map((y) => (
                  <line
                    key={`h-${y}`}
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>

              {(() => {
                let supportD = "M0,100 L20,95 L40,85 L60,70 L80,50 L100,25"
                let approvalD = "M0,0 C20,5 40,15 60,25 C80,35 90,45 100,55"

                if (voting.curves) {
                  const { decisionPeriod } = voting.curves
                  const s = generatePath(voting.curves.support, decisionPeriod)
                  const a = generatePath(voting.curves.approval, decisionPeriod)
                  if (s) supportD = s
                  if (a) approvalD = a
                }

                return (
                  <>
                    <path
                      d={`${supportD} L100,100 L0,100 Z`}
                      fill="url(#gradientSupport)"
                    />
                    <path
                      d={supportD}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      filter="url(#glow)"
                      vectorEffect="non-scaling-stroke"
                    />

                    <path
                      d={`${approvalD} L100,100 L0,100 Z`}
                      fill="url(#gradientApproval)"
                    />
                    <path
                      d={approvalD}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      filter="url(#glow)"
                      vectorEffect="non-scaling-stroke"
                    />

                    {voting.progress !== undefined && (
                      <g>
                        <line
                          x1={voting.progress}
                          y1="0"
                          x2={voting.progress}
                          y2="100"
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    )}
                  </>
                )
              })()}
            </svg>
            {voting.progress !== undefined &&
              !isNaN(voting.progress) &&
              voting.progress >= 0 &&
              voting.progress <= 100 && (
                <div
                  style={{
                    position: "absolute",
                    inset: "16px",
                    pointerEvents: "none",
                  }}
                >
                  {voting.currentApproval !== undefined &&
                    !isNaN(voting.currentApproval) &&
                    voting.currentApproval >= 0 &&
                    voting.currentApproval <= 100 && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${voting.progress}%`,
                          top: `${100 - voting.currentApproval}%`,
                          width: "8px",
                          height: "8px",
                          backgroundColor: "#22c55e",
                          border: "2px solid white",
                          borderRadius: "50%",
                          transform: "translate(-50%, -50%)",
                          boxShadow: "0 0 4px rgba(34, 197, 94, 0.5)",
                        }}
                        title={`Approval: ${voting.currentApproval.toFixed(1)}%`}
                      />
                    )}

                  {voting.currentSupport !== undefined &&
                    !isNaN(voting.currentSupport) &&
                    voting.currentSupport >= 0 &&
                    voting.currentSupport <= 100 && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${voting.progress}%`,
                          top: `${100 - voting.currentSupport}%`,
                          width: "8px",
                          height: "8px",
                          backgroundColor: "#3b82f6",
                          border: "2px solid white",
                          borderRadius: "50%",
                          transform: "translate(-50%, -50%)",
                          boxShadow: "0 0 4px rgba(59, 130, 246, 0.5)",
                        }}
                        title={`Support: ${voting.currentSupport.toFixed(1)}%`}
                      />
                    )}
                </div>
              )}{" "}
          </div>

          <div
            className="bounty-voting-results__curves-legend"
            style={{
              justifyContent: "space-between",
              width: "100%",
              marginTop: "16px",
              display: "flex",
            }}
          >
            <div style={{ display: "flex", gap: "16px" }}>
              <div className="bounty-voting-results__curves-legend-item">
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    transform: "scale(1.2)",
                  }}
                ></div>
                <span style={{ color: "#d1d5db", fontWeight: 500 }}>
                  Approval
                </span>
              </div>
              <div className="bounty-voting-results__curves-legend-item">
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                    transform: "scale(1.2)",
                  }}
                ></div>
                <span style={{ color: "#d1d5db", fontWeight: 500 }}>
                  Support
                </span>
              </div>
            </div>
            <div className="bounty-voting-results__curves-legend-item">
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#6b7280",
                }}
              ></div>
              <span style={{ color: "#6b7280", fontSize: "0.7rem" }}>
                Live Updates
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default BountyVotingResults
