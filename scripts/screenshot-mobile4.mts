import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4500));
const diag = await page.evaluate(() => {
  // List ALL rounded-[NNpx] divs + any element with a big fixed height (the demo card is 530-540px tall)
  const out: string[] = [];
  document.querySelectorAll("body *").forEach((el) => {
    const c = String((el as HTMLElement).className || "");
    const r = el.getBoundingClientRect();
    if ((c.includes("rounded-[40px]") || c.includes("rounded-[30px]") || (r.height > 480 && r.height < 600 && r.width > 200 && r.width < 340)) && r.width > 0) {
      out.push(`${el.tagName} cls="${c.slice(0, 70)}" rect=${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  return out.slice(0, 6);
});
console.log(diag.join("\n") || "no candidates");
await browser.close();
