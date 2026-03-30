import React from "react"

interface BountyInformationProps {
  information: {
    votingSystem: string
    snapshot: string
    created: string
    startBlock?: number | null
    endBlock?: number | null
  }
  syncing?: boolean
}

const BountyInformation: React.FC<BountyInformationProps> = ({
  information,
  syncing,
}) => {
  const SkeletonLine = ({
    width = "80px",
    height = "16px",
    radius = "4px",
  }) => (
    <div
      style={{
        width,
        height,
        background: "var(--color-bg-tertiary, #333)",
        borderRadius: radius,
        animation: "pulse 1.5s infinite ease-in-out",
        opacity: 0.6,
      }}
    ></div>
  )

  return (
    <div className="bounty-information">
      <h3 className="bounty-information__title">Information</h3>

      <ul className="bounty-information__list">
        <li className="bounty-information__item">
          <span className="bounty-information__label">Voting System</span>
          <span className="bounty-information__value">
            {information.votingSystem}
          </span>
        </li>

        <li className="bounty-information__item">
          <span className="bounty-information__label">Snapshot</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {syncing ? (
              <SkeletonLine width="100px" height="18px" />
            ) : information.startBlock ? (
              <a
                href={`/explorer/${information.startBlock}`}
                className="bounty-information__link"
              >
                Start: {information.startBlock}
                <span
                  className="material-symbols-outlined bounty-information__link-icon"
                  style={{ fontSize: "14px", marginLeft: "4px" }}
                >
                  open_in_new
                </span>
              </a>
            ) : (
              <span className="bounty-information__value text-sm text-[var(--color-text-secondary)]">
                Start: N/A
              </span>
            )}

            {syncing ? (
              <SkeletonLine width="100px" height="18px" />
            ) : information.endBlock ? (
              <a
                href={`/explorer/${information.endBlock}`}
                className="bounty-information__link"
              >
                End: {information.endBlock}
                <span
                  className="material-symbols-outlined bounty-information__link-icon"
                  style={{ fontSize: "14px", marginLeft: "4px" }}
                >
                  open_in_new
                </span>
              </a>
            ) : (
              <span className="bounty-information__value text-sm text-[var(--color-text-secondary)]">
                End: Ongoing
              </span>
            )}
          </div>
        </li>

        <li className="bounty-information__item">
          <span className="bounty-information__label">Created</span>
          <span className="bounty-information__value">
            {syncing ? <SkeletonLine width="80px" /> : information.created}
          </span>
        </li>
      </ul>
    </div>
  )
}

export default BountyInformation
