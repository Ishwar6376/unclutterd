import connectDB from "@/db/dbConfig";
import User from "@/models/userModel";
import Comment from "@/models/commentModel";
import Vote from "@/models/voteModel";
import Saved from "@/models/savedModel";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
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
  const questionId = searchParams.get("questionId");
  const after = searchParams.get("after");
  const limit = parseInt(searchParams.get("limit") || "10");

  // 🔐 Extract JWT
  const authHeader = req.headers.get("authorization");
  let user = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    if (token && token.split(".").length === 3) {
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

        const email = decoded.email || null;
        const username = decoded.name || (email ? email.split("@")[0] : "guest");
        const avatar = decoded.picture || null;

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
  }

  // 📌 Build query for comments
  const query: any = { questionId, parentId: null };
  if (after) query._id = { $lt: after };

  const comments = await Comment.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .populate("author", "username avatar")

  // 🗳️ User votes + saved
  let userVotes: Record<string, number> = {};
  let savedSet = new Set<string>(); // ✅ declare outside

  if (user) {
    // Votes
    const votes = await Vote.find({
      userId: user._id,
      commentId: { $in: comments.map((c) => c._id) },
    });

    userVotes = votes.reduce((acc, v) => {
      acc[v.commentId.toString()] = v.value;
      return acc;
    }, {} as Record<string, number>);

    // Saved
    const savedDocs = await Saved.find({
      userId: user._id,
      commentId: { $in: comments.map((c) => c._id) },
    }).select("commentId") as { commentId: mongoose.Types.ObjectId }[];

    savedSet = new Set(savedDocs.map((s) => s.commentId.toString()));
  }

  // 📝 Attach `userVote` + `saved`
  const results = comments.map((c) => ({
    ...c,
    userVote: userVotes[c._id.toString()] || 0,
    saved: savedSet.has(c._id.toString()),
  }));

  const nextCursor =
    comments.length > 0 ? comments[comments.length - 1]._id : null;

  return NextResponse.json({
    comments: results,
    hasMore: comments.length === limit,
    nextCursor,
  });
}
