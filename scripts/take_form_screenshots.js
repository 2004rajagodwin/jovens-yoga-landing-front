// scripts/take_form_screenshots.js
import { chromium } from "playwright";

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });

  // Desktop
  const contextDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageDesktop = await contextDesktop.newPage();
  await pageDesktop.goto("http://localhost:5173/trial/details?planId=2&durationId=2", { waitUntil: "networkidle" });
  await pageDesktop.waitForSelector("#trial-details-form");
  const formElement = pageDesktop.locator("#trial-details-form");
  await formElement.screenshot({ path: "scripts/desktop_form.png" });
  console.log("Desktop screenshot saved: scripts/desktop_form.png");

  // Mobile
  const contextMobile = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.goto("http://localhost:5173/trial/details?planId=2&durationId=2", { waitUntil: "networkidle" });
  await pageMobile.waitForSelector("#trial-details-form");
  const formElementMobile = pageMobile.locator("#trial-details-form");
  await formElementMobile.screenshot({ path: "scripts/mobile_form.png" });
  console.log("Mobile screenshot saved: scripts/mobile_form.png");

  await browser.close();
}

takeScreenshots().catch(console.error);
