import React, { useState } from "react"
import { MarkdownParser } from "@/utils/markdown"

interface BountyDescriptionProps {
  description: string
}

const BountyDescription: React.FC<BountyDescriptionProps> = ({ description }) => {
  const renderedMarkdown = MarkdownParser.parse(description);

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bounty-description">
      <h3 className="bounty-description__title">
        <span className="material-symbols-outlined bounty-description__title-icon">
          description
        </span>
        Description
      </h3>

      <div className={`bounty-description__content ${isExpanded ? 'bounty-description__content--expanded' : 'bounty-description__content--collapsed'}`}>
        {/* Render markdown content safely */}
        <div
          className="bounty-description__markdown"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
        />
      </div>

      <button
        className="bounty-description__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? 'Show Less' : 'Show More'}
        <span className="material-icons-round" style={{ fontSize: '16px', marginLeft: '4px' }}>
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>
    </div>
  )
}

export default BountyDescription



