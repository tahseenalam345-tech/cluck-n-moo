# Cloudinary Asset Synchronization Setup & Operation Guide

This document describes the secure, server-side asset synchronization workflow between Cloudinary (`cnm/menu` folder) and the Cluck N Moo (CNM) SQLite database.

---

## 1. Required `.env.local` Configuration

The synchronization workflow runs exclusively server-side and reads credentials from `.env.local`:

```env
# Cloudinary Server Credentials (NEVER commit to git or expose in client bundles)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

# Public Client-Accessible (Read-only Cloud Identifier)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
```

### Security Notes
- `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_URL` are strictly confidential.
- `.env.local` is already declared in `.gitignore` to prevent git commits.
- Neither the sync script nor any API endpoint exposes `CLOUDINARY_API_SECRET` or API keys in logs or responses.
- Frontend components only receive the generated public HTTPS delivery URLs (`https://res.cloudinary.com/...`).

---

## 2. Expected Matching Rules

Assets in Cloudinary folder `cnm/menu` are matched to verified database products using deterministic, non-ambiguous normalization:

1. **Exact Slug Match**:
   - The asset filename (excluding extension and folder path) is lowercased and stripped of special characters.
   - Example: `cnm/menu/classic-smash-burger.jpg` -> `classic-smash-burger` matches product with slug `classic-smash-burger`.
2. **Canonical Name Match**:
   - Slugified product name matches slugified asset filename.
   - Example: `The Classic Smash Burger` -> `the-classic-smash-burger` matches `classic-smash-burger` or `the-classic-smash-burger`.
3. **No Guessing**:
   - Ambiguous matches or partial fuzzy overlaps are **never guessed**.
   - If an asset cannot be matched with 100% certainty, it is flagged in the **Unmatched Assets Report**.
   - Products without any matching asset in Cloudinary remain unchanged and are listed in the **Unmapped Products Report**.
4. **Existing Mapping Protection**:
   - If a product already has an approved `image_url` and `cloudinary_public_id`, the sync script will NOT overwrite it unless explicitly confirmed.

---

## 3. Database Schema Migration

The `products` table in SQLite (`data/cnm.db`) will be updated with 3 columns:

| Column | Type | Default | Description |
|---|---|---|---|
| `cloudinary_public_id` | `TEXT` | `NULL` | Full Cloudinary public ID (e.g. `cnm/menu/classic-smash-burger`) |
| `image_alt_text` | `TEXT` | `NULL` | Accessible image alt description (e.g. `The Classic Smash Burger - Cluck N Moo`) |
| `image_status` | `TEXT` | `'PENDING'` | Status: `'PENDING'`, `'SYNCED'`, `'MANUAL'`, `'UNMAPPED'` |

The migration is non-destructive and preserves all existing product IDs, names, prices, categories, variants, and modifiers.

---

## 4. Execution Commands

### Step 1: Dry-Run Mode (Safe Preview — No Database Writes)
Inspects assets in Cloudinary folder `cnm/menu`, tests matching against products in `data/cnm.db`, and outputs the complete preview report:

```bash
npm run cloudinary:dry-run
# or
npx tsx scripts/cloudinary-sync.ts --dry-run
```

**Dry-run output includes:**
- Total assets discovered in `cnm/menu`
- Proposed product mappings table (Product Name, Slug, Asset ID, Dimensions, Delivery URL)
- Unmapped Cloudinary assets table
- Unmapped database products list
- Confirmation notice: `[DRY-RUN] No database records were modified.`

### Step 2: Real Database Synchronization (Applies Changes)
Executes only after dry-run review approval:

```bash
npm run cloudinary:sync
# or
npx tsx scripts/cloudinary-sync.ts --write
```

**What this executes:**
1. Applies non-destructive schema additions (`cloudinary_public_id`, `image_alt_text`, `image_status`) if missing.
2. Updates matched product records with:
   - `image_url`: Optimized delivery URL with automatic format and quality (`f_auto,q_auto`)
   - `cloudinary_public_id`: Cloudinary asset ID
   - `image_alt_text`: Accessible dish description
   - `image_status`: `'SYNCED'`
3. Prints execution summary and writes a sync audit log to `docs/CLOUDINARY_SYNC_REPORT.json`.

---

## 5. Frontend Image Optimization Delivery Format

All generated image URLs use Cloudinary's dynamic CDN transformations for peak performance and visual quality:

- **Automatic Format**: `f_auto` (serves AVIF/WebP depending on customer's browser support)
- **Automatic Quality**: `q_auto` (optimizes byte size while maintaining pristine food visuals)
- **Example Delivery URL**:
  `https://res.cloudinary.com/duo55lhwh/image/upload/f_auto,q_auto/v1727090000/cnm/menu/classic-smash-burger.jpg`

---

## 6. Rollback Instructions

If any synced image mapping needs to be reverted or reset:

### Option A: Reset Specific Product Image
```bash
npx tsx -e "import { getDb } from './src/db'; getDb().prepare(\"UPDATE products SET image_url = '', cloudinary_public_id = NULL, image_status = 'PENDING' WHERE slug = 'SLUG_TO_RESET'\").run();"
```

### Option B: Reset All Products to Empty State (Pre-sync State)
```bash
npx tsx -e "import { getDb } from './src/db'; getDb().prepare(\"UPDATE products SET image_url = '', cloudinary_public_id = NULL, image_status = 'PENDING'\").run();"
```

### Option C: Re-run Database Seed (Restores Clean Baseline)
```bash
npm run db:seed
```
