import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
await page.goto("https://assistmint.novamintnetworks.in/", { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, 4500));
// full hero screenshot (text + demo stacked) and one scrolled to the demo
await page.screenshot({ path: "../_audit/m1-hero-top.png" });
await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" as ScrollBehavior }));
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: "../_audit/m2-demo.png" });
console.log("saved m1-hero-top.png + m2-demo.png");
await browser.close();
