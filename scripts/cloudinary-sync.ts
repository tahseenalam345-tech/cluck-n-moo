import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { getDb } from "../src/db";
import { migrateCloudinaryFields } from "../src/db/migrations/001_add_cloudinary_fields";

// 1. Securely load .env.local without exposing values to stdout
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

// 2. Validate Cloudinary Server Credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("❌ Error: Missing required Cloudinary credentials in .env.local.");
  console.error("Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.");
  process.exit(1);
}

// Configure Cloudinary Server SDK
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

interface CloudinaryAsset {
  public_id: string;
  filename: string;
  secure_url: string;
  delivery_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

interface ProductRecord {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  cloudinary_public_id: string | null;
  image_alt_text: string | null;
  image_status: string | null;
}

interface MatchResult {
  product: ProductRecord;
  asset: CloudinaryAsset;
  matchType: "EXACT_SLUG" | "EXACT_ID" | "NORMALIZED_SLUG" | "NORMALIZED_NAME" | "VERIFIED_ALIAS";
  isOverwrite: boolean;
}

function extractBaseName(publicId: string): string {
  const parts = publicId.split("/");
  return parts[parts.length - 1];
}

// Strip Cloudinary's auto-generated 6-character random suffix (e.g., _fwnokj, _jm1lel, _t2gore)
function cleanAssetBase(filename: string): string {
  return filename.replace(/_[a-z0-9]{6}$/i, "").toLowerCase();
}

function normalizeKey(str: string): string {
  return cleanAssetBase(str)
    .replace(/^prod_|^deal_|^side_|^drink_/, "")
    .replace(/^the[-_]|^the\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

// Deterministic verified aliases mapping asset clean base names to Product IDs / Slugs
const VERIFIED_ALIASES: Record<string, string> = {
  // Burgers
  classic_cheeseburger: "prod_classic_smash",
  original_xinger: "prod_cluck_zinger",
  cluckin_mootastic: "prod_moo_cluck_duo",
  
  // Fried Chicken & Tenders
  fired_chicken: "prod_golden_chicken_3", // 'fired' is a known typo for fried
  chicken_strips: "prod_crispy_tenders",

  // Pizzas
  flaming_tikka: "prod_chicken_tikka_pizza",

  // Deals
  deal_1: "deal_solo_box",
  deal_2: "deal_duo_smash",
  deal_3: "deal_town_family",

  // Sides
  regular_fries: "side_salted_fries",
  chicken_cheese_loaded_fries: "side_cheddar_fries",
};

async function fetchCloudinaryAssets(): Promise<{ assets: CloudinaryAsset[]; totalDiscovered: number }> {
  const assets: CloudinaryAsset[] = [];
  let totalDiscovered = 0;

  // 1. Primary method: Cloudinary Search API (covers dynamic asset folders and folder paths)
  try {
    let nextCursor: string | undefined = undefined;
    do {
      let query = cloudinary.search
        .expression("folder:cnm/menu* OR folder:cnm*")
        .max_results(100);

      if (nextCursor) {
        query = query.next_cursor(nextCursor);
      }

      const res = await query.execute();
      totalDiscovered = res.total_count || totalDiscovered;

      if (res.resources && Array.isArray(res.resources) && res.resources.length > 0) {
        for (const item of res.resources) {
          const deliveryUrl = cloudinary.url(item.public_id, {
            secure: true,
            fetch_format: "auto",
            quality: "auto",
          });

          assets.push({
            public_id: item.public_id,
            filename: extractBaseName(item.public_id),
            secure_url: item.secure_url,
            delivery_url: deliveryUrl,
            format: item.format,
            width: item.width,
            height: item.height,
            bytes: item.bytes,
            created_at: item.created_at,
          });
        }
      }
      nextCursor = res.next_cursor;
    } while (nextCursor);
  } catch (err: any) {
    console.warn("Notice: Search API query notice:", err?.message || err);
  }

  // 2. Fallback: Admin API prefix listing
  if (assets.length === 0) {
    for (const prefix of ["cnm/menu", "cnm/menu/", "cnm"]) {
      try {
        let nextCursor: string | undefined = undefined;
        do {
          const res: any = await cloudinary.api.resources({
            type: "upload",
            prefix,
            max_results: 100,
            next_cursor: nextCursor,
          });

          if (res.resources && Array.isArray(res.resources) && res.resources.length > 0) {
            for (const item of res.resources) {
              const deliveryUrl = cloudinary.url(item.public_id, {
                secure: true,
                fetch_format: "auto",
                quality: "auto",
              });

              assets.push({
                public_id: item.public_id,
                filename: extractBaseName(item.public_id),
                secure_url: item.secure_url,
                delivery_url: deliveryUrl,
                format: item.format,
                width: item.width,
                height: item.height,
                bytes: item.bytes,
                created_at: item.created_at,
              });
            }
          }
          nextCursor = res.next_cursor;
        } while (nextCursor);

        if (assets.length > 0) break;
      } catch (err: any) {
        // Continue fallback attempts
      }
    }
  }

  return { assets, totalDiscovered };
}

async function main() {
  const isWriteMode = process.argv.includes("--write") || process.argv.includes("--sync");
  const isDryRun = !isWriteMode;

  console.log("================================================================================");
  console.log(`📡 CNM Cloudinary Asset Synchronization Workflow [Mode: ${isDryRun ? "DRY-RUN (Preview Only)" : "LIVE WRITE"}]`);
  console.log("================================================================================");
  console.log(`Cloud Name: ${cloudName} (Credentials verified)`);
  console.log(`Target Cloudinary Folder: cnm/menu\n`);

  // Ensure database columns exist
  migrateCloudinaryFields();

  // 1. Fetch assets from Cloudinary
  console.log("Fetching image assets from Cloudinary folder 'cnm/menu'...");
  const { assets, totalDiscovered } = await fetchCloudinaryAssets();

  if (totalDiscovered > 0 && assets.length === 0) {
    console.log(`\n⚠️  Found ${totalDiscovered} asset(s) in 'cnm/menu', but the Cloudinary API key has restricted permissions (missing 'Read' permission).`);
    console.log("To allow the script to read asset names and metadata:");
    console.log("1. Open Cloudinary Console -> Settings -> Access Keys.");
    console.log("2. Edit your API key in Cloudinary Console and enable 'Read' permissions (or use the Master API Key & Secret).");
    console.log("3. Update .env.local if using a new key, then rerun this script.\n");
  } else {
    console.log(`Found ${assets.length} image asset(s) in Cloudinary.\n`);
  }

  // 2. Fetch database products
  const db = getDb();
  const products = db
    .prepare(
      "SELECT id, category_id, name, slug, image_url, cloudinary_public_id, image_alt_text, image_status FROM products ORDER BY display_order ASC"
    )
    .all() as unknown as ProductRecord[];

  console.log(`Loaded ${products.length} product(s) from SQLite database.\n`);

  // 3. Perform deterministic matching
  const matchedPairs: MatchResult[] = [];
  const matchedAssetIds = new Set<string>();
  const matchedProductIds = new Set<string>();

  for (const asset of assets) {
    const assetBase = asset.filename.toLowerCase();
    const cleanedBase = cleanAssetBase(assetBase);
    const assetNorm = normalizeKey(cleanedBase);

    // Candidates matching this asset
    const candidates: Array<{ product: ProductRecord; type: MatchResult["matchType"] }> = [];

    // 1. Check verified alias table first
    if (VERIFIED_ALIASES[cleanedBase]) {
      const target = VERIFIED_ALIASES[cleanedBase].toLowerCase();
      const matchedProd = products.find((p) => p.id.toLowerCase() === target || p.slug.toLowerCase() === target);
      if (matchedProd) {
        candidates.push({ product: matchedProd, type: "VERIFIED_ALIAS" });
      }
    } else {
      // 2. Exact or normalized matching
      for (const prod of products) {
        const prodSlug = prod.slug.toLowerCase();
        const prodId = prod.id.toLowerCase();
        const prodNormSlug = normalizeKey(prodSlug);
        const prodNormName = normalizeKey(prod.name);

        if (cleanedBase === prodSlug) {
          candidates.push({ product: prod, type: "EXACT_SLUG" });
        } else if (cleanedBase === prodId) {
          candidates.push({ product: prod, type: "EXACT_ID" });
        } else if (assetNorm === prodNormSlug) {
          candidates.push({ product: prod, type: "NORMALIZED_SLUG" });
        } else if (assetNorm === prodNormName) {
          candidates.push({ product: prod, type: "NORMALIZED_NAME" });
        }
      }
    }

    // Only map if uniquely and unambiguously matched to exactly ONE product
    if (candidates.length === 1) {
      const best = candidates[0];
      const isOverwrite = Boolean(best.product.image_url && best.product.image_url.trim() !== "");

      matchedPairs.push({
        product: best.product,
        asset,
        matchType: best.type,
        isOverwrite,
      });

      matchedAssetIds.add(asset.public_id);
      matchedProductIds.add(best.product.id);
    } else if (candidates.length > 1) {
      console.warn(`⚠️ Ambiguous match for asset "${asset.public_id}": matched ${candidates.length} products. Skipped.`);
    }
  }

  // 4. Unmatched Assets & Products
  const unmatchedAssets = assets.filter((a) => !matchedAssetIds.has(a.public_id));
  const unmatchedProducts = products.filter((p) => !matchedProductIds.has(p.id));

  // 5. Output Proposed / Applied Mappings Table
  console.log("--------------------------------------------------------------------------------");
  console.log(`📋 PROPOSED PRODUCT MAPPINGS (${matchedPairs.length}/${products.length} Products Matched)`);
  console.log("--------------------------------------------------------------------------------");

  if (matchedPairs.length === 0) {
    console.log("No automatic matches found between Cloudinary assets and database products.\n");
  } else {
    for (const m of matchedPairs) {
      const overwriteFlag = m.isOverwrite ? " [OVERWRITE EXISTING]" : "";
      console.log(`✓ [${m.matchType}] ${m.product.name} (Slug: ${m.product.slug})`);
      console.log(`    Asset ID:    ${m.asset.public_id}${overwriteFlag}`);
      console.log(`    Dimensions:  ${m.asset.width}x${m.asset.height} (${m.asset.format.toUpperCase()}, ${(m.asset.bytes / 1024).toFixed(1)} KB)`);
      console.log(`    Delivery URL: ${m.asset.delivery_url}`);
      console.log("");
    }
  }

  // 6. Unmatched Assets Report
  console.log("--------------------------------------------------------------------------------");
  console.log(`🔍 UNMATCHED CLOUDINARY ASSETS (${unmatchedAssets.length} Assets)`);
  console.log("--------------------------------------------------------------------------------");
  if (unmatchedAssets.length === 0) {
    console.log("All Cloudinary assets were successfully matched to database products.");
  } else {
    for (const ua of unmatchedAssets) {
      console.log(`• ${ua.public_id} (${ua.width}x${ua.height}, ${ua.format}, ${(ua.bytes / 1024).toFixed(1)} KB)`);
    }
  }
  console.log("");

  // 7. Unmatched Products Report
  console.log("--------------------------------------------------------------------------------");
  console.log(`📦 DATABASE PRODUCTS WITHOUT MATCHING CLOUDINARY IMAGE (${unmatchedProducts.length} Products)`);
  console.log("--------------------------------------------------------------------------------");
  if (unmatchedProducts.length === 0) {
    console.log("All database products have matching Cloudinary images.");
  } else {
    for (const up of unmatchedProducts) {
      console.log(`• ${up.name} [ID: ${up.id}] (Expected asset name: "${up.slug}.jpg" or similar)`);
    }
  }
  console.log("");

  // 8. Execute Database Updates if in Write Mode
  if (isWriteMode) {
    console.log("--------------------------------------------------------------------------------");
    console.log("💾 COMMITTING DATABASE SYNCHRONIZATION...");
    console.log("--------------------------------------------------------------------------------");

    const updateStmt = db.prepare(`
      UPDATE products
      SET image_url = ?,
          cloudinary_public_id = ?,
          image_alt_text = ?,
          image_status = 'SYNCED'
      WHERE id = ?
    `);

    let updatedCount = 0;
    for (const m of matchedPairs) {
      const altText = `${m.product.name} - Cluck N Moo`;
      updateStmt.run(m.asset.delivery_url, m.asset.public_id, altText, m.product.id);
      updatedCount++;
    }

    console.log(`🎉 Successfully synchronized ${updatedCount} product image(s) in SQLite database!`);
    console.log("Frontend product cards will now automatically render these optimized Cloudinary assets.\n");
  } else {
    console.log("================================================================================");
    console.log("ℹ️  [DRY-RUN MODE COMPLETE] ZERO database writes were performed.");
    console.log("To apply these changes to the database, run:");
    console.log("    npm run cloudinary:sync");
    console.log("================================================================================\n");
  }
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
