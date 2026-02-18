import React from "react"

interface BountyHeaderProps {
  id: string
  title: string
  category: string
  categoryColor: string
  status: string
  proposer: {
    address: string
    avatar: string
  }
  startDate: string | { date: string; time: string }
  endDate: string | { date: string; time: string }
}

const BountyHeader: React.FC<BountyHeaderProps> = ({
  id,
  title,
  category,
  categoryColor,
  status,
  proposer,
  startDate,
  endDate,
}) => {
  return (
    <div className="bounty-header">
      <style>{`
        .bounty-header__date-value-group {
          display: flex;
          flex-direction: column;
        }
        .bounty-header__time-value {
          font-size: 0.75rem;
          color: #9ca3af;
        }
      `}</style>
      <div className="bounty-header__top">
        <div className="bounty-header__tags">
          <span className={`bounty-header__category bounty-header__category--${categoryColor}`}>
            {category}
          </span>
          <span className="bounty-header__id">#{id}</span>
        </div>
        <div className="bounty-header__actions">
          <span className="bounty-header__status bounty-header__status--active">
            <span className="bounty-header__status-dot"></span>
            {status}
          </span>
          <button className="bounty-header__share-button">
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </div>

      <h1 className="bounty-header__title">{title}</h1>

      <div className="bounty-header__meta">
        <div className="bounty-header__proposer">
          <div className="bounty-header__proposer-info">
            <span className="bounty-header__proposer-label">Proposed by</span>
            <span className="bounty-header__proposer-address">{proposer.address}</span>
          </div>
        </div>

        <div className="bounty-header__divider"></div>

        <div className="bounty-header__date">
          <span className="bounty-header__date-label">Start Date</span>
          {typeof startDate === 'string' ? (
            <span className="bounty-header__date-value">{startDate}</span>
          ) : (
            <div className="bounty-header__date-value-group">
              <span className="bounty-header__date-value">{startDate.date}</span>
              <span className="bounty-header__time-value">{startDate.time}</span>
            </div>
          )}
        </div>

        <div className="bounty-header__date">
          <span className="bounty-header__date-label">End Date</span>
          {typeof endDate === 'string' ? (
            <span className="bounty-header__date-value">{endDate}</span>
          ) : (
            <div className="bounty-header__date-value-group">
              <span className="bounty-header__date-value">{endDate.date}</span>
              <span className="bounty-header__time-value">{endDate.time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BountyHeader

