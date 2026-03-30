import React from "react"
import { useBountyComments } from "./useBountyComments"
import { CommentForm } from "./components/CommentForm"
import { CommentList } from "./components/CommentList"
import "./BountyComments.css"

interface BountyCommentsProps {
  proposalId: string
}

const BountyComments: React.FC<BountyCommentsProps> = ({ proposalId }) => {
  const {
    comments,
    newComment,
    loading,
    submitting,
    setNewComment,
    handleSubmit,
  } = useBountyComments(proposalId)

  return (
    <div className="bounty-comments-container">
      <h3 className="bounty-comments-title">Comments ({comments.length})</h3>

      <CommentForm
        newComment={newComment}
        submitting={submitting}
        setNewComment={setNewComment}
        onSubmit={handleSubmit}
      />

      <CommentList comments={comments} loading={loading} />
    </div>
  )
}

export default BountyComments
