import React, { useState, useEffect } from 'react';
import { NostrService } from '@/services/nostr';
import { useVirto } from '@/contexts/VirtoContext';

interface Comment {
    id: string;
    pubkey: string;
    content: string;
    createdAt: number;
    authorName?: string;
}

interface BountyCommentsProps {
    proposalId: string;
}

const BountyComments: React.FC<BountyCommentsProps> = ({ proposalId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { userAddress } = useVirto();

    useEffect(() => {
        fetchComments();
    }, [proposalId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const fetched = await NostrService.getComments(proposalId);
            // @ts-ignore - NostrService returns generic objects, we map them
            setComments(fetched);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const nameToUse = userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Anonymous';

            await NostrService.publishComment(proposalId, newComment, nameToUse);
            setNewComment('');

            const optimisticComment: Comment = {
                id: 'temp-' + Date.now(),
                pubkey: 'me',
                content: newComment,
                createdAt: Date.now(),
                authorName: nameToUse
            };
            setComments(prev => [optimisticComment, ...prev]);

        } catch (error) {
            console.error("Error publishing comment:", error);
            alert("Failed to post comment");
        } finally {
            setSubmitting(false);
        }
    };

    const timeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="bounty-comments" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: 'white' }}>
                Comments ({comments.length})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        marginBottom: '12px',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                    }}
                    disabled={submitting}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        style={{
                            background: '#22c55e',
                            color: 'black',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting || !newComment.trim() ? 0.6 : 1
                        }}
                    >
                        {submitting ? 'Posting...' : 'Post Comment'}
                    </button>
                </div>
            </form>

            {/* Comments List */}
            <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                    <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Loading comments...</div>
                ) : comments.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No comments yet. Be the first!</div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="comment-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600, color: '#e5e7eb', fontSize: '0.95rem' }}>
                                    {comment.authorName || `${comment.pubkey.slice(0, 8)}...`}
                                </span>
                                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                    {timeAgo(comment.createdAt)}
                                </span>
                            </div>
                            <p style={{ margin: 0, color: '#d1d5db', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                {comment.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BountyComments;
