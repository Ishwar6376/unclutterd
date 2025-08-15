import  connectDB  from "@/db/dbConfig";
import Question from "@/models/questionModel";
import mongoose from "mongoose";
import { NextResponse } from "next/server";


const LIMIT = 50;

export async function GET(req: Request) {
  try {
    await connectDB();
    console.log("Question Fetch url hitted")
    const { searchParams } = new URL(req.url);
    const after = searchParams.get("after");
    console.log("After",after)
    let filter = {};
    if (after) {
      filter = { _id: { $lt: new mongoose.Types.ObjectId(after) } };
    }

    const questions = await Question.find(filter)
      .sort({ _id: -1 })
      .limit(LIMIT);


    console.log("questions", questions);  
    return NextResponse.json({
      question:questions,
      nextAfter: questions.length ? questions[questions.length - 1]._id : null,
    });
  } catch (err:any) {
    return Response.json({ message: "Error fetching questions", error: err.message }, { status: 500 });
  }
}
