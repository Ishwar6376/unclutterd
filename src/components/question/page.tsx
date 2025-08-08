import React from "react";
import { Question } from "@/components/type";
import AnswerComponent from "@/components/answer/page";
import CommentList from "@/components/comment/page";

interface QuestionProps {
  question: Question;
}

export default function QuestionComponent({ question }: QuestionProps) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow">
      <h1 className="text-2xl font-bold">{question.title}</h1>
      <p className="text-gray-700 mt-2">{question.body}</p>

      <div className="flex gap-2 mt-3">
        {question.tags.map((tag, idx) => (
          <span
            key={idx}
            className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      <CommentList
        parentType="Question"
        parentId={question.id}
        comments={question.comments}
      />

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Answers</h2>
        {question.answers.map((answer) => (
          <AnswerComponent key={answer.id} answer={answer} />
        ))}
      </div>
    </div>
  );
}
