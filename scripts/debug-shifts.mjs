import * as chromeLauncher from "chrome-launcher";

const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--window-size=1350,940"],
});

const res = await fetch(`http://127.0.0.1:${chrome.port}/json/version`);
const ver = await res.json();
const wsEndpoint = ver.webSocketDebuggerUrl;

// Use WebSocket to communicate via CDP
const ws = new WebSocket(wsEndpoint);

await new Promise((resolve) => {
  ws.onopen = resolve;
});

let id = 1;
function send(method, params = {}) {
  return new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === curId) {
        ws.removeEventListener("message", handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
}

// Enable Page, Runtime
await send("Page.enable");
await send("Runtime.enable");

// Add script to evaluate on new document
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    window.__layoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__layoutShifts.push({
            value: entry.value,
            startTime: entry.startTime,
            sources: (entry.sources || []).map(s => ({
              nodeName: s.node ? s.node.nodeName : null,
              nodeClass: s.node ? s.node.className : null,
              nodeId: s.node ? s.node.id : null,
              prev: s.previousRect ? { x: s.previousRect.x, y: s.previousRect.y, w: s.previousRect.width, h: s.previousRect.height } : null,
              curr: s.currentRect ? { x: s.currentRect.x, y: s.currentRect.y, w: s.currentRect.width, h: s.currentRect.height } : null,
            }))
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  `
});

// Navigate
console.log("Navigating to http://localhost:3000/ ...");
await send("Page.navigate", { url: "http://localhost:3000/" });

// Wait 4 seconds for all fonts, hydrations, fetches to complete
await new Promise((r) => setTimeout(r, 4000));

// Evaluate window.__layoutShifts
const evalRes = await send("Runtime.evaluate", {
  expression: "JSON.stringify(window.__layoutShifts)",
  returnByValue: true,
});

console.log("Recorded shifts:", evalRes);

try {
  await chrome.kill();
} catch (e) {}
process.exit(0);
