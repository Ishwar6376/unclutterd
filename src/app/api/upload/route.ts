import { NextResponse } from "next/server";
import cloudinary from "@/utils/cloudinary";
import multer from "multer";
import { promisify } from "util";
import fs from "fs";

// Multer config to store uploaded file temporarily
const upload = multer({ dest: "/tmp" });
const uploadMiddleware = upload.single("file");
const runMiddleware = promisify(uploadMiddleware);

export async function POST(req: Request) {
  try {
    // Convert request to Node.js req/res so Multer can work
    const formData: any = await (req as any).formData?.();
    const file = formData?.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Save file temporarily
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempPath = `/tmp/${file.name}`;
    fs.writeFileSync(tempPath, buffer);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempPath, {
      folder: "uncluttered_uploads",
    });
    // Delete temp file
    console.log(result)
    fs.unlinkSync(tempPath);

    return NextResponse.json({ url: result.url });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
