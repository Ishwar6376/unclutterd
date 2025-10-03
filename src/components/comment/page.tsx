"use client"
import { useState, useEffect, useRef } from "react";
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
  authorId:string;
  authorName:string;
  authorEmail: string;
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
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentType[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const {getAccessTokenSilently}=useAuth0();
  const hasFetched=useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Fetch first batch of top-level comments
  useEffect(() => {
    if(!hasFetched.current){
      hasFetched.current=true;
      fetchComments();
    }
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          fetchComments();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTrigger = loadMoreTriggerRef.current;
    if (currentTrigger) {
      observerRef.current.observe(currentTrigger);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, cursor]);

  const handleCommentDelete = (deletedCommentId: string) => {
    setComments(prev =>
      prev.map(c =>
        c._id === deletedCommentId
          ? { ...c, body: "[deleted]", authorName: "[deleted]" }
          : c
      )
    );
  };

  const handleCommentEdit = (editedCommentId: string, newBody: string, newUpdatedAt?: string) => {
    setComments(prev =>
      prev.map(c =>
        c._id === editedCommentId
          ? { ...c, body: newBody, updatedAt: newUpdatedAt ?? new Date().toISOString() }
          : c
      )
    );
  };

  const fetchComments = async () => {
    if (!hasMore || loading) return;
    setLoading(true);

    try {
      const token = await getAccessTokenSilently({
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email",
      } as any);

      const res = await axios.get("/api/getComments", {
        params: { questionId, after: cursor, limit: 10 },
        headers: { Authorization: `Bearer ${token}` },
      });

      setComments(prev => {
        const transformed = res.data.comments.map((c: any) => ({
          ...c,
          saved: c.saved ?? false,
          userVote: c.userVote ?? 0,
        }));

        const merged = [...prev, ...transformed];

        // Optional deduplication
        return Array.from(new Map(merged.map(c => [c._id, c])).values());
      });

      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
      hasFetched.current=false;
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !User) return;

    const tempId = `temp-${Date.now()}`;
    const tempComment: CommentType = {
      _id: tempId,
      body: comment,
      authorId: User._id.toString(),
      authorName:User.username,
      authorEmail: User.email,
      votes: 0,
      userVote: 0,
      saved: false,
      parentId: null,
      questionId,
      createdAt: new Date().toISOString(),
      updatedAt:new Date()?.toISOString(),
    };

    setComments(prev => [tempComment, ...prev]);
    setComment("");

    try {
      const token = await getAccessTokenSilently({
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      scope: "openid profile email",
    } as any);
      const res = await axios.post("/api/postComment", {
        comment: tempComment.body,
        questionId: tempComment.questionId,
        parentId: null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newComment: CommentType = {
        ...res.data.newComment,
        author: res.data.newComment.name,
        authorEmail:res.data.newComment.email,
        saved: res.data.newComment.saved || false,
        userVote: res.data.newComment.userVote,
      };

      setComments(prev => prev.map(c => c._id === tempId ? newComment : c));
    } catch (error) {
      console.error("Error posting comment:", error);
      setComments(prev => prev.filter(c => c._id !== tempId));
    }
  };

  return (
    <div className="bg-gray-900 h-screen text-white w-[400px] flex flex-col overflow-hidden"> 
      {/* Comment Input - Fixed at top */}
      <div className="border-b border-gray-700 bg-gray-800 p-4 flex-shrink-0">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            {User?.avatar ? (<img src={User.avatar} alt={User?.username || "Avatar"} className="w-full h-full object-cover"/>) : (
              <div className="w-full h-full bg-orange-600 flex items-center justify-center text-white font-bold">
                {User?.username?.charAt(0) || "U"}
              </div>)}
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

      {/* Comments List - Scrollable area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="divide-y divide-gray-800">
          {comments.length === 0 && !loading ? (
            <p className="p-4 text-gray-400 text-center">No comments yet.</p>
          ) : (
            comments.map((c) => (
              <CommentItem
                key={c._id}
                comment={c}
                onDelete={handleCommentDelete}
                onEdit={handleCommentEdit}
              />
            ))
          )}

          {/* Intersection observer trigger */}
          {hasMore && comments.length > 0 && (
            <div ref={loadMoreTriggerRef} className="h-20 flex items-center justify-center">
              {loading && (
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              )}
            </div>
          )}

          {/* End of comments message */}
          {!hasMore && comments.length > 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No more comments
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type CommentItemProps = {
  comment: CommentType;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, newBody: string, newUpdatedAt?: string) => void;
};

// Recursive component to display each comment and its replies
function CommentItem({ comment, onDelete, onEdit}: CommentItemProps ) {
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
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState<string>(comment.body);
  const [localUpdatedAt, setLocalUpdatedAt] = useState<string | undefined>(comment.updatedAt ?? comment.createdAt);
  const { getAccessTokenSilently } = useAuth0();
  const replyObserverRef = useRef<IntersectionObserver | null>(null);
  const replyLoadMoreTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBody(comment.body);
    setLocalUpdatedAt(comment.updatedAt ?? comment.createdAt);
    setEditText(comment.body);
  }, [comment.body, comment.updatedAt, comment.createdAt]);

  // Intersection Observer for replies infinite scroll
  useEffect(() => {
    if (!showReplies) return;

    if (replyObserverRef.current) replyObserverRef.current.disconnect();

    replyObserverRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          fetchReplies(false);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    const currentTrigger = replyLoadMoreTriggerRef.current;
    if (currentTrigger) {
      replyObserverRef.current.observe(currentTrigger);
    }

    return () => {
      if (replyObserverRef.current) {
        replyObserverRef.current.disconnect();
      }
    };
  }, [showReplies, hasMore, loading, cursor]);

  const handleReplyDelete = (deletedReplyId: string) => {
    setReplies(prev =>
      prev.map(r =>
        r._id === deletedReplyId
          ? { ...r, body: "[deleted]", authorName: "[deleted]" }
          : r
      )
    );
  };

  const handleReplyEdit = (replyId: string, newBody: string, newUpdatedAt?: string) => {
    setReplies(prev =>
      prev.map(r =>
        r._id === replyId
          ? { ...r, body: newBody, updatedAt: newUpdatedAt ?? new Date().toISOString() }
          : r
      )
    );
  };

  // Fetch replies for this comment
  const fetchReplies = async (reset = false) => {
    if ((!hasMore || loading) && !reset) {
      return;
    }

    if (reset) {
      setReplies([]);
      setCursor(null);
      setHasMore(true);
    }

    setLoading(true);

    try {
      const token = await getAccessTokenSilently({
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email",
      } as any);

      const res = await axios.get("/api/getReplies", {
        params: { parentId: comment._id, after: reset ? null : cursor, limit: 5 },
        headers: { Authorization: `Bearer ${token}` },
      });

      setReplies(prev => {
        const transformed = res.data.replies.map((c: any) => ({
          ...c,
          saved: c.saved || false,
          userVote: c.userVote || 0,
        }));

        const merged = [...(reset ? [] : prev), ...transformed];
        return Array.from(new Map(merged.map(c => [c._id, c])).values());
      });

      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);

    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle upvote/downvote
  const handleVote = async (value: -1 | 1) => {
    if (!User) return;

    const prevVotes = votes;
    const prevUserVote = userVote;

    let newVote: -1 | 0 | 1 = value;
    if (userVote === value) {
      newVote = 0;
    }

    const newVotes = votes - userVote + newVote;

    setUserVote(newVote);
    setVotes(newVotes);

    try {
      const token = await getAccessTokenSilently({
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email",
      } as any);

      const res = await axios.patch(
        "/api/votes",
        {
          commentId: comment._id,
          value: newVote,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setVotes(res.data.updatedComment.votes);
      setUserVote(res.data.userVote);
    } catch (error) {
      console.error("Error voting:", error);
      setVotes(prevVotes);
      setUserVote(prevUserVote);
    }
  };

  // Handle posting a reply
  const handleReply = async () => {
    if (!reply.trim() || !User) return;

    const tempId = `temp-${Date.now()}`;
    const tempReply: CommentType = {
      _id: tempId,
      body: reply,
      authorId:User._id.toString(),
      authorName: User.username,
      authorEmail:User.email,
      votes: 0,
      userVote: 0,
      saved: false,
      parentId: comment._id,
      replyCount: 0,
      questionId: comment.questionId,
      createdAt: new Date().toISOString(),
    };

    setReplies(prev => [tempReply, ...prev]);
    setReply("");
    setShowReplies(true);
    comment.replyCount=(comment.replyCount||0)+1;
    
    try{
      const token = await getAccessTokenSilently({
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      scope: "openid profile email",
    } as any);
      const res = await axios.post("/api/postComment", {
        comment: tempReply.body,
        parentId: tempReply.parentId,
        questionId: tempReply.questionId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newReply: CommentType = {
        ...res.data.newComment,
        author: res.data.newComment.authorName,
        authorEmail:res.data.newComment.authorEmail,
        saved: res.data.newComment.saved || false,
        userVote: 0,
      };

      setReplies(prev => prev.map(r => r._id === tempId ? newReply : r));
    } catch (error) {
      console.error("Error posting reply:", error);
      setReplies(prev => prev.filter(r => r._id !== tempId));
    }
  };

  // Handle save/unsave(bookmark)
  const handleSave = async () => {
    if (!User) return;

    const newSaved = !saved;
    setSaved(newSaved);

    try {
      const token = await getAccessTokenSilently({
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email",
      } as any);

      await axios.patch(
        "/api/saveComment",
        { commentId: comment._id, saved: newSaved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Error saving comment:", error);
      setSaved(prev => !prev);
    }
  };

  // Handle edit
  const handleEdit = async () => {
    if (!User || !editText.trim()) return;

    const previousBody = body;
    const previousUpdatedAt = localUpdatedAt;

    const newBody = editText.trim();
    const optimisticUpdatedAt = new Date().toISOString();

    setBody(newBody);
    setLocalUpdatedAt(optimisticUpdatedAt);
    setIsEditing(false);

    try {
      onEdit?.(comment._id, newBody, optimisticUpdatedAt);
    } catch {
      /* ignore parent errors */
    }

    try {
      const token = await getAccessTokenSilently({
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email",
      } as any);

      const res = await axios.patch(
        "/api/editComment",
        {
          commentId: comment._id,
          newBody,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.comment) {
        setBody(res.data.comment.body);
        setLocalUpdatedAt(res.data.comment.updatedAt ?? optimisticUpdatedAt);
        try { onEdit?.(comment._id, res.data.comment.body, res.data.comment.updatedAt); } catch {}
      }
    } catch (error) {
      console.error("Error editing comment:", error);
      setBody(previousBody);
      setLocalUpdatedAt(previousUpdatedAt);
      setIsEditing(true);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!User) return;

    try {
      const token = await getAccessTokenSilently({
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email",
      } as any);

      await axios.delete("/api/deleteComment", {
        data: { commentId: comment._id },
        headers: { Authorization: `Bearer ${token}` },
      });

      onDelete(comment._id);

    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const toggleReplies = async () => {
    const nextShow = !showReplies;
    setShowReplies(nextShow);

    if (nextShow) {
      try {
        await fetchReplies(true);
      } catch (err) {
        console.error("Error fetching replies:", err);
      }
    }
  };

  const isOwnComment = User && comment.authorName === User.username;

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
          {comment.authorName?.[0].toUpperCase() || 'U'}
        </div>
        <span className="font-medium text-gray-200">{comment.authorName}</span>
        <span className="text-gray-500">•</span>
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-3 h-3" />
          {getTimeAgo(comment.createdAt)}
        </div>
        {localUpdatedAt && localUpdatedAt !== comment.createdAt && (
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
          <p className={`text-gray-100 whitespace-pre-wrap leading-relaxed ${body === "[deleted]" ? "italic text-gray-500" : ""}`}>
            {body}
          </p>
        )}
      </div>

      {/* Voting and Actions */}
      {body !== "[deleted]" &&(<div  className="flex items-center gap-1">
        {/* Vote Buttons */}
        <div className="flex items-center bg-gray-800 rounded">
          <button
            onClick={() => handleVote(1)}
            className={`p-1.5 rounded-l transition-colors ${
              userVote === 1
                ? 'text-orange-500 bg-gray-700'
                : 'text-gray-400 hover:text-orange-400 hover:bg-gray-700'
            }`}
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <span
            className={`px-3 text-sm font-medium min-w-[40px] text-center ${
              userVote === 1
                ? 'text-orange-500'
                : userVote === -1
                ? 'text-blue-500'
                : 'text-gray-300'
            }`}
          >
            {votes}
          </span>

          <button
            onClick={() => handleVote(-1)}
            className={`p-1.5 rounded-r transition-colors ${
              userVote === -1
                ? 'text-blue-500 bg-gray-700'
                : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
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
      </div>)}

      {/* Reply Input */}
      {showReplyBox && (
        <div className="mt-3 ml-8">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            {User?.avatar ? (<img src={User.avatar} alt={User?.username || "Avatar"} className="w-full h-full object-cover"/>) : (
              <div className="w-full h-full bg-orange-600 flex items-center justify-center text-white font-bold">
                {User?.username?.charAt(0) || "U"}
              </div>)}
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
        <button onClick={toggleReplies} className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1" >
          <MessageSquare className="w-4 h-4" />
          {showReplies ? 'Hide' : 'Show'} {comment.replyCount || replies.length} {(comment.replyCount || replies.length) === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {/* Nested Replies */}
      {showReplies && (
        <div className="mt-2 border-l-2 border-gray-700 pl-4">
          {replies.map(r => (
            <CommentItem
              key={r._id}
              comment={r}
              onDelete={handleReplyDelete}
              onEdit={handleReplyEdit}
            />
          ))}
          
          {/* Intersection observer trigger for replies */}
          {hasMore && replies.length > 0 && (
            <div ref={replyLoadMoreTriggerRef} className="h-16 flex items-center justify-center">
              {loading && (
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
              )}
            </div>
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