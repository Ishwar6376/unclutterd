import { NextResponse } from "next/server";
import cloudinary from "@/utils/cloudinary";
import multer from "multer";
import { promisify } from "util";
import fs from "fs";

// Multer config — store temporarily in /tmp
const upload = multer({ dest: "/tmp" });
const uploadMiddleware = upload.array("files", 20); // Allow up to 20 files
const runMiddleware = promisify(uploadMiddleware);

export const runtime = "nodejs";

export async function POST(req: any) {
  try {
    // Convert Request -> Node req/res so Multer works
    const { req: nodeReq, res: nodeRes } = req;
    await runMiddleware(nodeReq, nodeRes);

    // Multer puts files on nodeReq.files
    const files = nodeReq.files || [];

    if (files.length === 0) {
      return NextResponse.json({ urls: [] }, { status: 200 });
    }

    const urls: string[] = [];

    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "uncluttered_uploads",
      });

      urls.push(result.secure_url);

      // Delete temp file after upload
      fs.unlinkSync(file.path);
    }

    return NextResponse.json({ urls }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

