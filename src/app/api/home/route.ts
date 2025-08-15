import connectDB from "@/db/dbConfig"
import { NextResponse } from "next/server";
export async function GET(){
  await connectDB();
  return NextResponse.json({message:"hello from backend"},{status:200})
    
}