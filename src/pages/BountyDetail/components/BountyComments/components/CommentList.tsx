import React from "react"
import { NostrComment } from "@/types/nostr"
import { CommentItem } from "./CommentItem"

interface CommentListProps {
  comments: NostrComment[]
  loading: boolean
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  loading,
}) => {
  return (
    <div className="bounty-comments-list">
      {loading ? (
        <div className="bounty-comments-loading">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="bounty-comments-empty">
          No comments yet. Be the first!
        </div>
      ) : (
        comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))
      )}
    </div>
  )
}
