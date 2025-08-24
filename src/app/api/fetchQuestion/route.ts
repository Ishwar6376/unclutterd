import connectDB from "@/db/dbConfig";
import Question from "@/models/questionModel";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");
  const limit = parseInt(searchParams.get("limit") || "20");

  const query: any = {};
  if (after) {
    query._id = { $lt: after }; // only older posts
  }

  const questions = await Question.find(query)
    .sort({ _id: -1 }) // newest first
    .limit(limit);

  // Find the next cursor
  const nextCursor =
    questions.length > 0 ? questions[questions.length - 1]._id : null;

  return NextResponse.json({
    data: questions,
    nextCursor,
    hasMore: questions.length === limit,
  });
}
