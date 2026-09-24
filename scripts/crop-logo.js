const sharp = require('sharp');

async function processLogo() {
  const { data, info } = await sharp('public/logo.jpg')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log('Original image info:', info);

  const cx = 1024;
  const cy = 1023.5;
  const r = 855; // circular boundary
  const rSq = r * r;

  // Create 4-channel RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels;
      const destIdx = (y * width + x) * 4;

      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      rgba[destIdx] = data[srcIdx];         // R
      rgba[destIdx + 1] = data[srcIdx + 1]; // G
      rgba[destIdx + 2] = data[srcIdx + 2]; // B

      if (distSq <= rSq) {
        rgba[destIdx + 3] = 255; // fully opaque
      } else if (distSq <= (r + 1.5) * (r + 1.5)) {
        // smooth 1.5px antialiasing edge
        const dist = Math.sqrt(distSq);
        const alpha = Math.max(0, Math.min(255, Math.round((r + 1.5 - dist) / 1.5 * 255)));
        rgba[destIdx + 3] = alpha;
      } else {
        rgba[destIdx + 3] = 0;   // fully transparent
      }
    }
  }

  // Save the full 2048x2048 masked PNG, and extract square bounded version
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({
      left: 168,
      top: 168,
      width: 1712,
      height: 1712
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('public/logo.png');

  // Generate PWA icons
  await sharp('public/logo.png')
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');

  await sharp('public/logo.png')
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');

  console.log('Successfully generated authoritative public/logo.png and PWA icons!');
}

processLogo().catch(err => {
  console.error(err);
  process.exit(1);
});
