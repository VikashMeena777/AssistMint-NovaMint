import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4000));
const check = await page.evaluate(() => {
  const html = document.body.innerHTML;
  const hasRelativeDemo = html.includes("relative w-full max-w-md");
  const hasOldDemo = html.includes("w-full max-w-md select-none") && !html.includes("relative w-full max-w-md");
  // find the chat card wherever it is
  const header = Array.from(document.querySelectorAll("p")).find((p) => p.textContent && p.textContent.trim() === "Sharma Ji Café");
  let cardPainted = null, headerRect = null;
  if (header) {
    headerRect = { top: Math.round(header.getBoundingClientRect().top), h: Math.round(header.getBoundingClientRect().height) };
    let card = header;
    while (card && !String(card.className).includes("rounded-2xl")) card = card.parentElement;
    if (card) {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const probeY = Math.max(1, Math.min(r.top + 30, window.innerHeight - 1));
      const el = document.elementFromPoint(cx, probeY);
      cardPainted = el && (el === card || card.contains(el)) ? "CARD VISIBLE (fix works)" : "STILL COVERED by " + (el ? el.tagName + "." + String(el.className).slice(0, 35) : "none");
    }
  }
  return { newRelativeClassDeployed: hasRelativeDemo, oldClassStill: hasOldDemo, headerFound: !!header, headerRect, cardPainted };
});
console.log(JSON.stringify(check, null, 2));
await browser.close();
