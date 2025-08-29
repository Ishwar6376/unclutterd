
import connectDB from "@/db/dbConfig";
import Comment from "@/models/commentModel";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  await connectDB();

  const { commentId, delta } = await req.json();
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { $inc: { votes: delta } },
    { new: true }
  );

  if (!updatedComment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ updatedComment });
}
