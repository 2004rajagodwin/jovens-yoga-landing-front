// scripts/test_browser_flow.js
import { chromium } from "playwright";

async function runBrowserTests() {
  console.log("================================================================================");
  console.log("JOVENS YOGA – REAL BROWSER UI & PLAYWRIGHT TEST SUITE");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkOtpRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("request", (req) => {
    if (req.url().includes("/api/auth/otp/send")) {
      networkOtpRequests.push(req.url());
    }
  });

  const results = [];
  function record(testName, passed, details = "") {
    results.push({ testName, passed, details });
    const status = passed ? "[PASS]" : "[FAIL]";
    console.log(`${status} ${testName} ${details ? "- " + details : ""}`);
  }

  // --- 1. Navigate to Trial Details Page ---
  console.log("--- 1. Navigating to Trial Details Page ---");
  await page.goto("http://localhost:5173/trial/details?planId=2&durationId=2", { waitUntil: "networkidle" });
  record("Page Load", page.url().includes("/trial/details"), `url=${page.url()}`);

  // Wait for the country select to be visible
  await page.waitForSelector("select[name='countryRegion']", { state: "visible" });

  // --- 2. Country Switch Test: India -> USA -> UK -> Canada -> Australia -> India ---
  console.log("\n--- 2. Dynamic Country Switching (Labels, Placeholders, Configs) ---");

  const countrySelect = page.locator("select[name='countryRegion']");
  const postalInput = page.locator("input[name='postalCode']");
  const postalLabel = page.locator("#trial-postal-label");

  // Switch to UK
  await countrySelect.selectOption("United Kingdom");
  await page.waitForTimeout(300);
  let labelText = await postalLabel.innerText();
  let placeholderText = await postalInput.getAttribute("placeholder");
  record("UK Switch Label", labelText.includes("Postcode"), `label="${labelText}"`);
  record("UK Switch Placeholder", placeholderText.includes("Postcode"), `placeholder="${placeholderText}"`);

  // Switch to Canada
  await countrySelect.selectOption("Canada");
  await page.waitForTimeout(300);
  labelText = await postalLabel.innerText();
  placeholderText = await postalInput.getAttribute("placeholder");
  record("Canada Switch Label", labelText.includes("Postal Code"), `label="${labelText}"`);
  record("Canada Switch Placeholder", placeholderText.includes("Postal Code"), `placeholder="${placeholderText}"`);

  // Switch to Australia
  await countrySelect.selectOption("Australia");
  await page.waitForTimeout(300);
  labelText = await postalLabel.innerText();
  placeholderText = await postalInput.getAttribute("placeholder");
  record("Australia Switch Label", labelText.includes("Postcode"), `label="${labelText}"`);
  record("Australia Switch Placeholder", placeholderText.includes("Postcode"), `placeholder="${placeholderText}"`);

  // Switch to India
  await countrySelect.selectOption("India");
  await page.waitForTimeout(300);
  labelText = await postalLabel.innerText();
  placeholderText = await postalInput.getAttribute("placeholder");
  record("India Switch Label", labelText.includes("PIN Code"), `label="${labelText}"`);
  record("India Switch Placeholder", placeholderText.includes("PIN Code"), `placeholder="${placeholderText}"`);

  // Switch to United States
  await countrySelect.selectOption("United States");
  await page.waitForTimeout(300);
  labelText = await postalLabel.innerText();
  placeholderText = await postalInput.getAttribute("placeholder");
  record("USA Switch Label", labelText.includes("ZIP Code"), `label="${labelText}"`);
  record("USA Switch Placeholder", placeholderText.includes("ZIP Code"), `placeholder="${placeholderText}"`);

  // --- 3. Bug Reproduction & Fix Verification ---
  console.log("\n--- 3. Postal Country Bug Verification ---");
  // 3a. Set country to United Kingdom
  await countrySelect.selectOption("United Kingdom");
  await page.waitForTimeout(200);

  // 3b. Enter 10001 (US ZIP code, invalid for UK)
  await postalInput.fill("10001");
  await page.locator("input[name='state']").fill("London");
  await page.locator("input[name='city']").fill("London");

  // Select a slot first so slot validation passes
  await page.locator("#choose-slot-button").click();
  await page.waitForSelector("#slot-picker-title", { state: "visible" });
  await page.waitForTimeout(400);

  // Click first batch option
  const batchOptions = page.locator("div[role='button']");
  if ((await batchOptions.count()) > 0) {
    await batchOptions.first().click();
    await page.waitForTimeout(300);
  }

  // Click an available day button in the calendar
  const dayButtons = page.locator("button:not(:disabled)");
  const count = await dayButtons.count();
  for (let i = 0; i < count; i++) {
    const text = await dayButtons.nth(i).innerText();
    if (/^\d{1,2}$/.test(text.trim())) {
      await dayButtons.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(300);

  // Click Confirm Slot button
  const confirmBtn = page.locator("button:has-text('Confirm Slot')");
  if (await confirmBtn.isEnabled()) {
    await confirmBtn.click();
    await page.waitForSelector("#slot-picker-title", { state: "hidden" });
  }

  // Fill basic required customer fields so HTML5 native validation lets form submit to JS handleSubmit
  await page.locator("input[name='firstName']").fill("BrowserTester");
  await page.locator("input[name='lastName']").fill("User");
  await page.locator("input[name='email']").fill(`browsertest_${Date.now()}@example.com`);
  await page.locator("input[name='mobileNumber']").fill("2125559988");

  // 3c. Click Submit to trigger validation
  const submitBtn = page.locator("button[type='submit']").last();
  await submitBtn.click();
  await page.waitForTimeout(300);

  // 3d. Verify UK error message appears
  const errorAlert = page.locator(".alert.alert-danger");
  const isErrorVisible = await errorAlert.isVisible();
  const errorText = isErrorVisible ? await errorAlert.innerText() : "";
  record("UK Postal Validation Error Triggered",
    isErrorVisible && errorText.includes("Postcode") && errorText.includes("UK Postcode"),
    `error="${errorText}"`
  );

  // 3e. Now switch Country to United States
  await countrySelect.selectOption("United States");
  await page.waitForTimeout(300);

  // 3f. Verify UK error message is immediately cleared and label is ZIP Code
  const isErrorStillVisible = await errorAlert.isVisible();
  labelText = await postalLabel.innerText();
  placeholderText = await postalInput.getAttribute("placeholder");

  record("UK Error Cleared Immediately on Country Switch",
    !isErrorStillVisible,
    `isErrorStillVisible=${isErrorStillVisible}`
  );
  record("Label Changed Immediately to ZIP Code",
    labelText.includes("ZIP Code"),
    `label="${labelText}"`
  );
  record("Placeholder Changed Immediately to Enter ZIP Code",
    placeholderText.includes("ZIP Code"),
    `placeholder="${placeholderText}"`
  );

  // 3g. Update state and city for USA and submit - MUST PASS!
  await page.locator("input[name='state']").fill("New York");
  await page.locator("input[name='city']").fill("New York");

  // Wait for timezone resolution badge to appear
  await page.waitForTimeout(1500);
  const timezoneBadge = page.locator("#trial-form-timezone-info");
  const isTzVisible = await timezoneBadge.isVisible();
  const tzText = isTzVisible ? await timezoneBadge.innerText() : "";
  record("Timezone Resolution Badge Appears",
    isTzVisible && tzText.includes("Eastern Daylight Time"),
    `tzText="${tzText.replace(/\n/g, ' ')}"`
  );

  // Click Submit
  await submitBtn.click();
  await page.waitForTimeout(1200);

  // Verify OTP Modal Opens cleanly
  const otpModal = page.locator("div[role='dialog']").first();
  const isOtpModalVisible = await otpModal.isVisible();
  record("USA Details Passed Validation & OTP Modal Opened",
    isOtpModalVisible,
    `otpModalVisible=${isOtpModalVisible}`
  );

  // Verify exactly 1 OTP send in network (no StrictMode duplicate race condition)
  record("Exactly One OTP Send on Modal Open (No StrictMode Duplicates)",
    networkOtpRequests.length === 1,
    `requestsCount=${networkOtpRequests.length}`
  );

  // --- 4. Responsive Viewports Test ---
  console.log("\n--- 4. Responsive Viewport Testing (Desktop, Tablet, Mobile) ---");

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  const tabletFormVisible = await page.locator("form").first().isVisible();
  record("Tablet (768px) Layout Renders Intact", tabletFormVisible);

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(300);
  const mobileFormVisible = await page.locator("form").first().isVisible();
  record("Mobile (375px) Layout Renders Intact", mobileFormVisible);

  // --- 5. Console & Network Errors Check ---
  console.log("\n--- 5. Console & Network Integrity Check ---");
  record("0 Console JavaScript/React Errors", consoleErrors.length === 0,
    consoleErrors.length > 0 ? `errors: ${consoleErrors.join("; ")}` : "clean"
  );

  await browser.close();

  console.log("\n================================================================================");
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;
  console.log(`TOTAL BROWSER TESTS: ${total} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  if (failedCount === 0) {
    console.log(">>> ALL REAL BROWSER TESTS PASSED WITH 0 FAILURES! <<<");
  } else {
    console.log(">>> SOME BROWSER TESTS FAILED! <<<");
  }
  console.log("================================================================================\n");

  return { total, passedCount, failedCount, results };
}

runBrowserTests().then(({ failedCount }) => {
  if (failedCount > 0) process.exit(1);
}).catch(err => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
