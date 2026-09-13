import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4000));
// Diagnostics: hero element geometry + what's at the overlap point
const diag = await page.evaluate(() => {
  const results: Record<string, unknown> = {};
  const hero = document.querySelector("section") || document.querySelector("main > div");
  if (hero) {
    const r = hero.getBoundingClientRect();
    results.heroSection = { top: r.top, height: r.height, bottom: r.bottom, viewportH: window.innerHeight };
  }
  // any element that overflows the viewport horizontally?
  const wide: string[] = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > window.innerWidth + 4 && r.width < 10000) {
      wide.push(`${(el as HTMLElement).tagName}.${String((el as HTMLElement).className).slice(0, 50)} w=${Math.round(r.width)}`);
    }
  });
  results.wideElements = wide.slice(0, 8);
  // elements overlapping the chat demo card
  const card = document.querySelector("[class*='chat-thread']") || document.querySelector("[class*='rounded-[40px]']") || document.querySelector("[class*='max-w-[285px]']");
  if (card) {
    const cr = card.getBoundingClientRect();
    results.chatCard = { top: cr.top, left: cr.left, width: cr.width, height: cr.height, bottom: cr.bottom, offscreenBottom: cr.bottom - window.innerHeight };
    // what covers its center?
    const cx = cr.left + cr.width / 2;
    const cy = Math.max(0, Math.min(cr.top + 40, window.innerHeight - 1));
    const top = document.elementFromPoint(cx, cy);
    results.atCardTop = top ? `${(top as HTMLElement).tagName}.${String((top as HTMLElement).className).slice(0, 60)}` : "off-viewport";
    const top2 = document.elementFromPoint(cx, window.innerHeight - 60);
    results.atViewportBottom = top2 ? `${(top2 as HTMLElement).tagName}.${String((top2 as HTMLElement).className).slice(0, 60)}` : "off-viewport";
  } else {
    results.chatCard = "NOT FOUND";
  }
  results.scrollY = window.scrollY;
  results.docHeight = document.body.scrollHeight;
  return results;
});
console.log(JSON.stringify(diag, null, 2));
await page.screenshot({ path: "../_audit/mobile-hero-390-v2.png" });
await browser.close();
