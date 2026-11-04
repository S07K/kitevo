import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1400, height: 780 } });
const blocked = []; p.on("console", (m) => /frame|refused|ancestors/i.test(m.text()) && blocked.push(m.text().slice(0, 160)));
await p.goto("file://" + process.argv[2] + "/t.html"); await p.waitForTimeout(9000);
for (const f of p.frames().slice(1)) console.log(f.url().slice(0, 70), "| text:", (await f.evaluate(() => document.body?.innerText?.slice(0, 60) ?? "").catch(() => "ERR")).replace(/\n/g, " "));
console.log("blocked:", blocked);
await p.screenshot({ path: process.argv[2] + "/embeds.png" });
await b.close();
