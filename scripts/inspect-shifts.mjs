import fs from "node:fs";

const file = process.argv[2] || "./lighthouse-mobile.json";
const m = JSON.parse(fs.readFileSync(file, "utf8"));
const cls = m.audits["layout-shifts"];
console.log(`CLS score for ${file}:`, m.audits["cumulative-layout-shift"].displayValue);
cls.details.items.forEach((item, i) => {
  console.log(`\n--- Shift ${i + 1} (score: ${item.score}) ---`);
  console.log("Node:", item.node?.snippet || item.node?.selector);
  if (item.subItems?.items) {
    item.subItems.items.forEach(s => {
      console.log("  SubItem node:", s.node?.snippet || s.node?.selector);
      console.log("  Previous Rect:", s.previousRect);
      console.log("  Current Rect:", s.currentRect);
    });
  }
});
