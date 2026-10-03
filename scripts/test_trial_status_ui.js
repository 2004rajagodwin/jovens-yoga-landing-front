import { chromium } from "playwright";

async function testTrialStatusUI() {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // Current time: 2026-09-29T13:48:00
  // Let start be 2 days ago, expiry 3 days ahead -> usage should be roughly 40% (2 / 5 = 40%)
  const mockActiveTrial = {
    id: 190,
    status: "TRIAL_ACTIVE",
    trialStartDate: "2026-09-27T13:48:00",
    trialExpiryDate: "2026-10-02T13:48:00",
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
    stripeSubscriptionId: "sub_mock_active_123",
    paymentAmount: null,
    paymentCurrency: null,
    paymentDate: null,
    paymentReference: null,
    autoPayCancelled: false,
  };

  const mockExpiredTrial = {
    id: 185,
    status: "TRIAL_EXPIRED",
    trialStartDate: "2026-09-16T13:45:16",
    trialExpiryDate: "2026-09-21T13:45:16",
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
    slotDate: "2026-09-24",
    slotStartTime: "17:05",
    stripeSubscriptionId: null,
    paymentAmount: null,
    paymentCurrency: null,
    paymentDate: null,
    paymentReference: null,
    autoPayCancelled: true,
  };

  // --- 1. ACTIVE TRIAL TEST (Desktop 1280px) ---
  console.log("=== 1. Testing ACTIVE Trial on Desktop ===");
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageActive = await ctxDesktop.newPage();
  pageActive.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[Active Page Error] ${msg.text()}`);
  });

  await pageActive.route("**/api/trials/access/test-active-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockActiveTrial,
      }),
    });
  });

  await pageActive.goto("http://localhost:5173/trial/details?token=test-active-token", {
    waitUntil: "domcontentloaded",
  });
  await pageActive.waitForSelector(".trial-status-card", { state: "visible" });

  // Verify left panel
  const statusBadge = pageActive.locator(".trial-badge-status");
  console.log("Status badge text:", await statusBadge.innerText());
  const planBadge = pageActive.locator(".trial-badge-plan");
  console.log("Plan badge text:", await planBadge.innerText());
  const heading = pageActive.locator(".trial-status-title");
  console.log("Heading text:", await heading.innerText());
  const greeting = pageActive.locator(".trial-status-greeting");
  console.log("Greeting text:", await greeting.innerText());
  const yogaImg = pageActive.locator(".trial-status-yoga-img");
  console.log("Yoga image visible:", await yogaImg.isVisible());
  console.log("Yoga image src:", await yogaImg.getAttribute("src"));

  // Verify right panel
  const usagePct = pageActive.locator(".trial-usage-pct");
  const usageText = await usagePct.innerText();
  console.log("Usage percentage:", usageText);
  const progressBarFill = pageActive.locator(".trial-usage-bar-fill");
  const barStyle = await progressBarFill.getAttribute("style");
  console.log("Progress bar style:", barStyle);

  const datesRow = pageActive.locator(".trial-usage-dates");
  console.log("Dates row text:", await datesRow.innerText());

  const detailsRows = pageActive.locator(".trial-status-details-row");
  const rowsCount = await detailsRows.count();
  console.log("Details row count:", rowsCount);
  for (let i = 0; i < rowsCount; i++) {
    const l = await detailsRows.nth(i).locator(".trial-status-details-label").innerText();
    const v = await detailsRows.nth(i).locator(".trial-status-details-value").innerText();
    console.log(`  Detail row: ${l} => ${v}`);
  }

  const noticeText = pageActive.locator(".trial-status-notice-text");
  console.log("Notice text:", await noticeText.innerText());

  const viewBtn = pageActive.locator(".trial-status-btn-view");
  console.log("View My Trial Details button visible:", await viewBtn.isVisible());
  console.log("View button href:", await viewBtn.getAttribute("href"));

  const cancelBtn = pageActive.locator(".trial-status-btn-cancel");
  console.log("Cancel Subscription button visible:", await cancelBtn.isVisible());

  // Test Cancel Modal opening
  await cancelBtn.click();
  const cancelModal = pageActive.locator(".modal.show, [role='dialog']");
  console.log("Cancel AutoPay modal opened:", await cancelModal.isVisible());
  // Close modal
  const keepAutoPayBtn = pageActive.locator("button:has-text('Keep AutoPay'), button:has-text('Close'), .btn-secondary");
  if (await keepAutoPayBtn.count() > 0) {
    await keepAutoPayBtn.first().click();
  }

  await pageActive.screenshot({ path: "scripts/trial_active_desktop.png", fullPage: true });
  console.log("Saved active desktop screenshot to scripts/trial_active_desktop.png");

  // --- 2. EXPIRED TRIAL TEST (Desktop 1280px) ---
  console.log("\n=== 2. Testing EXPIRED Trial on Desktop ===");
  const pageExpired = await ctxDesktop.newPage();
  pageExpired.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[Expired Page Error] ${msg.text()}`);
  });

  await pageExpired.route("**/api/trials/access/test-expired-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockExpiredTrial,
      }),
    });
  });

  await pageExpired.goto("http://localhost:5173/trial/details?token=test-expired-token", {
    waitUntil: "domcontentloaded",
  });
  await pageExpired.waitForSelector(".trial-status-card", { state: "visible" });

  const expiredStatusBadge = pageExpired.locator(".trial-badge-status");
  console.log("Expired status badge:", await expiredStatusBadge.innerText());
  const expiredHeading = pageExpired.locator(".trial-status-title");
  console.log("Expired heading:", await expiredHeading.innerText());
  const expiredGreeting = pageExpired.locator(".trial-status-greeting");
  console.log("Expired greeting:", await expiredGreeting.innerText());
  const expiredUsagePct = pageExpired.locator(".trial-usage-pct");
  console.log("Expired usage percentage (should be 100%):", await expiredUsagePct.innerText());
  const payNowBtn = pageExpired.locator(".trial-status-btn-pay");
  console.log("Pay Now button visible:", await payNowBtn.isVisible());

  await pageExpired.screenshot({ path: "scripts/trial_expired_desktop.png", fullPage: true });
  console.log("Saved expired desktop screenshot to scripts/trial_expired_desktop.png");

  // --- 3. RESPONSIVE TESTS ---
  console.log("\n=== 3. Testing Tablet (768px) and Mobile (390px) ===");
  const ctxTablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const pageTablet = await ctxTablet.newPage();
  await pageTablet.route("**/api/trials/access/test-active-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: mockActiveTrial }),
    });
  });
  await pageTablet.goto("http://localhost:5173/trial/details?token=test-active-token", { waitUntil: "domcontentloaded" });
  await pageTablet.waitForSelector(".trial-status-card", { state: "visible" });
  await pageTablet.screenshot({ path: "scripts/trial_active_tablet.png", fullPage: true });
  console.log("Saved tablet screenshot to scripts/trial_active_tablet.png");

  const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageMobile = await ctxMobile.newPage();
  await pageMobile.route("**/api/trials/access/test-active-token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: mockActiveTrial }),
    });
  });
  await pageMobile.goto("http://localhost:5173/trial/details?token=test-active-token", { waitUntil: "domcontentloaded" });
  await pageMobile.waitForSelector(".trial-status-card", { state: "visible" });
  await pageMobile.screenshot({ path: "scripts/trial_active_mobile.png", fullPage: true });
  console.log("Saved mobile screenshot to scripts/trial_active_mobile.png");

  console.log("\nConsole errors count:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error("Console errors found:", consoleErrors);
  }

  await browser.close();
  console.log("All Trial Status UI tests finished!");
}

testTrialStatusUI().catch(console.error);
