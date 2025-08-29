// comment.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useUserStore } from "@/store/userStore";

type Props = { questionId: string };

export type CommentType = {
  _id: string;
  body: string;
  author: string;
  votes: number;
  parentId: string | null;
  createdAt: string;
};

export default function Comment({ questionId }: Props) {
  const User = useUserStore().user;
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentType[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch first batch of top-level comments
  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    if (!hasMore) return;

    const res = await axios.get("/api/getComments", {
      params: { questionId, after: cursor, limit: 10 },
    });

    setComments(prev => [...prev, ...res.data.comments]);
    setCursor(res.data.nextCursor);
    setHasMore(res.data.hasMore);
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    const res = await axios.post("/api/postComment", {
      comment,
      questionId,
      votes: 0,
      author: User,
    });

    setComments(prev => [res.data.newComment, ...prev]); // prepend new comment
    setComment(""); // clear input
  };

  return (
    <div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Add a comment..."
        className="w-full p-2 border rounded mb-2"
      />
      <button onClick={handleComment} className="px-4 py-2 bg-blue-500 text-white rounded mb-4">
        Post
      </button>

      <div className="space-y-2">
        {comments.map(c => (
          <CommentItem key={c._id} comment={c} />
        ))}
      </div>

      {hasMore && (
        <button onClick={fetchComments} className="mt-2 px-4 py-2 bg-gray-700 text-white rounded">
          Load More
        </button>
      )}
    </div>
  );
}

// Recursive component to display each comment and its replies
function CommentItem({ comment }: { comment: CommentType }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentType[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [votes, setVotes] = useState(comment.votes);

  // Fetch replies for this comment
  const fetchReplies = async () => {
    const res = await axios.get("/api/replies", {
      params: { parentId: comment._id, after: cursor, limit: 5 },
    });

    setReplies(prev => [...prev, ...res.data.replies]);
    setCursor(res.data.nextCursor);
    setHasMore(res.data.hasMore);
  };

  // Handle upvote/downvote
  const handleVote = async (delta: number) => {
    try {
      const res = await axios.patch("/api/comment/vote", {
        commentId: comment._id,
        delta,
      });
      setVotes(res.data.updatedComment.votes);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      style={{
        marginLeft: comment.parentId ? 20 : 0,
        borderBottom: "1px solid #333",
        padding: "8px 0",
      }}
    >
      <p className="mb-1">{comment.body}</p>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => handleVote(1)} className="px-2 bg-green-500 text-white rounded">👍</button>
        <span>{votes}</span>
        <button onClick={() => handleVote(-1)} className="px-2 bg-red-500 text-white rounded">👎</button>
        <button
          onClick={() => {
            setShowReplies(!showReplies);
            if (!showReplies && replies.length === 0) fetchReplies();
          }}
          className="px-2 bg-gray-600 text-white rounded"
        >
          {showReplies ? "Hide Replies" : `View Replies (${replies.length})`}
        </button>
      </div>

      {showReplies &&
        replies.map(r => <CommentItem key={r._id} comment={r} />)}

      {showReplies && hasMore && (
        <button onClick={fetchReplies} className="mt-1 px-2 py-1 bg-gray-700 text-white rounded">
          Load more replies
        </button>
      )}
    </div>
  );
}
