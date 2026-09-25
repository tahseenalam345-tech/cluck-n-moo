import { getActivePromotions } from "../src/db/postgres/repositories/promotionRepository";
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
  const res = await getActivePromotions();
  console.log("ACTIVE PROMOTIONS RETURNED:", res.length);
  for (const p of res) {
    console.log(`- [${p.slug}] ${p.title} (${p.fixedPricePkr} PKR) | Rules: ${p.rules?.length}`);
    for (const r of p.rules || []) {
      console.log(`    Rule: ${r.ruleLabel} (${r.options.length} options)`);
    }
  }
}

main();
