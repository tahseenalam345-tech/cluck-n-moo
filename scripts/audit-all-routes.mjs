import fs from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const routes = [
  { name: "Homepage", path: "/" },
  { name: "Menu", path: "/menu" },
  { name: "Deals", path: "/deals" },
  { name: "Order Track", path: "/order/track" },
  { name: "Account", path: "/account" },
  { name: "Staff Login", path: "/staff/login" },
];

const chromeFlags = [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--incognito",
];

const results = [];

for (const route of routes) {
  console.log(`\n========================================`);
  console.log(`AUDITING ROUTE: ${route.name} (${route.path})`);
  console.log(`========================================`);

  for (const mode of ["desktop", "mobile"]) {
    console.log(`Running ${mode} audit for ${route.path}...`);
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

      const targetUrl = `http://localhost:3000${route.path}`;
      const runnerResult = await lighthouse(targetUrl, options, config);
      const lhr = runnerResult.lhr;

      const a11yFailures = [];
      Object.keys(lhr.audits).forEach((key) => {
        const audit = lhr.audits[key];
        if (
          audit.score !== null &&
          audit.score < 1 &&
          lhr.categories.accessibility?.auditRefs.some((r) => r.id === key)
        ) {
          a11yFailures.push({
            id: key,
            title: audit.title,
            items: audit.details?.items?.map((item) => item.node?.snippet || item.node?.selector || item.id) || [],
          });
        }
      });

      const routeResult = {
        route: route.name,
        path: route.path,
        mode,
        scores: {
          performance: Math.round((lhr.categories.performance?.score || 0) * 100),
          accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((lhr.categories["best-practices"]?.score || 0) * 100),
          seo: Math.round((lhr.categories.seo?.score || 0) * 100),
        },
        metrics: {
          fcp: lhr.audits["first-contentful-paint"]?.displayValue,
          lcp: lhr.audits["largest-contentful-paint"]?.displayValue,
          tbt: lhr.audits["total-blocking-time"]?.displayValue,
          cls: lhr.audits["cumulative-layout-shift"]?.displayValue,
          speedIndex: lhr.audits["speed-index"]?.displayValue,
        },
        a11yFailures,
      };

      results.push(routeResult);
      console.log(`[${route.name} - ${mode}] Perf: ${routeResult.scores.performance} | A11y: ${routeResult.scores.accessibility} | CLS: ${routeResult.metrics.cls} | TBT: ${routeResult.metrics.tbt} | A11y Fails: ${a11yFailures.length}`);

    } catch (e) {
      console.error(`Error auditing ${route.path} on ${mode}:`, e.message);
    } finally {
      try {
        await chrome.kill();
      } catch (err) {}
    }
  }
}

fs.writeFileSync("./routes-audit-results.json", JSON.stringify(results, null, 2));
console.log("\nAll audits complete! Saved to routes-audit-results.json");
process.exit(0);
