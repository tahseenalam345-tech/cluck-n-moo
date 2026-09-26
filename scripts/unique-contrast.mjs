import fs from "node:fs";

const m = JSON.parse(fs.readFileSync("./lighthouse-mobile.json", "utf8"));
const c = m.audits["color-contrast"];
const items = c.details?.items || [];
console.log("Total contrast issues:", items.length);

const grouped = new Map();
items.forEach(it => {
  const snippet = it.node?.snippet || '';
  const selector = it.node?.selector || '';
  // simplify selector
  const key = snippet.slice(0, 80);
  if (!grouped.has(key)) {
    grouped.set(key, { count: 0, selector, snippet, explanation: it.node?.explanation });
  }
  grouped.get(key).count++;
});

console.log("\nUnique failing patterns:", grouped.size);
for (const [k, v] of grouped) {
  console.log(`\n[Count: ${v.count}] ${v.snippet}`);
  console.log(`Selector: ${v.selector}`);
  console.log(`Issue: ${v.explanation}`);
}
