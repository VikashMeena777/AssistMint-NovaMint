import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 3500));
await page.evaluate(() => window.scrollTo(0, 650));
await new Promise((r) => setTimeout(r, 2500));
const check = await page.evaluate(() => {
  // find the chat header text node then verify its card paints above the backdrop
  const all = Array.from(document.querySelectorAll("div"));
  const header = all.find((d) => d.textContent && d.textContent.trim() === "Sharma Ji Café" && d.getBoundingClientRect().height > 10);
  if (!header) return { found: "header not found" };
  // card = the rounded-2xl ancestor
  let card = header;
  while (card && !String(card.className).includes("rounded-2xl")) card = card.parentElement;
  if (!card) return { found: "card ancestor not found" };
  const r = card.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const el = document.elementFromPoint(cx, Math.max(1, Math.min(r.top + 30, window.innerHeight - 1)));
  const cardPainted = el && (el === card || card.contains(el));
  return {
    found: "ok",
    headerHeight: Math.round(header.getBoundingClientRect().height),
    cardPaintedAboveBackdrop: cardPainted,
    elementAtCardTop: el ? el.tagName + "." + String(el.className).slice(0, 35) : "off-viewport",
  };
});
console.log(JSON.stringify(check));
await browser.close();
