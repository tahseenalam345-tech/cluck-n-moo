import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface IconMapping {
  originalFile: string;
  signatureSlug: string;
  optimizedFile: string;
  altText: string;
}

const ICONS: IconMapping[] = [
  {
    originalFile: 'bon-a-petit.jpg',
    signatureSlug: 'bon-a-petit',
    optimizedFile: 'bon-a-petit.webp',
    altText: 'Bon a Petit signature icon - Plate and cutlery emblem',
  },
  {
    originalFile: 'menu.jpg',
    signatureSlug: 'menu',
    optimizedFile: 'menu.webp',
    altText: 'Menú signature icon - Lightning energy emblem',
  },
  {
    originalFile: 'pizza-menu.jpg',
    signatureSlug: 'pizza-menu',
    optimizedFile: 'pizza-menu.webp',
    altText: 'Pizza Menú signature icon - Cheesy slice emblem',
  },
  {
    originalFile: 'muuu.jpg',
    signatureSlug: 'muuu',
    optimizedFile: 'muuu.webp',
    altText: 'Muuu signature icon - Bull skull smash beef emblem',
  },
  {
    originalFile: 'cloc-cloc.jpg',
    signatureSlug: 'cloc-cloc',
    optimizedFile: 'cloc-cloc.webp',
    altText: 'Cloc Cloc signature icon - Rooster crispy chicken emblem',
  },
  {
    originalFile: 'mmm.jpg',
    signatureSlug: 'mmm',
    optimizedFile: 'mmm.webp',
    altText: 'Mmm..... signature icon - Crown treat emblem',
  },
  {
    originalFile: 'historia.jpg',
    signatureSlug: 'historia',
    optimizedFile: 'historia.webp',
    altText: 'Historia signature icon - Heart brand heritage emblem',
  },
];

const inputDir = path.join(process.cwd(), 'public', 'branding', 'signature');
const outputDir = path.join(inputDir, 'optimized');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface ReportRow {
  originalFilename: string;
  originalDimensions: string;
  originalFileSize: number;
  optimizedFilename: string;
  optimizedDimensions: string;
  optimizedFileSize: number;
  compressionPercentage: string;
}

async function run() {
  const report: ReportRow[] = [];

  for (const item of ICONS) {
    const inputPath = path.join(inputDir, item.originalFile);
    const outputPath = path.join(outputDir, item.optimizedFile);

    const inputStat = fs.statSync(inputPath);
    const inputMeta = await sharp(inputPath).metadata();
    const origW = inputMeta.width!;
    const origH = inputMeta.height!;

    // Find the circle bounds to safely center-crop the 1:1 circle
    const { data } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
    let minX = origW, maxX = 0, minY = origH, maxY = 0;
    const threshold = item.originalFile === 'bon-a-petit.jpg' ? 35 : 18;

    for (let y = 0; y < origH; y++) {
      for (let x = 0; x < origW; x++) {
        const idx = (y * origW + x) * (inputMeta.channels || 3);
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const centerX = Math.round((minX + maxX) / 2);
    const centerY = Math.round((minY + maxY) / 2);

    // Bounding circle diameter is 608px. With a safe margin of 3px on all sides, crop a 614x614 square
    const cropSize = Math.min(origW, origH, Math.max(maxX - minX + 6, maxY - minY + 6));
    let left = centerX - Math.floor(cropSize / 2);
    let top = centerY - Math.floor(cropSize / 2);

    // Keep within bounds
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + cropSize > origW) left = origW - cropSize;
    if (top + cropSize > origH) top = origH - cropSize;

    // Target output dimensions: 256x256 (crisp 1:1 aspect ratio, ideal for 64-76px icons on high-DPI retina screens)
    // Quality 82 for crisp vector glow without artifacts
    await sharp(inputPath)
      .extract({ left, top, width: cropSize, height: cropSize })
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 82, effort: 6 })
      .toFile(outputPath);

    const outStat = fs.statSync(outputPath);
    const outMeta = await sharp(outputPath).metadata();

    const reduction = ((1 - outStat.size / inputStat.size) * 100).toFixed(1);

    report.push({
      originalFilename: item.originalFile,
      originalDimensions: `${origW}x${origH}`,
      originalFileSize: inputStat.size,
      optimizedFilename: item.optimizedFile,
      optimizedDimensions: `${outMeta.width}x${outMeta.height}`,
      optimizedFileSize: outStat.size,
      compressionPercentage: `${reduction}%`,
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
