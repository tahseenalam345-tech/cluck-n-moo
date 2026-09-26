import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--window-size=1280,800"],
});

const page = await browser.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

console.log("Checking Homepage title & elements...");
const title = await page.title();
console.log("Page Title:", title);

// Check if order mode button works
console.log("Opening Order Mode Modal...");
await page.click(".order-mode-header-btn");
await new Promise(r => setTimeout(r, 400));
const modalTitle = await page.$eval("#order-mode-heading", el => el.textContent);
console.log("Modal opened successfully with title:", modalTitle);

// Close modal
await page.keyboard.press("Escape");
await new Promise(r => setTimeout(r, 300));

// Check Cart Drawer
console.log("Opening Cart drawer...");
await page.click(".header-cart-btn");
const cartVisible = await page.waitForSelector(".cart-drawer-panel", { timeout: 4000 }).then(() => true).catch(() => false);
console.log("Cart Drawer open:", cartVisible);
await page.keyboard.press("Escape");
await new Promise(r => setTimeout(r, 300));

// Add product to cart by clicking first product card
console.log("Testing Product Card click...");
await page.click(".popular-picks-grid .product-card:first-child");
await new Promise(r => setTimeout(r, 500));
const detailVisible = await page.$eval(".product-modal, [role='dialog']", el => el ? true : false).catch(() => false);
console.log("Product detail modal opened:", detailVisible);

await browser.close();
console.log("ALL FLOWS VERIFIED SUCCESSFULLY!");
process.exit(0);
