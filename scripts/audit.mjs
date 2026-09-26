import fs from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const targetUrl = process.env.AUDIT_URL || "http://localhost:3000";
const mode = process.argv[2] || "mobile"; // "mobile" or "desktop"

console.log(`Starting Lighthouse audit for ${mode} on ${targetUrl}...`);

const chromeFlags = [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--incognito",
];

const chrome = await chromeLauncher.launch({
  chromeFlags,
  chromePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});

try {
  const options = {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  };

  const config = mode === "desktop"
    ? {
        extends: "lighthouse:default",
        settings: {
          formFactor: "desktop",
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          },
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0,
          },
        },
      }
    : {
        extends: "lighthouse:default",
        settings: {
          formFactor: "mobile",
          screenEmulation: {
            mobile: true,
            width: 412,
            height: 823,
            deviceScaleFactor: 2.625,
            disabled: false,
          },
        },
      };

  const runnerResult = await lighthouse(targetUrl, options, config);
  const reportJson = runnerResult.report;
  const lhr = runnerResult.lhr;

  const outputPath = `./lighthouse-${mode}.json`;
  fs.writeFileSync(outputPath, reportJson);

  console.log(`\n=== Lighthouse Results (${mode}) ===`);
  console.log(`Performance: ${Math.round(lhr.categories.performance?.score * 100)}`);
  console.log(`Accessibility: ${Math.round(lhr.categories.accessibility?.score * 100)}`);
  console.log(`Best Practices: ${Math.round(lhr.categories["best-practices"]?.score * 100)}`);
  console.log(`SEO: ${Math.round(lhr.categories.seo?.score * 100)}`);

  console.log(`\nMetrics:`);
  console.log(`- FCP: ${lhr.audits["first-contentful-paint"]?.displayValue}`);
  console.log(`- LCP: ${lhr.audits["largest-contentful-paint"]?.displayValue}`);
  console.log(`- TBT: ${lhr.audits["total-blocking-time"]?.displayValue}`);
  console.log(`- CLS: ${lhr.audits["cumulative-layout-shift"]?.displayValue}`);
  console.log(`- Speed Index: ${lhr.audits["speed-index"]?.displayValue}`);

  console.log(`\nAccessibility Failures:`);
  Object.keys(lhr.audits).forEach((key) => {
    const audit = lhr.audits[key];
    if (audit.score !== null && audit.score < 1 && lhr.categories.accessibility?.auditRefs.some(r => r.id === key)) {
      console.log(`- [${key}] ${audit.title}: ${audit.explanation || audit.description?.slice(0, 100)}`);
      if (audit.details?.items) {
        audit.details.items.slice(0, 5).forEach((item, i) => {
          console.log(`    Item ${i + 1}: ${item.node?.snippet || item.node?.selector || JSON.stringify(item)}`);
        });
      }
    }
  });

  console.log(`\nPerformance Opportunities & Diagnostics:`);
  [
    "render-blocking-resources",
    "unused-javascript",
    "unminified-javascript",
    "uses-responsive-images",
    "offscreen-images",
    "layout-shifts",
    "non-composited-animations",
    "mainthread-work-breakdown",
    "bootup-time",
    "bf-cache"
  ].forEach((key) => {
    const audit = lhr.audits[key];
    if (audit && (audit.score === null || audit.score < 1 || audit.numericValue > 0)) {
      console.log(`- [${key}] ${audit.title}: ${audit.displayValue || audit.numericValue || ''}`);
      if (audit.details?.items?.length) {
        console.log(`    Count / Top items: ${audit.details.items.length}`);
        audit.details.items.slice(0, 3).forEach((item, i) => {
          console.log(`      #${i + 1}: ${item.url || item.node?.snippet || item.node?.selector || item.groupLabel || JSON.stringify(item).slice(0, 120)}`);
        });
      }
    }
  });

} catch (err) {
  console.error("Error during audit:", err);
} finally {
  try {
    await chrome.kill();
  } catch (e) {
    // ignore Windows tmp file cleanup lock
  }
}
