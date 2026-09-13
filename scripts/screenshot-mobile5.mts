import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text().slice(0, 120)); });
page.on("pageerror", (err) => errors.push("PAGEERROR: " + String(err).slice(0, 120)));
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 5000));
const diag = await page.evaluate(() => {
  const out: Record<string, unknown> = {};
  // Is the chat demo component in the DOM at all?
  out.hasLazyWrapper = !!document.querySelector("[class*='chat-thread']");
  out.hasWhatsAppHeader = document.body.innerHTML.includes("Sharma Ji Café") || document.body.innerHTML.includes("Spice Garden");
  // The hero grid children
  const heroGrid = document.querySelector("section .grid") || document.querySelector("main .grid");
  if (heroGrid) {
    const kids = Array.from(heroGrid.children).map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName} ${Math.round(r.width)}x${Math.round(r.height)} top=${Math.round(r.top)}`;
    });
    out.heroGridKids = kids;
  }
  // any element with opacity 0 covering things?
  const invisible: string[] = [];
  document.querySelectorAll("main *").forEach((el) => {
    const c = String((el as HTMLElement).className || "");
    if (c.includes("opacity-0") && el.getBoundingClientRect().height > 200) invisible.push(`${el.tagName} ${c.slice(0, 50)} h=${Math.round(el.getBoundingClientRect().height)}`);
  });
  out.bigInvisible = invisible.slice(0, 4);
  return out;
});
console.log(JSON.stringify({ ...diag, consoleErrors: errors.slice(0, 5) }, null, 2));
await browser.close();
