import connectDB from "@/db/dbConfig";
import Comment from "@/models/commentModel";
import User from "@/models/userModel";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import redis from "@/utils/reddis";
import mongoose from "mongoose";

// JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
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

type LeanComment = {
  _id: string;
  parentId: string | null;
  questionId?: string;
  auth0Id: string;
};

export async function DELETE(req: Request) {
  await connectDB();

  // 1️⃣ Verify JWT
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

  // 2️⃣ Parse request
  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

  // 3️⃣ Fetch comment
  const comment = await Comment.findById(commentId).lean<LeanComment>();
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  // 4️⃣ Ownership check
  if (comment.auth0Id !== user.auth0Id) {
    return NextResponse.json({ error: "Forbidden: not your comment" }, { status: 403 });
  }

  // 5️⃣ Soft delete in MongoDB
  await Comment.findByIdAndUpdate(commentId, {
    body: "[deleted]",
    auth0Id: null,
  });

  // 6️⃣ Update Redis hash directly (no cache invalidation)
  const commentKey = `comment:${commentId}`;
  const pipeline = redis.pipeline();

  pipeline.hset(commentKey, {
    body: "[deleted]",
    authorId: "",
    authorName: "[deleted]",
    authorEmail: "",
  });

  await pipeline.exec();

  return NextResponse.json({ message: "Comment deleted" });
}
