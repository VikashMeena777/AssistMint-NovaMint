import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4500));
// Scroll to the chat demo (it lazy-loads) then diagnose + shoot
await page.evaluate(() => {
  const card = document.querySelector("[class*='chat-thread-lazy']")?.querySelector("*") || document.querySelector("[class*='relative']");
  window.scrollTo({ top: 500, behavior: "instant" as ScrollBehavior });
});
await new Promise((r) => setTimeout(r, 2500));
const diag = await page.evaluate(() => {
  // find the demo card: the motion.div with rounded-[40px]
  let card: HTMLElement | null = null;
  document.querySelectorAll("div").forEach((el) => {
    if ((el as HTMLElement).className.includes && String((el as HTMLElement).className).includes("rounded-[40px]")) card = el as HTMLElement;
  });
  if (!card) return { card: "NOT FOUND", scrollY: window.scrollY };
  const cr = card.getBoundingClientRect();
  const cx = cr.left + cr.width / 2;
  const points: Record<string, string> = {};
  for (const [name, y] of [["cardTop", Math.max(1, cr.top + 30)], ["cardMid", cr.top + cr.height / 2], ["cardBottom", cr.bottom - 30]] as Array<[string, number]>) {
    if (y >= 0 && y <= window.innerHeight - 1) {
      const el = document.elementFromPoint(cx, y);
      points[name] = el && el !== card ? `${el.tagName}.${String((el as HTMLElement).className).slice(0, 50)} (covers card!)` : "card visible";
    } else points[name] = `off-viewport (y=${Math.round(y)})`;
  }
  return {
    card: { top: Math.round(cr.top), bottom: Math.round(cr.bottom), h: Math.round(cr.height), w: Math.round(cr.width), viewportH: window.innerHeight, extendsBelowViewport: cr.bottom > window.innerHeight },
    points,
    scrollY: window.scrollY,
  };
});
console.log(JSON.stringify(diag, null, 2));
await page.screenshot({ path: "../_audit/mobile-demo-scrolled.png" });
await browser.close();
