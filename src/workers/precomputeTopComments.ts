import connectDB from "@/db/dbConfig";
import Question from "@/models/questionModel";
import Comment from "@/models/commentModel";
import redis from "@/utils/reddis";
import mongoose from "mongoose";

export async function precomputeTopCommentsAndReplies() {
  await connectDB();
  const questions = await Question.find({}, { _id: 1 }).lean();

  for (const q of questions) {
    const qId = (q._id as mongoose.Types.ObjectId).toString();
    const topComments = await Comment.find({ questionId: qId, parentId: null })
      .sort({ votes: -1, createdAt: -1 })
      .limit(200)
      .lean()

    const zsetKey = `topComments:${qId}`;
    for (const c of topComments) {
      const commentId = (c._id as any).toString();
      // ⚡ Only add if not exists to prevent overwriting new comments
      await redis.zadd(zsetKey, "NX", new Date(c.createdAt).getTime(), commentId);
      await redis.hset(`comment:${commentId}`, c);
    }
    await redis.expire(zsetKey, 300);

    // Precompute replies
    for (const c of topComments) {
      const commentId = (c._id as any).toString();
      const replies = await Comment.find({ parentId: commentId })
        .sort({ votes: -1, createdAt: -1 })
        .limit(50)
        .lean();
      if (replies.length > 0) {
        const replyZKey = `replies:${commentId}`;
        for (const r of replies) {
          await redis.zadd(replyZKey, "NX", new Date(r.createdAt).getTime(), (r._id as any).toString());
          await redis.hset(`comment:${r._id}`, r);
        }
        await redis.expire(replyZKey, 300);
      }
    }
  }
  console.log("✅ Precompute done");
}
