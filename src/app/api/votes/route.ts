import connectDB from "@/db/dbConfig";
import Comment from "@/models/commentModel";
import { NextResponse } from "next/server";
import Vote from "@/models/voteModel";
import User from "@/models/userModel";

export async function PATCH(req: Request) {
  await connectDB();

  const { commentId, userId,value } = await req.json();
  const mongodbuserid=await User.findOne({userId})
  
  const existingVote=await Vote.findOne({userId,commentId});
  let delta=0;
  if(!existingVote && value!==0){
    await Vote.create({mongodbuserid,commentId,value});
    delta=value;
  }
  else if(existingVote && value==0){
    delta=-existingVote.value;
    await existingVote.deleteOne();
  }
  else if(existingVote && existingVote.value!==value){
    delta=value-existingVote.value;
    existingVote.value=value;
    await existingVote.save();
  }
  const updatedComment=await Comment.findByIdAndUpdate(
    commentId,
    {$inc:{votes:delta}},
    {new:true}
  );

  return NextResponse.json({
    updatedComment,
    userVote:value
  })
  
}
