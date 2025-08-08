import React, { useState } from "react";
import { CommentType } from "@/components/type";

interface CommentListProps {
  parentType: "Question" | "Answer" | "Comment";
  parentId: string;
  comments: CommentType[];
}

export default function CommentList({
  parentType,
  parentId,
  comments
}: CommentListProps) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>("");

  const handleAddComment = (parentCommentId: string | null = null) => {
    console.log("Posting comment:", {
      parentType,
      parentId,
      parentCommentId,
      body: commentText
    });
    setCommentText("");
    setReplyTo(null);
  };

  const renderComments = (commentList: CommentType[], level = 0) =>
    commentList.map((comment) => (
      <div key={comment.id} className="mt-3" style={{ marginLeft: level * 20 }}>
        <div className="bg-gray-100 p-2 rounded">
          <p>{comment.body}</p>
          <div className="text-xs text-gray-500">— {comment.author.username}</div>
          <button
            className="text-blue-500 text-xs mt-1"
            onClick={() => setReplyTo(comment.id)}
          >
            Reply
          </button>
        </div>

        {replyTo === comment.id && (
          <div className="mt-2 flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a reply..."
              className="border p-1 rounded flex-1"
            />
            <button
              onClick={() => handleAddComment(comment.id)}
              className="bg-blue-500 text-white px-2 rounded"
            >
              Post
            </button>
          </div>
        )}

        {comment.replies && renderComments(comment.replies, level + 1)}
      </div>
    ));

  return (
    <div className="mt-4">
      {renderComments(comments)}

      {replyTo === null && (
        <div className="mt-2 flex gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="border p-1 rounded flex-1"
          />
          <button
            onClick={() => handleAddComment()}
            className="bg-blue-500 text-white px-2 rounded"
          >
            Post
          </button>
        </div>
      )}
    </div>
  );
}
