import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/dbConfig";
import User from "@/models/userModel";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    console.log("id", id);
    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }
    const user = await User.findById(id);
    console.log(user);

    const userData = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "questions",
          let: { questionIds: "$questions" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$questionIds"] } } },
            { $sort: { createdAt: -1 } }, // newest first
          ],
          as: "questionsData",
        },
      },
      {
        $lookup: {
          from: "answers",
          let: { answerIds: "$answers" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$answerIds"] } } },
            { $sort: { createdAt: -1 } },
          ],
          as: "answersData",
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { commentIds: "$comments" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$commentIds"] } } },
            { $sort: { createdAt: -1 } },
          ],
          as: "commentsData",
        },
      },
      {
        $project: {
          username: 1,
          email: 1,
          questionsData: 1,
          answersData: 1,
          commentsData: 1,
        },
      },
    ]);

    if (!userData.length) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    console.log(userData);
    return NextResponse.json({ userQ: userData[0], userPersonal: user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
