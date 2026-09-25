import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const promos = [
  { id: "promotion_1_fthixm", url: "https://res.cloudinary.com/duo55lhwh/image/upload/v1790313792/promotion_1_fthixm.jpg", ext: "jpg" },
  { id: "promotion_2_ofnzlq", url: "https://res.cloudinary.com/duo55lhwh/image/upload/v1790313791/promotion_2_ofnzlq.png", ext: "png" },
  { id: "promotion_3_pkzoe9", url: "https://res.cloudinary.com/duo55lhwh/image/upload/v1790313797/promotion_3_pkzoe9.png", ext: "png" },
  { id: "promotion_4_z7vq6y", url: "https://res.cloudinary.com/duo55lhwh/image/upload/v1790313796/promotion_4_z7vq6y.png", ext: "png" }
];

const targetDir = "C:\\Users\\M Tahseen\\.gemini\\antigravity-ide\\brain\\3b0d1f19-bb6c-4345-9654-0282ae37cde4\\promotions";
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const p of promos) {
    const dest = path.join(targetDir, `${p.id}.${p.ext}`);
    console.log(`Downloading ${p.id} to ${dest}...`);
    await download(p.url, dest);
    console.log(`Saved ${dest}`);
  }
}

main();
