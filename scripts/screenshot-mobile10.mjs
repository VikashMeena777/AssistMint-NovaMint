import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4500));
const probeFn = () => {
  // Find the hero demo by its WhatsApp chat header text
  const all = Array.from(document.querySelectorAll("div"));
  const chatHeader = all.find((d) => d.textContent && (d.textContent.includes("Spice Garden") || d.textContent.includes("Sharma Ji")) && d.textContent.length < 200 && d.getBoundingClientRect().height > 30 && d.getBoundingClientRect().height < 80);
  if (!chatHeader) return { result: "chat header not found" };
  // The demo card is the rounded ancestor
  let card = chatHeader;
  for (let i = 0; i < 6; i++) {
    card = card.parentElement;
    if (!card) break;
    const c = String(card.className || "");
    if (c.includes("rounded-[40px]") || c.includes("rounded-[30px]")) break;
  }
  if (!card) return { result: "card not found" };
  const r = card.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const probe = (y) => {
    if (y < 0 || y > window.innerHeight - 1) return "off(y=" + Math.round(y) + ")";
    const el = document.elementFromPoint(cx, y);
    if (el === card || card.contains(el)) return "demo-visible";
    return el.tagName + "." + String(el.className || "").slice(0, 50);
  };
  return {
    cardTop: Math.round(r.top), cardH: Math.round(r.height), cardW: Math.round(r.width),
    cardLeft: Math.round(r.left), cardRight: Math.round(r.right), vw: window.innerWidth,
    atHeaderY: probe(r.top + 40),
    atMid: probe(r.top + r.height / 2),
    atInput: probe(r.bottom - 40),
    horizontalOverflow: r.right > window.innerWidth || r.left < 0,
  };
};
for (const scrollY of [0, 400, 700, 900]) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await new Promise((r) => setTimeout(r, 700));
  console.log("scroll=" + scrollY, JSON.stringify(await page.evaluate(probeFn)));
}
await browser.close();
