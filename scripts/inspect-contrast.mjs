import fs from "node:fs";

const m = JSON.parse(fs.readFileSync("./lighthouse-mobile.json", "utf8"));
const c = m.audits["color-contrast"];
console.log("Total items:", c.details?.items?.length);
c.details?.items?.forEach((item, i) => {
  console.log(`\n--- Item ${i + 1} ---`);
  console.log("Snippet:", item.node?.snippet);
  console.log("Selector:", item.node?.selector);
  console.log("Explanation:", item.node?.explanation);
  for (const [k, v] of Object.entries(item)) {
    if (k !== 'node') console.log(`  ${k}:`, v);
  }
});
