import User from "@/models/userModel";
import connectDB from "@/db/dbConfig";
import { NextResponse } from "next/server";

interface CreateUserBody {
  email: string;
  username: string;
  avatar?: string | null;
}

export async function POST(req: Request) {
  console.log("API route hit");
  try {
    await connectDB();
    console.log(" DB connected");
    const body: CreateUserBody = await req.json();
    console.log("Request body:", body);

    if (!body.email || !body.username) {
      return NextResponse.json(
        { error: "Email and Username are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: body.email });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 200 }
      );
    }

    const newUser = await User.create({
      email: body.email,
      username: body.username,
      avatar: body.avatar || null,
    });
    console.log("New user",newUser);

    return NextResponse.json(
      { message: "User created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
