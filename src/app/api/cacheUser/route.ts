import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import User from "@/models/userModel";
import connectDB from "@/db/dbConfig";
import redis from "@/utils/reddis";

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key: any) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export async function POST(req: Request) {
  await connectDB();

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return NextResponse.json({ error: "No token provided" }, { status: 401 });

  try {
    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });
    ;
    // Find or create user in Mongo
    let user = await User.findOne({ auth0Id: decoded.sub });
    // Cache user in Redis
    const userCache = {
      _id: user._id.toString(), // essential for Mongo
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    };
    await redis.set(`user:${decoded.sub}`, JSON.stringify(userCache));
    await redis.expire(`user:${decoded.sub}`, 3600); // 1 hour TTL

    return NextResponse.json({ ok: true, user: userCache });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
