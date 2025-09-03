import { useState, useEffect } from "react";
import {
  ChevronUp, 
  ChevronDown, 
  MessageSquare, 
  Bookmark,
  Edit, 
  Trash2, 
  MoreVertical,
  Clock
} from "lucide-react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
type Props = { questionId: string };
import { useUserStore } from "@/store/userStore";
export type CommentType = {
  _id: string;
  body: string;
  author:string;
  votes: number;
  userVote?: number; 
  parentId: string | null;
  createdAt: string;
  updatedAt?: string;
  questionId: string;
  saved?: boolean;
  replyCount?: number;
};

// Utility function
const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function Comment({ questionId }: Props) {
  const User = useUserStore().user;
  const { getAccessTokenSilently } = useAuth0();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentType[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch first batch of top-level comments
  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
  if (!hasMore || loading) return;
  setLoading(true);

  try {
    const token = await getAccessTokenSilently({
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      scope: "openid profile email",
    }as any);
    const res = await axios.get("/api/getComments", {
      params: { questionId, after: cursor, limit: 10 },
      headers: {
        Authorization: `Bearer ${token}`,  // send token
      },
    });

    setComments(prev => {
      // Transform backend response to match frontend CommentType
      const transformed = res.data.comments.map((c: any) => ({
        ...c,
        author: c.author.username, // convert object -> string
        saved: c.saved || false,
        userVote: c.userVote || 0,
      }));

      // Merge with previous comments and deduplicate by _id
      const merged = [...prev, ...transformed];
      return Array.from(new Map(merged.map(c => [c._id, c])).values());
    });

    setCursor(res.data.nextCursor);
    setHasMore(res.data.hasMore);
  } catch (error) {
    console.error("Error fetching comments:", error);
  } finally {
    setLoading(false);
  }
};
  const handleComment = async () => {
    if (!comment.trim() || !User) return;

    try {
      const res = await axios.post("/api/postComment", {
        comment,
        questionId,
        author: User.email,
        parentId: null, // top-level comment
      });

      const newComment: CommentType = {
        ...res.data.newComment,
        author: res.data.newComment.author.username, // convert object → string
        saved: res.data.newComment.saved || false, 
        userVote: 0,
      };


      setComments(prev => {
        const merged = [res.data.newComment, ...prev];
        return Array.from(new Map(merged.map(c => [c._id, c])).values());
      });
      setComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      {/* Comment Input */}
      <div className="border-b border-gray-700 bg-gray-800 p-4">
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
            {User?.username ? User.username[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What are your thoughts?"
              className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-400 resize-none min-h-[80px] focus:border-orange-500 focus:outline-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleComment}
                disabled={!comment.trim()}
                aria-disabled={!comment.trim()}
                className="px-4 py-1.5 bg-orange-600 text-white rounded-full text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="divide-y divide-gray-800">
        {comments.length===0?(
          <p className="p-4 text-gray-400 text-center">No comments yet.</p>
        ):(
        comments.map(c => (
          <CommentItem key={c._id} comment={c} />
        ))
      )}
      </div>

      {/* Load More */}
      {hasMore && comments.length>0&&(
        <div className="p-4 text-center">
          <button
            onClick={fetchComments}
            disabled={loading}
            aria-disabled={loading}
            className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Comments'}
          </button>
        </div>
      )}
    </div>
  );
}

// Recursive component to display each comment and its replies
function CommentItem({ comment }: { comment: CommentType }) {
  const User = useUserStore().user;
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentType[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [votes, setVotes] = useState(comment.votes);
  const [userVote, setUserVote] = useState(comment.userVote || 0);
  const [reply, setReply] = useState("");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [saved, setSaved] = useState(comment.saved || false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [showActions, setShowActions] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  // Fetch replies for this comment
  const fetchReplies = async () => {
    if (!hasMore) return;

    try {
      const token = await getAccessTokenSilently();
      const res = await axios.get("/api/getReplies", {
        
        params: { parentId: comment._id, after: cursor, limit: 5 },
        headers: {
        Authorization: `Bearer ${token}`,  // send token
      },
      });
      setReplies(prev => {
      const transformedReplies = res.data.comments.map((c: any) => ({
        ...c,
        author: c.author.username,
        saved: c.saved || false,
        userVote: c.userVote || 0,
      }));

      // Merge with previous comments and deduplicate by _id
      const merged = [...prev, ...transformedReplies];
      return Array.from(new Map(merged.map(c => [c._id, c])).values());
    });
      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch (error) {
      console.error("Error fetching replies:", error);
    }
  };

  // Handle upvote/downvote
  const handleVote = async (value:number) => {
    if (!User.email) return;
    try {
      const res = await axios.patch("/api/votes", {
        commentId: comment._id,
        userId:User.email,
        value
      });
      setVotes(res.data.updatedComment.votes);
      setUserVote(res.data.userVote);
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  // Handle posting a reply
  const handleReply = async () => {
    if (!reply.trim() || !User) return;

    try {
      const res = await axios.post("/api/postComment", {
        comment: reply,
        parentId: comment._id,
        questionId: comment.questionId,
        votes: 0,
        author: User,
      });

      const newComment: CommentType = {
        ...res.data.newComment,
        author: res.data.newComment.author.username, // convert object → string
        saved: res.data.newComment.saved || false,
        userVote: 0,
      };

      setReplies(prev => {
        const merged = [res.data.newComment, ...prev];
        return Array.from(new Map(merged.map(r => [r._id, r])).values());
      });
      setReply("");
      setShowReplyBox(false);
      setShowReplies(true);
    } catch (error) {
      console.error("Error posting reply:", error);
    }
  };

  // Handle save/unsave(bookmark)
  const handleSave = async () => {
  if (!User) return;

  try {
    const token = await getAccessTokenSilently;
    await axios.patch(
      "/api/saveComment",
      { commentId: comment._id, saved: !saved },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setSaved(!saved);
  } catch (error) {
    console.error("Error saving comment:", error);
  }
};


  // Handle edit
  const handleEdit = async () => {
    if (!User || !editText.trim()) return;

    try {
      await axios.patch("/api/editComment", {
        commentId: comment._id,
        newBody: editText.trim()
      });
      setIsEditing(false);
      comment.body = editText.trim(); // Update local state
    } catch (error) {
      console.error("Error editing comment:", error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!User) return;

    try {
      await axios.delete("/api/deleteComment", {
         data:{commentId: comment._id}
      });
      // Comment will be removed/marked as deleted by parent component
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const isOwnComment = User && comment.author === User.username;

  return (
    <div
      className="p-4 hover:bg-gray-850 transition-colors"
      style={{
        marginLeft: comment.parentId ? 20 : 0,
      }}
    >
      {/* Comment Header */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
          {comment.author[0]?.toUpperCase() || 'U'}
        </div>
        <span className="font-medium text-gray-200">{comment.author}</span>
        <span className="text-gray-500">•</span>
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-3 h-3" />
          {getTimeAgo(comment.createdAt)}
        </div>
        {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
          <>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 text-xs">edited</span>
          </>
        )}
      </div>

      {/* Comment Body */}
      <div className="mb-3">
        {isEditing ? (
          <div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white min-h-[80px] focus:border-orange-500 focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              <button 
                onClick={handleEdit}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                Save
              </button>
              <button 
                onClick={() => {setIsEditing(false); setEditText(comment.body);}}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">
            {comment.body}
          </p>
        )}
      </div>

      {/* Voting and Actions */}
      <div className="flex items-center gap-1">
        {/* Vote Buttons */}
        <div className="flex items-center bg-gray-800 rounded">
          <button
            onClick={() => handleVote(1)}
            className={`p-1.5 rounded-l transition-colors ${
              userVote === 1 ? 'text-orange-500 bg-gray-700' : 'text-gray-400 hover:text-orange-400 hover:bg-gray-700'
            }`}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className={`px-3 text-sm font-medium min-w-[40px] text-center ${
            userVote === 1 ? 'text-orange-500' : 
            userVote === -1 ? 'text-blue-500' : 'text-gray-300'
          }`}>
            {votes}
          </span>
          <button
            onClick={() => handleVote(-1)}
            className={`p-1.5 rounded-r transition-colors ${
              userVote === -1 ? 'text-blue-500 bg-gray-700' : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Reply Button */}
        <button
          onClick={() => setShowReplyBox(!showReplyBox)}
          className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:bg-gray-700 rounded transition-colors text-sm"
        >
          <MessageSquare className="w-4 h-4" />
          Reply
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors text-sm ${
            saved ? 'text-yellow-500 bg-gray-700' : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          {saved ? 'Saved' : 'Save'}
        </button>

        {/* More Actions (Edit/Delete for own comments) */}
        {isOwnComment && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 text-gray-400 hover:bg-gray-700 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 min-w-[120px]">
                <button 
                  onClick={() => {setIsEditing(true); setShowActions(false);}}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button 
                  onClick={() => {handleDelete(); setShowActions(false);}}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply Input */}
      {showReplyBox && (
        <div className="mt-3 ml-8">
          <div className="flex gap-2">
            <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              {User?.username ? User.username[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 resize-none min-h-[60px] focus:border-orange-500 focus:outline-none text-sm"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleReply}
                  disabled={!reply.trim()}
                  className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  Reply
                </button>
                <button
                  onClick={() => {setShowReplyBox(false); setReply("");}}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show Replies Button */}
      {(comment.replyCount || replies.length) > 0 && (
        <button
          onClick={() => {
            setShowReplies(!showReplies);
            if (!showReplies && replies.length === 0) fetchReplies();
          }}
          className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <MessageSquare className="w-4 h-4" />
          {showReplies ? 'Hide' : 'Show'} {comment.replyCount || replies.length} {(comment.replyCount || replies.length) === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {/* Nested Replies */}
      {showReplies && (
        <div className="mt-2 border-l-2 border-gray-700 pl-4">
          {replies.map(r => (
            <CommentItem key={r._id} comment={r} />
          ))}
          
          {/* Load More Replies */}
          {hasMore && (
            <button
              onClick={fetchReplies}
              className="mt-2 px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition-colors"
            >
              Load more replies
            </button>
          )}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showActions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}