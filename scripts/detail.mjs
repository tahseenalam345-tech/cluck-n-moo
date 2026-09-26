import fs from "node:fs";

const m = JSON.parse(fs.readFileSync("./lighthouse-mobile.json", "utf8"));
console.log("=== ARIA AUDITS ===");
for (const k of Object.keys(m.audits)) {
  if (k.startsWith("aria-")) {
    const a = m.audits[k];
    if (a.score !== null && a.score < 1) {
      console.log(`\nAudit [${k}]: ${a.title}`);
      console.log(`Score: ${a.score}, Explanation: ${a.explanation || a.description}`);
      console.log(JSON.stringify(a.details?.items, null, 2));
    }
  }
}

console.log("\n=== TOP CONTRAST FAILURES (FIRST 15) ===");
const c = m.audits["color-contrast"];
if (c && c.details?.items) {
  c.details.items.slice(0, 15).forEach((it, i) => {
    console.log(`[${i+1}] ${it.node?.snippet} | contrast: ${it.contrastRatio} (threshold: ${it.thresholdRatio}) | fg: ${it.foregroundColor}, bg: ${it.backgroundColor} | selector: ${it.node?.selector}`);
  });
}
