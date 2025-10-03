import User from "@/models/userModel";
import connectDB from "@/db/dbConfig";
import { NextResponse } from "next/server";

interface CreateUserBody {
  email: string;
  username: string;
  avatar?: string | null;
  auth0Id: string;
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body: CreateUserBody = await req.json();

    if (!body.email || !body.username || !body.auth0Id) {
      return NextResponse.json(
        { error: "Email, Username, and Auth0 ID are required" },
        { status: 400 }
      );
    }

    // ✅ Upsert user by auth0Id
    const user = await User.findOneAndUpdate(
      { auth0Id: body.auth0Id },
      {
        email: body.email,
        username: body.username,
        avatar: body.avatar || null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("User synced:", user);

    return NextResponse.json(
      { message: "User synced successfully", user },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
