import React from "react";
import { Answer } from "@/components/type";
import CommentList from "@/components/comment/page";

interface AnswerProps {
  answer: Answer;
}

export default function AnswerComponent({ answer }: AnswerProps) {
  return (
    <div className="border-t pt-4 mt-4 ">
      <p className="text-white">{answer.body}</p>
      <div className="text-sm text-orange-500 mt-2">— {answer.author.username}</div>
      <CommentList
        parentType="Answer"
        parentId={answer.id}
        comments={answer.comments}
      />
    </div>
  );
}
