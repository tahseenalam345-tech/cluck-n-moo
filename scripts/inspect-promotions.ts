import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const res: any = await cloudinary.api.resources({
    type: "upload",
    max_results: 25,
  });
  console.log("FIRST 25 RESOURCES:");
  for (const r of res.resources) {
    console.log(`${r.public_id} | ${r.format} | ${r.width}x${r.height} | ${r.created_at} | ${r.secure_url}`);
  }
}

main();
