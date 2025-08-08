// types.ts
export interface User {
  id: string;
  username: string;
}

export interface CommentType {
  id: string;
  body: string;
  author: User;
  replies?: CommentType[];
}

export interface Answer {
  id: string;
  body: string;
  author: User;
  comments: CommentType[];
}

export interface Question {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author: User;
  comments: CommentType[];
  answers: Answer[];
}
