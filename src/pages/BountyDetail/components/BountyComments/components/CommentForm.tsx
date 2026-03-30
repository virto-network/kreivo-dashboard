import React from "react"

interface CommentFormProps {
  newComment: string
  submitting: boolean
  setNewComment: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export const CommentForm: React.FC<CommentFormProps> = ({
  newComment,
  submitting,
  setNewComment,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="bounty-comments-form">
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Write a comment..."
        className="bounty-comments-textarea"
        disabled={submitting}
      />
      <div className="bounty-comments-button-container">
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="bounty-comments-submit-button"
        >
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </div>
    </form>
  )
}
