import fs from "node:fs";

const m = JSON.parse(fs.readFileSync("./lighthouse-desktop.json", "utf8"));
const cls = m.audits["layout-shifts"];
console.log(JSON.stringify(cls, null, 2));
