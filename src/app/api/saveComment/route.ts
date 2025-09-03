import { NextResponse } from "next/server";
import connectDB from "@/db/dbConfig";

import Saved from "@/models/savedModel";
import User from "@/models/userModel";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

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

export async function PATCH(req: Request) {
  await connectDB();

  // 🔑 Verify JWT from Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  let user;

  try {
    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
          algorithms: ["RS256"],
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    user = await User.findOne({ email: decoded.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("JWT verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // ✅ Extract request data
  const { commentId, saved } = await req.json();

  // 📝 Either insert or update saved comment entry
  const newSaved = await Saved.findOneAndUpdate(
    { commentId, userId: user._id },
    { commentId, userId: user._id, saved },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    message: saved ? "Comment saved" : "Comment unsaved",
    saved: newSaved,
  });
}
