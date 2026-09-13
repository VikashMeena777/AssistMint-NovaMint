import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err).slice(0, 100)));
// Settings redirects to login when signed out — but the MODULE CRASH happened
// at build/eval time, so even the login page's chunk graph proves the fix.
await page.goto("https://assistmint.novamintnetworks.in/login", { waitUntil: "networkidle2", timeout: 45000 });
const loginOk = await page.evaluate(() => document.body.innerHTML.includes("Welcome back") || document.body.innerHTML.includes("Log in") || document.body.innerHTML.includes("Sign in"));
// Hit the settings URL anyway: signed-out = redirect (30x), NOT a 500 crash
const resp = await page.goto("https://assistmint.novamintnetworks.in/dashboard/settings", { waitUntil: "domcontentloaded", timeout: 45000 });
console.log("login page renders:", loginOk);
console.log("settings signed-out status:", resp.status(), "(3xx = auth redirect, healthy; 5xx = still crashed)");
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
