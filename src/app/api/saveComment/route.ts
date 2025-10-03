// /app/api/comments/save/patch.ts
import { NextResponse } from "next/server";
import connectDB from "@/db/dbConfig";
import Saved from "@/models/savedModel";
import User from "@/models/userModel";
import redis from "@/utils/reddis";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import mongoose from "mongoose";

// ------------------- JWKS setup -------------------
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
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

// ------------------- PATCH Route -------------------
export async function PATCH(req: Request) {
  await connectDB();

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer "))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.split(" ")[1];
  let user: any = null;

  try {
    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        algorithms: ["RS256"],
      }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    type LeanUser = { _id: string; username: string; email: string; avatar?: string };
    const auth0Id = decoded.sub;

    if (auth0Id) {
      const cachedUser = await redis.get(`user:${auth0Id}`);
      if (cachedUser) {
        const u = JSON.parse(cachedUser);
        user = { ...u, _id: new mongoose.Types.ObjectId(u._id) };
      } else {
        const u = await User.findOne({ auth0Id }).lean<LeanUser>();
        if (u) {
          await redis.setex(
            `user:${auth0Id}`,
            3600,
            JSON.stringify({
              _id: u._id.toString(),
              username: u.username,
              email: u.email,
              avatar: u.avatar,
            })
          );
          user = { ...u, _id: new mongoose.Types.ObjectId(u._id) };
        }
      }
    }
  } catch (err) {
    console.error("JWT verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { commentId, saved } = await req.json();
  if (!commentId)
    return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

  // ------------------- Update Redis first -------------------
  const savedKey = `saved:${user._id}:${commentId}`;
  const tsKey = `saved_ts:${user._id}:${commentId}`;
  const timestamp = Date.now();

  const ttlSeconds = 3600; // 1 hour

if (saved) {
  await redis.multi()
    .set(savedKey, "1", "EX", ttlSeconds)  // set with expiry
    .set(tsKey, timestamp.toString(), "EX", ttlSeconds)
    .exec();
} else {
  await redis.multi()
    .del(savedKey)
    .del(tsKey)
    .exec();
}


  // ------------------- Async DB update -------------------
  

  if(saved){
    Saved.create({
      commentId,userId:user._id
    },
  )
  }else{
    Saved.findOneAndDelete(
    { commentId, userId: user._id },
  ).exec().catch(err => console.error("DB save update failed:", err));
  }

  return NextResponse.json({
    message: saved ? "Comment saved" : "Comment unsaved",
    saved,
    savedAt: saved ? timestamp : null,
  });
}
