import { getActiveMenu } from "../src/db/postgres/repositories/menuRepository";
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

async function main() {
  const menu = await getActiveMenu();
  console.log(`\n======================================================`);
  console.log(`STOREFRONT GET ACTIVE MENU VERIFICATION`);
  console.log(`======================================================`);
  console.log(`Total Customer-Visible Categories: ${menu.categories.length}`);
  
  let totalProducts = 0;
  for (const cat of menu.categories) {
    const pCount = cat.products?.length || 0;
    totalProducts += pCount;
    console.log(`- [${cat.id}] "${cat.name}" (${pCount} products)`);
    for (const p of cat.products || []) {
      const imgInfo = p.cloudinaryPublicId || (p.imageUrl ? "URL" : "NO_IMAGE");
      console.log(`    • ${p.name} (PKR ${p.basePricePkr}) [${imgInfo}]`);
    }
  }

  console.log(`\nTotal Customer-Visible Products across all categories: ${totalProducts}`);
  console.log(`Featured / Popular Picks Products: ${menu.featuredProducts.length}`);
}

main().catch(console.error);
