// postComment.ts
import Comment from "@/models/commentModel";
import User from "@/models/userModel";
import connectDB from "@/db/dbConfig";
import { NextResponse } from "next/server";
import redis from "@/utils/reddis";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import mongoose from "mongoose";

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
});

const jwksCache: Record<string, string> = {};

function getKey(header: any, callback: any) {
  const cachedKey = jwksCache[header.kid];
  if (cachedKey) return callback(null, cachedKey);

  client.getSigningKey(header.kid, (err, key: any) => {
    if (err) return callback(err);
    const pubKey = key.getPublicKey();
    jwksCache[header.kid] = pubKey;
    callback(null, pubKey);
  });
}

export async function POST(req: Request) {
  await connectDB();

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  let user: any = null;

  try {
    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
          algorithms: ["RS256"],
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    const auth0Id = decoded.sub;

    const cachedUser = await redis.get(`user:${auth0Id}`);
    if (cachedUser) {
      user = JSON.parse(cachedUser);
      user._id = new mongoose.Types.ObjectId(user._id);
    } else {
      user = await User.findOne({ auth0Id });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
      await redis.set(
        `user:${auth0Id}`,
        JSON.stringify({
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
        })
      );
      await redis.expire(`user:${auth0Id}`, 3600);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { comment, questionId, parentId } = await req.json();
  if (!comment || (!questionId && !parentId)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const newComment = await Comment.create({
    body: comment,
    questionId: questionId || undefined,
    parentId: parentId || null,
    votes: 0,
    author: user._id,
    authorName: user.username,
    authorEmail: user.email,
    replyCount: 0,
  });

  const commentData = {
    _id: newComment._id.toString(),
    body: newComment.body,
    authorId: user._id.toString(),
    authorName: newComment.authorName,
    authorEmail: newComment.authorEmail,
    votes: 0,
    replyCount: newComment.replyCount,
    parentId: newComment.parentId,
    questionId: newComment.questionId!,
    createdAt: newComment.createdAt.toISOString(),
    updatedAt: newComment.updatedAt?.toISOString(),
  };

  // ✅ Incremental Redis caching
  const zsetKey = parentId ? `replies:${parentId}` : `topComments:${questionId}`;
  const hashKey = `comment:${commentData._id}`;

  const pipeline = redis.multi()
    .zadd(zsetKey, Date.now(), commentData._id)  // append new comment
    .hset(hashKey, commentData)                  // store full comment data
    .expire(zsetKey, 300)                        // 5min TTL
    .expire(hashKey, 3600);                      // 1h TTL

  // ✅ If it's a reply, increment parent's replyCount
  if (parentId) {
  await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
  pipeline.hincrby(`comment:${parentId}`, "replyCount", 1);
  }

  try {
    await pipeline.exec();
  } catch (err) {
  console.error("Redis pipeline failed:", err);
  // continue anyway since MongoDB has the real source of truth
  }


  return NextResponse.json({
    message: "Comment Added",
    newComment: commentData,
  });
}
