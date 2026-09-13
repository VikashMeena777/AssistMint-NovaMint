import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4500));
const probeFn = () => {
  const grids = document.querySelectorAll("section .grid, main .grid");
  let demo = null;
  grids.forEach((g) => {
    Array.from(g.children).forEach((child) => {
      if (child.getBoundingClientRect().height > 500) demo = child;
    });
  });
  if (!demo) return { result: "no demo found" };
  const r = demo.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const probe = (y) => {
    if (y < 0 || y > window.innerHeight - 1) return "off(y=" + Math.round(y) + ")";
    const el = document.elementFromPoint(cx, y);
    if (el === demo || demo.contains(el)) return "demo-visible";
    return el.tagName + "." + String(el.className || "").slice(0, 45);
  };
  return {
    demoTop: Math.round(r.top),
    demoH: Math.round(r.height),
    at50: probe(50),
    atDemoTop: probe(r.top + 30),
    atDemoMid: probe(r.top + r.height / 2),
    atDemoBot: probe(r.bottom - 30),
  };
};
for (const scrollY of [0, 300, 600, 750, 900]) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await new Promise((r) => setTimeout(r, 800));
  console.log("scroll=" + scrollY, JSON.stringify(await page.evaluate(probeFn)));
}
await browser.close();
