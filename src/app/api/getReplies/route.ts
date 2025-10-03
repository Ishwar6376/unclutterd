import connectDB from "@/db/dbConfig";
import Comment from "@/models/commentModel";
import User from "@/models/userModel";
import Vote from "@/models/voteModel";
import Saved from "@/models/savedModel";
import redis from "@/utils/reddis";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

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

// ------------------- GET Route -------------------
export async function GET(req: Request) {
  console.log("Getreply called");
  const startTotal = Date.now();
  await connectDB();

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  const after = searchParams.get("after");
  const limit = parseInt(searchParams.get("limit") || "5");

  if (!parentId)
    return NextResponse.json({ error: "Missing parentId" }, { status: 400 });

  // ------------------- Decode JWT -------------------
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
    }
  }
  console.log("JWT decode:", Date.now() - authStart, "ms");

  // ------------------- Redis keys -------------------
  const redisStart = Date.now();
  const zsetKey = `replies:${parentId}`;
  const precomputeFlagKey = `replies_precomputed:${parentId}`;

  let replyIds: string[] = [];

  // Check ZSET
  const zsetLen = await redis.zcard(zsetKey);
  console.log(zsetLen);
  if (zsetLen > 0) {
    replyIds = await redis.zrevrange(zsetKey, 0, -1);
  } else {
    // fallback: fetch from DB
    const repliesFromDB = await Comment.find({ parentId: new mongoose.Types.ObjectId(parentId) })
      .sort({votes:-1, createdAt: -1 })
      .limit(200)
      .lean();
    replyIds = repliesFromDB.map(r => (r._id as any).toString());
  

    // Cache into Redis
    const pipeline = redis.pipeline();
    for (const r of repliesFromDB) {
      const idStr = (r._id as any).toString();
      const score=r.votes*1e13+new Date(r.createdAt).getTime();
      pipeline.zadd(zsetKey, score, idStr);

      const hashData: Record<string, string> = {};
      Object.entries(r).forEach(([k, v]) => {
        hashData[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
      });
      pipeline.hset(`comment:${idStr}`, hashData);
      pipeline.expire(`comment:${idStr}`, 3600);
    }
    pipeline.expire(zsetKey, 3600);
    pipeline.setex(precomputeFlagKey, 24 * 3600, "1");
    await pipeline.exec();
  }
  console.log("Redis exists/fetch:", Date.now() - redisStart, "ms");

  // ------------------- Pagination -------------------
  if (after) {
    const index = replyIds.indexOf(after);
    if (index !== -1) replyIds = replyIds.slice(index + 1);
  }
  replyIds = replyIds.slice(0, limit);

  // ------------------- Fetch replies data -------------------
  const fetchStart = Date.now();
  const dataPipeline = redis.pipeline();
  for (const id of replyIds) dataPipeline.hgetall(`comment:${id}`);
  console.log("dfvfd",replyIds);
  const replyDataArr = (await dataPipeline.exec()) || [];
  console.log("sdfg",replyDataArr)

  let replies = replyDataArr
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

  console.log("Fetch reply IDs + data:", Date.now() - fetchStart, "ms");

  // ------------------- Votes & saved -------------------
  const vsStart = Date.now();
  // ------------------- Fetch votes & saved from Redis and fallback to DB -------------------
console.log(user?._id);
console.log(replies.length);
if (user?._id && replies.length > 0) {
  const ids = replies.map(r => r._id.toString());

  // Merge into a single pipeline
  const vsPipeline = redis.pipeline();
  ids.forEach(id => {
    vsPipeline.get(`vote:${user._id}:${id}`);
    vsPipeline.get(`saved:${user._id}:${id}`); // use get instead of exists
  });

  const vsResults = (await vsPipeline.exec()) as [Error | null, string | null][];
  const userVotesMap = new Map<string, number>();
  const savedSet = new Set<string>();
  const missedVotes: string[] = [];
  const missedSaved: string[] = [];

  ids.forEach((id, i) => {
    const voteVal = vsResults[i * 2][1];    // votes at even indices
    const savedVal = vsResults[i * 2 + 1][1]; // saved at odd indices

    if (voteVal != null) userVotesMap.set(id, parseInt(voteVal, 10));
    else missedVotes.push(id);

    if (savedVal != null) savedSet.add(id);
    else missedSaved.push(id);
  });

  // fallback to DB only if needed
  if (missedVotes.length > 0) {
    const dbVotes = await Vote.find({
      userId: user._id,
      commentId: { $in: missedVotes },
    }).lean<{ commentId: mongoose.Types.ObjectId; value: number }[]>();

    const backfill = redis.pipeline();
    dbVotes.forEach(v => {
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
    dbSaved.forEach(s => {
      const cId = s.commentId.toString();
      savedSet.add(cId);
      backfill.setex(`saved:${user._id}:${cId}`, 3600, "1");
    });
    await backfill.exec();
  }

  replies = replies.map(r => ({
    ...r,
    userVote: userVotesMap.get(r._id.toString()) ?? 0,
    saved: savedSet.has(r._id.toString()),
  }));
} else {
  replies = replies.map(r => ({ ...r, userVote: 0, saved: false }));
}

console.log("Votes & saved fetch + fallback:", Date.now() - vsStart, "ms");

  const nextCursor = replies.length > 0 ? replies[replies.length - 1]._id : null;
  const hasMore = replies.length === limit;

  console.log("Total GET request time:", Date.now() - startTotal, "ms");

  return NextResponse.json({ replies, nextCursor, hasMore });
}
