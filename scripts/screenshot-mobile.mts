import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4000)); // let the chat demo hydrate + play
await page.screenshot({ path: "../_audit/mobile-hero-390.png", fullPage: false });
console.log("screenshot saved: mobile-hero-390.png");
await browser.close();
