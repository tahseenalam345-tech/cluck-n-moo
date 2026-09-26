import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--window-size=1350,940", "--incognito"],
  defaultViewport: { width: 1350, height: 940 },
});

const page = await browser.newPage();
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });

function getRects() {
  function toObj(r) {
    return r ? { top: r.top, bottom: r.bottom, height: r.height, width: r.width } : null;
  }
  return {
    header: toObj(document.getElementById("main-customer-header")?.getBoundingClientRect()),
    stripe: toObj(document.querySelector(".desktop-top-stripe")?.getBoundingClientRect()),
    carousel: toObj(document.querySelector(".promo-carousel-container")?.getBoundingClientRect()),
    sigNav: toObj(document.querySelector(".signature-navigation-wrapper")?.getBoundingClientRect()),
    searchBar: toObj(document.querySelector("main > div.container")?.getBoundingClientRect()),
    popular: toObj(document.querySelector(".popular-picks-section")?.getBoundingClientRect()),
  };
}

console.log("--- At 100ms ---");
const r100 = await page.evaluate(getRects);
console.log(JSON.stringify(r100, null, 2));

await new Promise((r) => setTimeout(r, 600));
console.log("--- At 700ms ---");
const r700 = await page.evaluate(getRects);
console.log(JSON.stringify(r700, null, 2));

await new Promise((r) => setTimeout(r, 1200));
console.log("--- At 1900ms ---");
const r1900 = await page.evaluate(getRects);
console.log(JSON.stringify(r1900, null, 2));

await browser.close();
process.exit(0);
