import connectDB from "@/db/dbConfig";
import User from "@/models/userModel";
import { NextResponse } from "next/server";
import Comment from "@/models/commentModel";

export async function PATCH(req:Request){
    try {
        connectDB();
        const {commentId,newBody}=await req.json()
        const comment=await Comment.findById({commentId})
    
        if(!comment){
            return NextResponse.json(
                {error:"Comment out find"},
                {status:404}
            )
        }
    
        comment.body=newBody
        await comment.save();
    
        return NextResponse.json(
            {message:"Comment updated successfully",comment},
            {status:200}
        )
    } catch (error:any) {
        return NextResponse.json(
            {error:error.message||"Something went wrong"},
            {status:500}
        )
    }   
}