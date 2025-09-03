import connectDB from "@/db/dbConfig";
import Comment from "@/models/commentModel";
import { connect } from "http2";
import { NextResponse } from "next/server";

export async  function DELETE(req:Request){
    try {
        connectDB();

        

        
    } catch (error) {
        
    }
}