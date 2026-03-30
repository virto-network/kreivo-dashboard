import React from "react"
import SkeletonLine from "./SkeletonLine"

interface DateDisplayProps {
  label: string
  date: string | { date: string; time: string }
  syncing?: boolean
}

const DateDisplay: React.FC<DateDisplayProps> = ({ label, date, syncing }) => {
  if (syncing) {
    return (
      <div className="bounty-header__date">
        <span className="bounty-header__date-label">{label}</span>
        <SkeletonLine width="60px" height="20px" />
      </div>
    )
  }

  const isStringDate = typeof date === "string"

  return (
    <div className="bounty-header__date">
      <span className="bounty-header__date-label">{label}</span>
      {isStringDate ? (
        <span className="bounty-header__date-value">{date}</span>
      ) : (
        <div className="bounty-header__date-value-group">
          <span className="bounty-header__date-value">{date.date}</span>
          <span className="bounty-header__time-value">{date.time}</span>
        </div>
      )}
    </div>
  )
}

export default DateDisplay
