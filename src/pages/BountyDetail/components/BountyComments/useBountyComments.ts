import { useState, useEffect, useCallback } from "react"
import { NostrService } from "@/services/nostr"
import { useVirto } from "@/contexts/VirtoContext"
import { NostrComment } from "@/types/nostr"

export const useBountyComments = (proposalId: string) => {
  const [comments, setComments] = useState<NostrComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { userAddress } = useVirto()

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const fetched = await NostrService.getComments(proposalId)
      setComments(fetched)
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoading(false)
    }
  }, [proposalId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const nameToUse = userAddress
        ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
        : "Anonymous"

      await NostrService.publishComment(proposalId, newComment, nameToUse)
      setNewComment("")

      const optimisticComment: NostrComment = {
        id: "temp-" + Date.now(),
        pubkey: "me",
        content: newComment,
        createdAt: Date.now(),
        authorName: nameToUse,
      }
      setComments((prev) => [optimisticComment, ...prev])
    } catch (error) {
      console.error("Error publishing comment:", error)
      alert("Failed to post comment")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    comments,
    newComment,
    loading,
    submitting,
    setNewComment,
    handleSubmit,
  }
}
