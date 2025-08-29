import connectDB from "@/db/dbConfig";
import { NextRequest, NextResponse } from "next/server";
import Question from "@/models/questionModel";
export async function POST(req:NextRequest) {
    await connectDB();
    
    const body=await req.json();
    // console.log("Body",body);
    const q_id=body.id;
    // console.log("Question ID",q_id)
    const que=await Question.findById(q_id);
    // console.log(que);
    return NextResponse.json({Question:que});

}