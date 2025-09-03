import connectDB from "@/db/dbConfig";
import { NextResponse } from "next/server";
import Comment from "@/models/commentModel";
import Vote from "@/models/voteModel";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import User from "@/models/userModel";
import Saved from "@/models/savedModel";
import mongoose from "mongoose";

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function (err, key: any) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  const after = searchParams.get("after");
  const limit = parseInt(searchParams.get("limit") || "5");

  // 🔐 Extract JWT from Authorization header
  const authHeader = req.headers.get("authorization");
  let user: any = null;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded: any = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          getKey,
          {
            audience: process.env.AUTH0_AUDIENCE,
            issuer: `https://${process.env.AUTH0_DOMAIN}/`,
            algorithms: ["RS256"],
          },
          (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
          }
        );
      });

      const email = decoded.email;
      const username = decoded.name || (email ? email.split("@")[0] : "guest");
      const avatar = decoded.picture || null;
      user = await User.findOne({ email });
      if (email) {
        user = await User.findOneAndUpdate(
          { email },
          { email, username, avatar },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.error("JWT verification failed:", err);
    }
  }

  // 📌 Build query for replies
  const query: any = { parentId };
  if (after) query._id = { $lt: after };

  const replies = await Comment.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .populate("author", "username avatar")

  // 🗳️ Get user votes for these replies
  let userVotes: Record<string, number> = {};
  let savedSet = new Set<string>(); 
  if (user) {
    const votes = await Vote.find({
      userId: user._id,
      commentId: { $in: replies.map((r) => r._id) },
    });

    userVotes = votes.reduce((acc, v) => {
      acc[v.commentId.toString()] = v.value;
      return acc;
    }, {} as Record<string, number>);

    const savedDocs = await Saved.find({
      userId: user._id,
      commentId: { $in: replies.map((r) => r._id) },
    }).select("commentId") as { commentId: mongoose.Types.ObjectId }[];
    
    savedSet = new Set(savedDocs.map((s) => s.commentId.toString()));
  }

  // 📝 Transform replies for frontend
  const results = replies.map((r) => ({
    ...r,
    userVote: userVotes[r._id.toString()] || 0,
    saved: savedSet.has(r._id.toString()),
  }));

  const nextCursor = replies.length > 0 ? replies[replies.length - 1]._id : null;

  return NextResponse.json({
    replies: results,
    hasMore: replies.length === limit,
    nextCursor,
  });
}
