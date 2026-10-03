import { chromium } from "playwright";

async function testThankYouPageDynamic() {
  const browser = await chromium.launch({ headless: true });

  const mockTrialUS = {
    id: 108,
    status: "TRIAL_ACTIVE",
    trialStartDate: "2026-09-16T13:45:16",
    trialExpiryDate: "2026-09-21T13:45:16",
    planId: 1,
    planName: "Standard",
    userId: 105,
    firstName: "Godwin",
    lastName: "Smith",
    email: "godwin@example.com",
    mobileNumber: "2125551234",
    countryPhoneCode: "+1",
    countryRegion: "United States",
    planDurationId: 2,
    durationLabel: "Per Month",
    price: 19.19,
    currency: "INR",
    slotId: 12,
    slotLabel: "Evening Batch",
    slotDate: "2026-09-24",
    slotStartTime: "17:05",
    stripeSubscriptionId: "sub_mock123",
    paymentAmount: null,
    paymentCurrency: null,
    paymentDate: null,
    paymentReference: null,
    autoPayCancelled: false,
  };

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  await page.route("**/api/trials/access/test-token-ref*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Trial retrieved.",
        code: "OK",
        data: mockTrialUS,
      }),
    });
  });

  await page.goto("http://localhost:5173/thank-you?type=trial&token=test-token-ref", {
    waitUntil: "networkidle",
  });

  await page.screenshot({ path: "scripts/thankyou_reference_match.png", fullPage: true });
  console.log("Reference matching screenshot saved to scripts/thankyou_reference_match.png");

  await browser.close();
}

testThankYouPageDynamic().catch(console.error);
