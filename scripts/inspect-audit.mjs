import fs from "node:fs";

function analyze(filePath, name) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const lhr = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`\n========================================`);
  console.log(`DETAILED AUDIT ANALYSIS: ${name}`);
  console.log(`Scores -> Perf: ${Math.round(lhr.categories.performance?.score * 100)}, A11y: ${Math.round(lhr.categories.accessibility?.score * 100)}, BP: ${Math.round(lhr.categories['best-practices']?.score * 100)}, SEO: ${Math.round(lhr.categories.seo?.score * 100)}`);
  console.log(`Metrics -> FCP: ${lhr.audits['first-contentful-paint']?.displayValue}, LCP: ${lhr.audits['largest-contentful-paint']?.displayValue}, TBT: ${lhr.audits['total-blocking-time']?.displayValue}, CLS: ${lhr.audits['cumulative-layout-shift']?.displayValue}`);

  console.log(`\n--- ALL ACCESSIBILITY ISSUES ---`);
  lhr.categories.accessibility?.auditRefs.forEach((ref) => {
    const audit = lhr.audits[ref.id];
    if (audit && audit.score !== null && audit.score < 1) {
      console.log(`\n[${audit.id}] (Weight: ${ref.weight}): ${audit.title}`);
      console.log(`Description: ${audit.description}`);
      if (audit.details?.items) {
        audit.details.items.forEach((item, i) => {
          console.log(`  Item ${i + 1}:`);
          if (item.node) {
            console.log(`    Selector: ${item.node.selector}`);
            console.log(`    Snippet: ${item.node.snippet}`);
            console.log(`    Explanation: ${item.node.explanation || ''}`);
          }
          if (item.contrastRatio) {
            console.log(`    Contrast: ${item.contrastRatio} (Expected: ${item.thresholdRatio})`);
            console.log(`    FG: ${item.foregroundColor}, BG: ${item.backgroundColor}`);
          }
          if (item.targetSize) {
            console.log(`    Target size: ${JSON.stringify(item.targetSize)}`);
          }
        });
      }
    }
  });

  console.log(`\n--- LAYOUT SHIFTS ---`);
  const clsAudit = lhr.audits['layout-shifts'];
  if (clsAudit?.details?.items) {
    clsAudit.details.items.forEach((item, i) => {
      console.log(`Shift ${i + 1}: Score: ${item.score}, Element: ${item.node?.selector || item.node?.snippet}`);
    });
  }

  console.log(`\n--- NON-COMPOSITED ANIMATIONS ---`);
  const animAudit = lhr.audits['non-composited-animations'];
  if (animAudit?.details?.items) {
    console.log(`Total non-composited animations: ${animAudit.details.items.length}`);
    animAudit.details.items.slice(0, 15).forEach((item, i) => {
      console.log(`  Anim ${i + 1}: Element: ${item.node?.selector}, Failure reasons: ${item.subItems?.items?.map(s => s.failureReason).join(', ')}`);
    });
  }

  console.log(`\n--- BF-CACHE ---`);
  const bfAudit = lhr.audits['bf-cache'];
  if (bfAudit) {
    console.log(`BF-Cache Score: ${bfAudit.score}, Display: ${bfAudit.displayValue}`);
    if (bfAudit.details?.items) {
      console.log(`BF-Cache details:`, JSON.stringify(bfAudit.details.items, null, 2));
    }
  }

  console.log(`\n--- OVERSIZED / UNRESPONSIVE IMAGES ---`);
  const imgAudit = lhr.audits['uses-responsive-images'];
  if (imgAudit?.details?.items) {
    imgAudit.details.items.forEach((item, i) => {
      console.log(`  Img ${i + 1}: URL: ${item.url}, Wasted: ${item.wastedBytes} bytes, Total: ${item.totalBytes} bytes`);
    });
  }

  console.log(`\n--- UNUSED JAVASCRIPT ---`);
  const jsAudit = lhr.audits['unused-javascript'];
  if (jsAudit?.details?.items) {
    jsAudit.details.items.forEach((item, i) => {
      console.log(`  JS ${i + 1}: URL: ${item.url}, Wasted: ${item.wastedBytes} bytes, Total: ${item.totalBytes} bytes`);
    });
  }
}

analyze('./lighthouse-mobile.json', 'MOBILE AUDIT');
analyze('./lighthouse-desktop.json', 'DESKTOP AUDIT');
