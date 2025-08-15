// /app/api/getLatestId/route.ts (Next.js 13+ with App Router)
import { NextResponse } from "next/server";
import connectDB  from "@/db/dbConfig";
import Question from "@/models/questionModel"; // example model
export async function GET() {
  try {
    await connectDB();
   const latestPost = await Question.findOne().sort({_id:-1});
    return NextResponse.json({
      latestId: latestPost?._id || null
    });
  } catch (error) {
    console.error("Error fetching latest ID:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
