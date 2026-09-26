import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--window-size=1350,940", "--incognito"],
  defaultViewport: { width: 1350, height: 940 },
});

const page = await browser.newPage();

await page.evaluateOnNewDocument(() => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        window.__shifts.push({
          value: entry.value,
          startTime: entry.startTime,
          sources: (entry.sources || []).map((s) => ({
            node: s.node ? (s.node.nodeName + (s.node.className ? "." + s.node.className.split(" ")[0] : "")) : null,
            prev: s.previousRect ? { top: s.previousRect.top, bottom: s.previousRect.bottom, height: s.previousRect.height } : null,
            curr: s.currentRect ? { top: s.currentRect.top, bottom: s.currentRect.bottom, height: s.currentRect.height } : null,
          })),
        });
      }
    }
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });

const shifts = await page.evaluate(() => window.__shifts);
console.log("All recorded layout shifts:");
console.log(JSON.stringify(shifts, null, 2));

await browser.close();
process.exit(0);
