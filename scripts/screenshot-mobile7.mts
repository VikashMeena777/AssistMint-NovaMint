import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4500));
// Scroll through the hero in steps and check what covers the demo card's center at each step
for (const scrollY of [0, 300, 600, 750, 900]) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }), scrollY);
  await new Promise((r) => setTimeout(r, 800));
  const diag = await page.evaluate(() => {
    const grids = document.querySelectorAll("section .grid, main .grid");
    let demo: HTMLElement | null = null;
    // demo is the 2nd grid child (540px tall)
    for (const g of Array.from(grids)) {
      for (const child of Array.from(g.children)) {
        if (child.getBoundingClientRect().height > 500) demo = child as HTMLElement;
      }
    }
    if (!demo) return "no demo";
    const r = demo.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const probe = (y: number) => {
      if (y < 0 || y > window.innerHeight - 1) return `off(y=${Math.round(y)})`;
      const el = document.elementFromPoint(cx, y);
      return el === demo || demo.contains(el) ? "demo" : `${el?.tagName}.${String((el as HTMLElement)?.className || "").slice(0, 40)}`;
    };
    return {
      demoRect: `top=${Math.round(r.top)} h=${Math.round(r.height)}`,
      navbarZone: probe(50),
      demoTop: probe(r.top + 30),
      demoMid: probe(r.top + r.height / 2),
      demoBottom: probe(r.bottom - 30),
    };
  });
  console.log(`scrollY=${scrollY}:`, JSON.stringify(diag));
}
await browser.close();
