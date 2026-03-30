import React from "react"
import { generatePath } from "./BountyVotingResults.utils"

interface DecisionCurvesProps {
  progress?: number
  currentApproval?: number
  currentSupport?: number
  actualApproval?: number
  actualSupport?: number
  curves?: {
    decisionPeriod: number
    support: any
    approval: any
  } | null
}

/**
 * Sub-component representing the Decision Curves SVG chart.
 * Decouples the mathematically complex part of the voting results.
 */
const DecisionCurves: React.FC<DecisionCurvesProps> = ({
  progress,
  currentApproval,
  currentSupport,
  actualApproval,
  actualSupport,
  curves,
}) => {
  if (!curves) return null

  const { decisionPeriod } = curves
  const supportPath = generatePath(curves.support, decisionPeriod)
  const approvalPath = generatePath(curves.approval, decisionPeriod)

  // Default paths if mapping fails or for background visualization
  const supportD = supportPath || "M0,100 L20,95 L40,85 L60,70 L80,50 L100,25"
  const approvalD = approvalPath || "M0,0 C20,5 40,15 60,25 C80,35 90,45 100,55"

  const isValidValue = (val?: number) =>
    val !== undefined && !isNaN(val) && val >= 0 && val <= 100

  return (
    <div className="bounty-voting-results__curves">
      <div className="bounty-voting-results__curves-header">
        <h4 className="bounty-voting-results__curves-title">Decision Curves</h4>
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

          {/* Grid Lines */}
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

          {/* Curve Areas & Lines */}
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

          {/* Progress Timeline */}
          {isValidValue(progress) && (
            <line
              x1={progress}
              y1="0"
              x2={progress}
              y2="100"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1"
              strokeDasharray="4,4"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Actual Progress Lines (Horizontal dashed lines representing current votes) */}
          {isValidValue(actualApproval) && (
            <line
              x1="0"
              y1={100 - (actualApproval || 0)}
              x2="100"
              y2={100 - (actualApproval || 0)}
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              vectorEffect="non-scaling-stroke"
              opacity="0.8"
            />
          )}
          {isValidValue(actualSupport) && (
            <line
              x1="0"
              y1={100 - (actualSupport || 0)}
              x2="100"
              y2={100 - (actualSupport || 0)}
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              vectorEffect="non-scaling-stroke"
              opacity="0.8"
            />
          )}
        </svg>

        {/* Live Data Point Indicators (Overlay) */}
        {isValidValue(progress) && (
          <div className="bounty-voting-results__curves-indicators">
            {isValidValue(currentApproval) && (
              <div
                className="curve-point curve-point--approval"
                style={{
                  left: `${progress}%`,
                  top: `${100 - (currentApproval || 0)}%`,
                }}
                title={`Current Needed Approval: ${currentApproval?.toFixed(1)}%`}
              />
            )}
            {isValidValue(currentSupport) && (
              <div
                className="curve-point curve-point--support"
                style={{
                  left: `${progress}%`,
                  top: `${100 - (currentSupport || 0)}%`,
                }}
                title={`Current Needed Support: ${currentSupport?.toFixed(1)}%`}
              />
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bounty-voting-results__curves-legend">
        <div className="legend-group">
          <div className="legend-item">
            <div className="legend-dot legend-dot--approval" />
            <span>Min Approval</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot legend-dot--support" />
            <span>Min Support</span>
          </div>
        </div>
        <div className="legend-item legend-item--secondary">
          <div
            className="legend-dot legend-dot--muted"
            style={{ borderRadius: 0, width: 8, height: 2 }}
          />
          <span>Current Votes</span>
        </div>
      </div>
    </div>
  )
}

export default DecisionCurves
