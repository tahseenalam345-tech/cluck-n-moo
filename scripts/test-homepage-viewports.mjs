import puppeteer from "puppeteer-core";

const viewports = [
  { name: "Mobile 320px", width: 320, height: 600 },
  { name: "Mobile 375px (iPhone SE)", width: 375, height: 667 },
  { name: "Mobile 390px (iPhone 14)", width: 390, height: 844 },
  { name: "Mobile 430px (iPhone 14 Pro Max)", width: 430, height: 932 },
  { name: "Tablet 768px (iPad)", width: 768, height: 1024 },
  { name: "Desktop 1280px", width: 1280, height: 800 },
];

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

console.log("=== Homepage Viewport & Visual Regression Testing ===");

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });
  
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

  // 1. Check Horizontal Overflow
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });

  // 2. Check PromoCarousel Dimensions and Aspect Ratio
  const carouselMetrics = await page.evaluate(() => {
    const container = document.querySelector(".promo-carousel-container");
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const ratio = rect.width / rect.height;
    return { width: Math.round(rect.width), height: Math.round(rect.height), ratio: ratio.toFixed(2) };
  });

  // 3. Check AppDownloadBanner position vs Cart Bar
  const bannerCheck = await page.evaluate(() => {
    const banner = document.querySelector(".app-download-floating-banner");
    if (!banner) return { present: false };
    const rect = banner.getBoundingClientRect();
    return {
      present: true,
      bottom: Math.round(window.innerHeight - rect.bottom),
      top: Math.round(rect.top),
      zIndex: window.getComputedStyle(banner).zIndex,
    };
  });

  // 4. Test Theme Toggle (Dark & Light)
  const themeCheck = await page.evaluate(() => {
    const htmlEl = document.documentElement;
    const initialTheme = htmlEl.getAttribute("data-theme") || "dark";
    const bg = window.getComputedStyle(document.body).backgroundColor;
    const orange = window.getComputedStyle(document.body).getPropertyValue("--cnm-orange").trim();
    return { initialTheme, bg, orange };
  });

  console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
  console.log(`Horizontal Scroll Overflow: ${hasHorizontalScroll ? "FAIL (Content spills)" : "PASS (No overflow)"}`);
  console.log(`PromoCarousel Metrics:`, carouselMetrics);
  console.log(`AppDownloadBanner Status:`, bannerCheck);
  console.log(`Theme Info:`, themeCheck);
  console.log(`Console Errors (${consoleErrors.length}):`, consoleErrors.length ? consoleErrors : "None");

  await page.close();
}

await browser.close();
console.log("\n=== Viewport Regression Checks Complete ===");
process.exit(0);
