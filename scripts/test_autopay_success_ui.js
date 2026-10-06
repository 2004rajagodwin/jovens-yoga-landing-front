import { chromium } from "playwright";

async function testAutoPaySuccessPage() {
  const browser = await chromium.launch({ headless: true });

  const mockAutoPayTrial = {
    id: 269,
    status: "TRIAL_EXPIRED",
    trialStartDate: "2026-10-06T07:00:00",
    trialExpiryDate: "2026-10-06T23:59:59",
    planId: 2,
    planName: "Standard",
    userId: 295,
    firstName: "Godwin",
    lastName: "Raja",
    email: "godwin@example.com",
    mobileNumber: "6382894120",
    countryPhoneCode: "+91",
    countryRegion: "India",
    planDurationId: 2,
    durationLabel: "Per Month",
    price: 999,
    currency: "INR",
    slotId: 67,
    slotLabel: "Morning Batch",
    slotDate: "2026-10-10",
    slotStartTime: "07:00:00",
    stripeSubscriptionId: "sub_1UNWwdRxgrePX6zq3asfILJ4",
    paymentAmount: 999,
    paymentCurrency: "INR",
    paymentDate: "2026-10-06T18:12:23",
    paymentReference: "evt_1UNXhJRxgrePX6zqQkHRRhDZ",
    autoPayCancelled: false,
  };

  const mockFreeTrial = {
    id: 271,
    status: "TRIAL_ACTIVE",
    trialStartDate: "2026-10-10T07:00:00",
    trialExpiryDate: "2026-10-16T23:59:59",
    planId: 2,
    planName: "Standard",
    userId: 297,
    firstName: "Kavitha",
    lastName: "Raman",
    email: "kavitha@example.com",
    mobileNumber: "6382894120",
    countryPhoneCode: "+91",
    countryRegion: "India",
    planDurationId: 2,
    durationLabel: "Per Month",
    price: 999,
    currency: "INR",
    slotId: 67,
    slotLabel: "Morning Batch",
    slotDate: "2026-10-10",
    slotStartTime: "07:00:00",
    stripeSubscriptionId: "sub_1UNYokRxgrePX6zqgxYBs3aB",
    paymentAmount: null,
    paymentCurrency: null,
    paymentDate: null,
    paymentReference: null,
    autoPayCancelled: false,
  };

  const consoleErrors = [];

  // ==========================================
  // TEST 1: AutoPay Plan Activated on Desktop
  // ==========================================
  console.log("--- 1. Testing AutoPay Plan Activated on Desktop (1280x900) ---");
  const contextDesktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const pageDesktop = await contextDesktop.newPage();
  pageDesktop.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[Desktop Console Error] ${msg.text()}`);
  });

  await pageDesktop.route("**/api/trials/access/test-autopay-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockAutoPayTrial,
      }),
    });
  });

  await pageDesktop.goto("http://localhost:5173/thank-you?type=trial&token=test-autopay-token", {
    waitUntil: "networkidle",
  });

  await pageDesktop.waitForSelector(".thankyou-main-card", { timeout: 5000 });

  const titleText = await pageDesktop.textContent(".thankyou-title");
  console.log(`Title: "${titleText.trim()}"`);
  if (!titleText.includes("Godwin")) throw new Error("Title should include user's name Godwin");

  const subtitleText = await pageDesktop.textContent(".thankyou-status-subtitle");
  console.log(`Subtitle: "${subtitleText.trim()}"`);
  if (!subtitleText.includes("Standard Plan is now active")) throw new Error("Subtitle missing Standard Plan is now active");

  const welcomeMsg = await pageDesktop.textContent(".thankyou-welcome-msg");
  console.log(`Confirmation Message: "${welcomeMsg.trim()}"`);
  if (!welcomeMsg.includes("Your AutoPay payment was successful")) {
    throw new Error("Confirmation message missing AutoPay payment was successful text");
  }

  // Verify details rows
  const detailRows = await pageDesktop.$$eval(".thankyou-detail-row", (rows) =>
    rows.map((r) => ({
      label: r.querySelector(".thankyou-detail-label")?.textContent?.trim(),
      value: r.querySelector(".thankyou-detail-value")?.textContent?.trim(),
    }))
  );
  console.log("Details Box Rows:", JSON.stringify(detailRows, null, 2));

  const planRow = detailRows.find((r) => r.label === "Plan");
  if (!planRow || planRow.value !== "Standard") throw new Error("Expected Plan: Standard");

  const regRow = detailRows.find((r) => r.label === "Registration ID");
  if (!regRow || regRow.value !== "269") throw new Error("Expected Registration ID: 269");

  const dateRow = detailRows.find((r) => r.label === "Payment Date");
  if (!dateRow || dateRow.value !== "06/10/2026") throw new Error("Expected Payment Date: 06/10/2026");

  const amountRow = detailRows.find((r) => r.label === "Amount Paid");
  if (!amountRow || !amountRow.value.includes("INR 999")) throw new Error("Expected Amount Paid: INR 999");

  const startRow = detailRows.find((r) => r.label === "Plan Start");
  if (!startRow || startRow.value !== "06/10/2026") throw new Error("Expected Plan Start: 06/10/2026");

  const expiryRow = detailRows.find((r) => r.label === "Plan Expiry");
  if (!expiryRow || expiryRow.value !== "06/11/2026") throw new Error("Expected Plan Expiry: 06/11/2026");

  const slotRow = detailRows.find((r) => r.label === "Selected Slot");
  if (!slotRow || !slotRow.value.includes("Morning Batch — 10/10/2026")) {
    throw new Error("Expected Selected Slot: Morning Batch — 10/10/2026");
  }

  // Check buttons
  const homeBtn = pageDesktop.locator(".thankyou-btn-home");
  const waBtn = pageDesktop.locator(".thankyou-btn-whatsapp");
  console.log("Back to Home visible:", await homeBtn.isVisible());
  console.log("WhatsApp button visible:", await waBtn.isVisible());
  console.log("WhatsApp link href:", await waBtn.getAttribute("href"));

  // Check that Free Trial notice card is NOT shown
  const noticeCardCount = await pageDesktop.locator(".thankyou-notice-card").count();
  console.log("Notice card count (should be 0 for AutoPay):", noticeCardCount);
  if (noticeCardCount !== 0) throw new Error("Free Trial Notice card should NOT be on AutoPay page");

  // Save desktop screenshot
  await pageDesktop.screenshot({ path: "scripts/autopay_desktop.png", fullPage: true });
  console.log("Desktop screenshot saved to scripts/autopay_desktop.png");

  // ==========================================
  // TEST 2: AutoPay Plan Activated on Mobile
  // ==========================================
  console.log("\n--- 2. Testing AutoPay Plan Activated on Mobile (390x844) ---");
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  const pageMobile = await contextMobile.newPage();
  pageMobile.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[Mobile Console Error] ${msg.text()}`);
  });

  await pageMobile.route("**/api/trials/access/test-autopay-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockAutoPayTrial,
      }),
    });
  });

  await pageMobile.goto("http://localhost:5173/thank-you?type=trial&token=test-autopay-token", {
    waitUntil: "networkidle",
  });

  await pageMobile.waitForSelector(".thankyou-main-card", { timeout: 5000 });

  // Verify responsive card width does not overflow
  const cardBox = await pageMobile.locator(".thankyou-main-card").boundingBox();
  console.log(`Mobile card width: ${cardBox.width}px (viewport 390px)`);
  if (cardBox.width > 390) throw new Error("Card width exceeds viewport width!");

  await pageMobile.screenshot({ path: "scripts/autopay_mobile.png", fullPage: true });
  console.log("Mobile screenshot saved to scripts/autopay_mobile.png");

  // ==========================================
  // TEST 3: Free Trial Thank You Page Intact
  // ==========================================
  console.log("\n--- 3. Testing Free Trial Thank You Page (Unchanged) ---");
  const pageTrial = await contextDesktop.newPage();
  await pageTrial.route("**/api/trials/access/test-free-trial-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockFreeTrial,
      }),
    });
  });

  await pageTrial.goto("http://localhost:5173/thank-you?type=trial&token=test-free-trial-token", {
    waitUntil: "networkidle",
  });

  await pageTrial.waitForSelector(".thankyou-main-card", { timeout: 5000 });
  const trialSubtitle = await pageTrial.textContent(".thankyou-status-subtitle");
  console.log(`Free Trial Subtitle: "${trialSubtitle.trim()}"`);
  if (!trialSubtitle.includes("Free Trial is Active")) {
    throw new Error("Free Trial page should preserve Free Trial is Active subtitle");
  }

  const freeTrialNoticeCount = await pageTrial.locator(".thankyou-notice-card").count();
  console.log("Free trial notice card count (should be 1):", freeTrialNoticeCount);
  if (freeTrialNoticeCount !== 1) throw new Error("Free Trial Notice card should exist on free trial page");

  // ==========================================
  // Summary
  // ==========================================
  console.log("\n--- 4. Verification Summary ---");
  console.log(`Total console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error("Console Errors:", consoleErrors);
    throw new Error("Console errors encountered during testing");
  }

  await browser.close();
  console.log("\nALL AUTOPAY & FREE TRIAL UI VERIFICATIONS PASSED SUCCESSFULLY!");
}

testAutoPaySuccessPage().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
