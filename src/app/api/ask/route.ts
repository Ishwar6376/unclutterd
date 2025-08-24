import connectDB from "@/db/dbConfig";
import { NextResponse } from "next/server";
import Question from "@/models/questionModel";
import User from "@/models/userModel";

interface Author {
  given_name: string;
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  sub: string;
  updated_at: string;
}

interface CreateUserBody {
  author: Author;
  title: string;
  description: string;
  image?: string | null;
}

export async function POST(req: Request) {
  try {
    await connectDB();
    console.log("DB connected");

    const body: CreateUserBody = await req.json();
    console.log("Request body:", body);

    const email = body.author.email;

    // Find the user by email
    const dbUser = await User.findOne({ email });

    if (!dbUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Create the question
    const newQuestion = await Question.create({
      author: dbUser._id,
      title: body.title,
      description: body.description,
      image: body.image,
    });

    console.log("New question:", newQuestion);

    return NextResponse.json(
      { message: "Question uploaded to database", data: newQuestion },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { message: "Failed to upload to database" },
      { status: 500 }
    );
  }
}
