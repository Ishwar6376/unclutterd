// /app/api/comments/GET.ts
import connectDB from "@/db/dbConfig";
import User from "@/models/userModel";
import Vote from "@/models/voteModel";
import Saved from "@/models/savedModel";
import Comment from "@/models/commentModel";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import redis from "@/utils/reddis";
import mongoose from "mongoose";

// JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
  jwksRequestsPerMinute: 10,
});

const jwksCache: Record<string, string> = {};
function getKey(header: any, callback: any) {
  const cachedKey = jwksCache[header.kid];
  if (cachedKey) {
    console.log(`[JWKS] Using cached key for kid=${header.kid}`);
    return callback(null, cachedKey);
  }
  console.log(`[JWKS] Fetching key from Auth0 for kid=${header.kid}`);
  client.getSigningKey(header.kid, (err, key: any) => {
    if (err) return callback(err);
    const pubKey = key.getPublicKey();
    jwksCache[header.kid] = pubKey;
    console.log(`[JWKS] Key cached for kid=${header.kid}`);
    callback(null, pubKey);
  });
}

export async function GET(req: Request) {
  const startTotal = Date.now();
  await connectDB();
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");
  const after = searchParams.get("after");
  const limit = parseInt(searchParams.get("limit") || "10");

  if (!questionId)
    return NextResponse.json({ error: "Missing questionId" }, { status: 400 });

  // 🔹 Decode user token if present
  const authStart = Date.now();
  const authHeader = req.headers.get("authorization");
  let user: any = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
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

      type LeanUser = {
        _id: string;
        username: string;
        email: string;
        avatar?: string;
      };
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
      console.error("JWT verify failed", err);
    }
  }
  console.log("JWT decode :", Date.now() - authStart, "ms");

  // 🔹 Fetch comment IDs from Redis ZSET
  const redisStart = Date.now();
  const zsetKey = `topComments:${questionId}`;
  const precomputerFlagKey = `Comments_precomputed:${questionId}`;
  let commentIds: string[] = [];

  const zsetLen = await redis.zcard(zsetKey);
  if (zsetLen > 0) {
    commentIds = await redis.zrevrange(zsetKey, 0, -1);
  } else {
    // Fallback to MongoDB for initial cache
    const commentsFromDB = await Comment.find({
      questionId,
      parentId: null,
    })
      .sort({ votes: -1, createdAt: -1 }) // ✅ match Redis order
      .limit(200)
      .lean();

    commentIds = commentsFromDB.map((c) => (c._id as any).toString());

    // cache into redis
    const pipeline = redis.pipeline();
    for (const c of commentsFromDB) {
      const idStr = (c._id as any).toString();

      // ✅ composite score: votes primary, createdAt secondary
      const score = c.votes * 1e13 + new Date(c.createdAt).getTime();
      pipeline.zadd(zsetKey, score, idStr);

      const hashData: Record<string, string> = {};
      Object.entries(c).forEach(([k, v]) => {
        hashData[k] =
          typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
      });

      pipeline.hset(`comment:${idStr}`, hashData);
      pipeline.expire(`comment:${idStr}`, 3600);
    }
    pipeline.expire(zsetKey, 3600);
    pipeline.setex(precomputerFlagKey, 24 * 3600, "1");
    await pipeline.exec();
  }
  console.log("Redis exists/fetch:", Date.now() - redisStart, "ms");

  // 🔹 Pagination
  if (after) {
    const index = commentIds.indexOf(after);
    if (index !== -1) commentIds = commentIds.slice(index + 1);
  }
  commentIds = commentIds.slice(0, limit);

  // 🔹 Fetch Comment Data
  const fetchStart = Date.now();
  const dataPipeline = redis.pipeline();
  for (const id of commentIds) dataPipeline.hgetall(`comment:${id}`);
  const commentDataArr = (await dataPipeline.exec()) || [];

  let comments = commentDataArr
    .map(([err, data]) => {
      if (err || !data || Object.keys(data).length === 0) return null;
      const parsed: any = {};
      Object.entries(data).forEach(([k, v]) => {
        try {
          parsed[k] = JSON.parse(v as string);
        } catch {
          parsed[k] = v;
        }
      });
      return parsed;
    })
    .filter(Boolean);
  console.log("Fetch Comments Ids+data:", Date.now() - fetchStart, "ms");

  // 🔹 Votes + Saved
  const vsStart = Date.now();
  if (user?._id && comments.length > 0) {
    const ids = comments.map((c) => c._id.toString());

    const vsPipeline = redis.pipeline();
    ids.forEach((id) => {
      vsPipeline.get(`vote:${user._id}:${id}`);
      vsPipeline.get(`saved:${user._id}:${id}`);
    });
    const vsResults = (await vsPipeline.exec()) as [Error | null, string | null][];

    const userVotesMap = new Map<string, number>();
    const savedSet = new Set<string>();
    const missedVotes: string[] = [];
    const missedSaved: string[] = [];

    ids.forEach((id, i) => {
      const voteVal = vsResults[i * 2][1];
      const savedVal = vsResults[i * 2 + 1][1];

      if (voteVal != null) userVotesMap.set(id, parseInt(voteVal, 10));
      else missedVotes.push(id);

      if (savedVal != null) savedSet.add(id);
      else missedSaved.push(id);
    });

    if (missedVotes.length > 0) {
      const dbVotes = await Vote.find({
        userId: user._id,
        commentId: { $in: missedVotes },
      }).lean<{ commentId: mongoose.Types.ObjectId; value: number }[]>();

      const backfill = redis.pipeline();
      dbVotes.forEach((v) => {
        const cId = v.commentId.toString();
        userVotesMap.set(cId, v.value);
        backfill.setex(`vote:${user._id}:${cId}`, 3600, String(v.value));
      });
      await backfill.exec();
    }

    if (missedSaved.length > 0) {
      const dbSaved = await Saved.find({
        userId: user._id,
        commentId: { $in: missedSaved },
      }).lean<{ commentId: mongoose.Types.ObjectId }[]>();

      const backfill = redis.pipeline();
      dbSaved.forEach((s) => {
        const cId = s.commentId.toString();
        savedSet.add(cId);
        backfill.setex(`saved:${user._id}:${cId}`, 3600, "1");
      });
      await backfill.exec();
    }

    comments = comments.map((c) => ({
      ...c,
      userVote: userVotesMap.get(c._id.toString()) ?? 0,
      saved: savedSet.has(c._id.toString()),
    }));
  } else {
    comments = comments.map((c) => ({ ...c, userVote: 0, saved: false }));
  }
  console.log("Votes adn saved fetch +fallback:", Date.now() - vsStart, "ms");

  const nextCursor =
    comments.length > 0 ? comments[comments.length - 1]._id : null;
  const hasMore = comments.length === limit;

  console.log("Total get request time:", Date.now() - startTotal, "ms");

  return NextResponse.json({ comments, nextCursor, hasMore });
}
