import connectDB from "@/db/dbConfig";
import { NextResponse } from "next/server";
import Comment from "@/models/commentModel";

export async function GET(req:Request){
    await connectDB();
    const {searchParams}=new URL(req.url)

    const parentId=searchParams.get("parentId")
    const after=searchParams.get("after")
    const limit=parseInt(searchParams.get("limit")||"5")

    const query:any={parentId};
    if(after) query._id={$lt:after};

    const replies=await Comment.find(query)
    .sort({_id:-1})
    .limit(limit);

    const nextCursor=replies.length>0?replies[replies.length-1]._id:null;

    return NextResponse.json({replies,nextCursor,hasMore:replies.length===limit});
}