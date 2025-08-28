import Comment from "@/models/commentModel";
import connectDB from "@/db/dbConfig";
import {NextResponse} from "next/server";

export async function GET(req:Request){
    await connectDB();
    const {searchParams}=new URL(req.url);

    const questionId=searchParams.get("questionId");
    const after=searchParams.get("after");
    const limit=parseInt(searchParams.get("limit")||"10");

    const query:any={questionId,parentId:null};
    if(after) query._id={$lt:after}

    const comments = await Comment.find(query).sort({ _id: -1 }).limit(limit);

    const nextCursor=comments.length>0?comments[comments.length-1]._id:null;

    return NextResponse.json({comments,hasMore:comments.length===limit})

}

