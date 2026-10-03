import { chromium } from "playwright";

async function testThankYouPage() {
  const browser = await chromium.launch({ headless: true });

  const mockTrial = {
    id: 190,
    status: "TRIAL_ACTIVE",
    trialStartDate: "2026-10-02T19:00:00",
    trialExpiryDate: "2026-10-07T19:00:00",
    planId: 2,
    planName: "Standard",
    userId: 209,
    firstName: "Godwin",
    lastName: "s",
    email: "godwinrsssaja62@gmail.com",
    mobileNumber: "6332362630",
    countryPhoneCode: "+91",
    countryRegion: "India",
    planDurationId: 2,
    durationLabel: "Per Month",
    price: 999,
    currency: "INR",
    slotId: 12,
    slotLabel: "Evening Batch",
    slotDate: "2026-10-02",
    slotStartTime: "19:00:00",
    stripeSubscriptionId: "sub_1UKuMBRxgrePX6zq62UZbvzf",
    paymentAmount: null,
    paymentCurrency: null,
    paymentDate: null,
    paymentReference: null,
    autoPayCancelled: false,
  };

  const consoleErrors = [];

  // --- 1. Desktop Test (1280x900) ---
  const contextDesktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await contextDesktop.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.route("**/api/trials/access/test-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockTrial,
      }),
    });
  });

  console.log("Navigating to Thank You page on desktop...");
  await page.goto("http://localhost:5173/thank-you?type=trial&token=test-token", {
    waitUntil: "networkidle",
  });

  // Check buttons
  const buttonsGroup = page.locator(".thankyou-btn-group");
  console.log("Buttons group visible:", await buttonsGroup.isVisible());

  const homeBtn = page.locator(".thankyou-btn-home");
  console.log("Back to Home button visible:", await homeBtn.isVisible());
  console.log("Back to Home text:", await homeBtn.innerText());
  console.log("Back to Home href:", await homeBtn.getAttribute("href"));

  const waBtn = page.locator(".thankyou-btn-whatsapp");
  console.log("Join WhatsApp Community button visible:", await waBtn.isVisible());
  console.log("WhatsApp button text:", await waBtn.innerText());
  console.log("WhatsApp button href:", await waBtn.getAttribute("href"));
  console.log("WhatsApp button target:", await waBtn.getAttribute("target"));
  console.log("WhatsApp button rel:", await waBtn.getAttribute("rel"));

  // Check button order
  const actionLinks = page.locator(".thankyou-btn-group > *");
  const count = await actionLinks.count();
  console.log("Action buttons count:", count);
  const firstBtnText = await actionLinks.nth(0).innerText();
  const secondBtnText = await actionLinks.nth(1).innerText();
  console.log("Button 1 (should be Back to Home):", firstBtnText);
  console.log("Button 2 (should be Join WhatsApp Community):", secondBtnText);

  // Check background image on checkout page or body
  const bgImageOnPage = await page.evaluate(() => {
    const cp = document.querySelector(".checkout-page");
    const body = document.body;
    return {
      cpBg: window.getComputedStyle(cp).backgroundImage,
      bodyBg: window.getComputedStyle(body).backgroundImage,
      wrapperBg: window.getComputedStyle(document.querySelector(".thankyou-wrapper")).backgroundImage,
      bodyClass: document.body.className,
    };
  });
  console.log("Background image evaluation:", bgImageOnPage);

  // Take desktop screenshot
  await page.screenshot({ path: "scripts/thankyou_desktop_v3.png", fullPage: true });
  console.log("Desktop screenshot saved to scripts/thankyou_desktop_v3.png");

  // --- 2. Tablet Test (768x1024) ---
  const contextTablet = await browser.newContext({
    viewport: { width: 768, height: 1024 },
  });
  const pageTablet = await contextTablet.newPage();
  await pageTablet.route("**/api/trials/access/test-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockTrial,
      }),
    });
  });
  await pageTablet.goto("http://localhost:5173/thank-you?type=trial&token=test-token", {
    waitUntil: "networkidle",
  });
  await pageTablet.screenshot({ path: "scripts/thankyou_tablet_v3.png", fullPage: true });
  console.log("Tablet screenshot saved to scripts/thankyou_tablet_v3.png");

  // --- 3. Mobile Test (390x844) ---
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.route("**/api/trials/access/test-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockTrial,
      }),
    });
  });
  await pageMobile.goto("http://localhost:5173/thank-you?type=trial&token=test-token", {
    waitUntil: "networkidle",
  });
  await pageMobile.screenshot({ path: "scripts/thankyou_mobile_v3.png", fullPage: true });
  console.log("Mobile screenshot saved to scripts/thankyou_mobile_v3.png");

  console.log("Console errors count:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error("Errors found:", consoleErrors);
  }

  await browser.close();
  console.log("All UI tests finished successfully!");
}

testThankYouPage().catch(console.error);
