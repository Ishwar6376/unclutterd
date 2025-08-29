"use client"
import { div } from "framer-motion/client";
import { useState } from "react";

interface CommentType {
  body: string;
}

export default function Comment() {
  const dummyComment: Array<CommentType> = [
    {body: "This is comment 1" },
    {body: "This is comment 2" },
    {body: "This is comment 3" },
    {body: "This is comment 4" },
  ];
  const onComment=()=>{
    const newComment:CommentType={
      body:commentBody
    }
    comments.push(newComment)
    setCommentBody('');
  }

  const [comments, setComments] = useState(dummyComment);
  const [commentBody,setCommentBody]=useState('')
  return (
    <div className="w-screen h-screen p-5 text-white">
      <span className="text-xl font-bold">Nested Comments</span>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          className="w-3/4 border bg-black text-white mt-5 rounded-md p-2"
          placeholder="What's your thought?"
          value={commentBody}
          onChange={event=>setCommentBody(event.target.value)}
        />
        <button className="border w-20 rounded-md p-1 hover:bg-gray-700"
        onClick={onComment}
        >
          Comment
        </button>
      </div>

      <div className="mt-5 space-y-2 ">
        {comments.map((comment) => (
          <div className="border rounded-md w-3/4 p-2">
            {comment.body}
          </div>
        ))}
      </div>
    </div>
  );
}
