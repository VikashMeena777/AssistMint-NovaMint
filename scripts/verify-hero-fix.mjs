import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 3000));
await page.evaluate(() => window.scrollTo(0, 700));
await new Promise((r) => setTimeout(r, 2500));
const check = await page.evaluate(() => {
  // Find the demo card root (relative wrapper with max-w-md)
  const demo = document.querySelector("div.relative.w-full.max-w-md");
  if (!demo) return "demo root not found";
  const inner = demo.querySelector("div.rounded-2xl");
  if (!inner) return "inner card not found";
  const cs = getComputedStyle(inner);
  // Is the header (bg-secondary/40 band) visible — i.e., painted above the backdrop?
  const header = demo.querySelector(".border-b.bg-secondary\/40");
  const headerVisible = header ? header.getBoundingClientRect().height > 0 : false;
  // backdrop slab: does it still cover the inner card at its center?
  const r = inner.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const el = document.elementFromPoint(cx, r.top + 30);
  const cardOnTop = el && (el === inner || inner.contains(el));
  return { headerBandHeight: header ? Math.round(header.getBoundingClientRect().height) : 0, cardPaintedOnTop: cardOnTop, elementAtCardTop: el ? el.tagName + "." + String(el.className).slice(0, 40) : "none" };
});
console.log("hero fix check:", JSON.stringify(check));
await page.screenshot({ path: "../_audit/m3-demo-fixed.png" });
await browser.close();
