import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/dbConfig";
import Question from "@/models/questionModel";
export async function POST(req:NextRequest){
    await connectDB();
    const body=await req.json();
    const search=body.search;
    

    const res=await Question.aggregate([
    {
        $search: {
        index: "default",
        text: {
            query:search,
            path: ["title", "description", "tags"]
        }
        }
    }
    ]);
    return NextResponse.json(res);

}