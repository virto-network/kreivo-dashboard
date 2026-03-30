import React from "react"
import { NostrComment } from "@/types/nostr"

interface CommentItemProps {
  comment: NostrComment
}

const timeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(timestamp).toLocaleDateString()
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  return (
    <div className="bounty-comments-item">
      <div className="bounty-comments-header">
        <span className="bounty-comments-author">
          {comment.authorName || `${comment.pubkey.slice(0, 8)}...`}
        </span>
        <span className="bounty-comments-time">
          {timeAgo(comment.createdAt)}
        </span>
      </div>
      <p className="bounty-comments-content">{comment.content}</p>
    </div>
  )
}
