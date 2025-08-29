import Comment from "@/models/commentModel";
import connectDB from "@/db/dbConfig";
import Question from "@/models/questionModel";
import { NextResponse } from "next/server";

export async function POST(req:Request){
    await connectDB();
    const {comment,questionId,votes,author,parentId}=await req.json();

    const newComment=await Comment.create({
        body:comment,
        questionId,
        votes,
        author,
        parentId:parentId||null,
    })

    return NextResponse.json({
        message:"Comments Added",
        newComment
    }) 
}