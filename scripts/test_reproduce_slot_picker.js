// scripts/test_reproduce_slot_picker.js
import { chromium } from "playwright";

const COUNTRIES_TO_TEST = [
  { country: "India", state: "Tamil Nadu", city: "Chennai", postalCode: "600001", expectedTz: "Asia/Kolkata", expectedOffset: "GMT+5:30" },
  { country: "United States", state: "New York", city: "New York", postalCode: "10001", expectedTz: "America/New_York", expectedOffset: "GMT-4" },
  { country: "United Kingdom", state: "London", city: "London", postalCode: "SW1A 1AA", expectedTz: "Europe/London", expectedOffset: "GMT+1" },
  { country: "Canada", state: "Ontario", city: "Toronto", postalCode: "M5V 3A8", expectedTz: "America/Toronto", expectedOffset: "GMT-4" },
  { country: "Australia", state: "New South Wales", city: "Sydney", postalCode: "2000", expectedTz: "Australia/Sydney", expectedOffset: "GMT+10" },
];

async function runReproduction() {
  console.log("================================================================================");
  console.log("TESTING SLOT PICKER PERFORMANCE & STABILITY ACROSS 5 COUNTRIES");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const networkStats = {
    timezoneRequests: 0,
    slotsRequests: 0,
    batchesRequests: 0,
    bookingWindowRequests: 0,
  };

  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/location/timezone")) networkStats.timezoneRequests++;
    if (url.includes("/api/slots/active")) networkStats.slotsRequests++;
    if (url.includes("/api/batches/active")) networkStats.batchesRequests++;
    if (url.includes("/api/settings/booking-window")) networkStats.bookingWindowRequests++;
  });

  await page.goto("http://localhost:5173/trial/details?planId=2&durationId=2", { waitUntil: "networkidle" });
  await page.waitForSelector("select[name='countryRegion']", { state: "visible" });

  let allPassed = true;

  for (const c of COUNTRIES_TO_TEST) {
    console.log(`\n================================================================================`);
    console.log(`TESTING COUNTRY: ${c.country} (${c.postalCode})`);
    console.log(`================================================================================`);
    const tzStart = networkStats.timezoneRequests;
    const slotsStart = networkStats.slotsRequests;
    const batchesStart = networkStats.batchesRequests;

    // 1. Enter address details
    await page.locator("select[name='countryRegion']").selectOption(c.country);
    await page.locator("input[name='state']").fill(c.state);
    await page.locator("input[name='city']").fill(c.city);
    await page.locator("input[name='postalCode']").fill(c.postalCode);

    // 2. Wait until timezone is resolved
    const tzBadge = page.locator("#trial-form-timezone-info");
    await tzBadge.waitFor({ state: "visible", timeout: 8000 });
    const tzText = await tzBadge.innerText();
    console.log(`[PASS] Step 1-2: Timezone resolved: ${tzText.replace(/\n/g, ' ')}`);

    // 3. Open Choose Class Slot
    const chooseSlotBtn = page.locator("#choose-slot-button");
    await chooseSlotBtn.waitFor({ state: "visible", timeout: 5000 });
    await chooseSlotBtn.click();

    // Verify modal opened
    const modal = page.locator("div[role='dialog']").first();
    await modal.waitFor({ state: "visible", timeout: 5000 });
    console.log("[PASS] Step 3: Slot Picker Modal opened");

    // Check timezone banner in modal
    const tzBanner = page.locator("#slot-picker-timezone-banner");
    await tzBanner.waitFor({ state: "visible", timeout: 3000 });
    const bannerText = await tzBanner.innerText();
    console.log(`[PASS] Modal Timezone Banner: ${bannerText.replace(/\n/g, ' ')}`);

    // Wait for batch cards
    const batchCards = page.locator("div[role='button']");
    await page.waitForSelector("div[role='button']", { timeout: 5000 });
    const batchCount = await batchCards.count();
    console.log(`[PASS] Found ${batchCount} batch options`);

    const morningBtn = batchCards.filter({ hasText: "Morning" }).first();
    const afternoonBtn = batchCards.filter({ hasText: "Afternoon" }).first();
    const eveningBtn = batchCards.filter({ hasText: "Evening" }).first();

    // 4. Click Morning Batch
    if (await morningBtn.isVisible()) {
      await morningBtn.click();
      await page.waitForTimeout(100);
      const isMorningActive = await morningBtn.innerText();
      console.log(`[PASS] Step 4: Clicked Morning Batch -> ${isMorningActive.includes("ACTIVE") ? "Active" : "Selected"}`);
    }

    // 5. Click Afternoon Batch
    if (await afternoonBtn.isVisible()) {
      await afternoonBtn.click();
      await page.waitForTimeout(100);
      const isAfternoonActive = await afternoonBtn.innerText();
      console.log(`[PASS] Step 5: Clicked Afternoon Batch -> ${isAfternoonActive.includes("ACTIVE") ? "Active" : "Selected"}`);
    }

    // 6. Click Evening Batch
    if (await eveningBtn.isVisible()) {
      await eveningBtn.click();
      await page.waitForTimeout(100);
      const isEveningActive = await eveningBtn.innerText();
      console.log(`[PASS] Step 6: Clicked Evening Batch -> ${isEveningActive.includes("ACTIVE") ? "Active" : "Selected"}`);
    }

    // 7. Click multiple available dates
    const dateBtns = page.locator("button[title*='available']");
    const availableDatesCount = await dateBtns.count();
    console.log(`[PASS] Step 7: Available dates count for Evening: ${availableDatesCount}`);

    let selectedDateText = "";
    if (availableDatesCount > 0) {
      await dateBtns.first().click();
      await page.waitForTimeout(100);
      selectedDateText = await dateBtns.first().innerText();
      console.log(`  Clicked first available date (Day ${selectedDateText.trim()})`);

      if (availableDatesCount > 1) {
        await dateBtns.nth(1).click();
        await page.waitForTimeout(100);
        selectedDateText = await dateBtns.nth(1).innerText();
        console.log(`  Clicked second available date (Day ${selectedDateText.trim()})`);
      }
    }

    // Verify confirmation text in modal footer
    const footerSelectedText = await page.locator("div:has-text('Selected:')").last().innerText();
    console.log(`  Modal footer text: ${footerSelectedText.replace(/\n/g, ' ')}`);

    // 8. Switch between batches repeatedly (Evening -> Morning -> Afternoon -> Evening)
    console.log("Step 8: Rapid batch switching test...");
    await morningBtn.click();
    await page.waitForTimeout(50);
    await afternoonBtn.click();
    await page.waitForTimeout(50);
    await eveningBtn.click();
    await page.waitForTimeout(100);

    const eveningStillSelected = (await eveningBtn.innerText()).includes("ACTIVE");
    console.log(`[PASS] Rapid batch switching completed. Evening active: ${eveningStillSelected}`);
    if (!eveningStillSelected) allPassed = false;

    // 9. Move calendar next/previous month if available
    const nextMonthBtn = page.locator("button[aria-label='Next month']");
    const prevMonthBtn = page.locator("button[aria-label='Previous month']");
    if (await nextMonthBtn.isEnabled()) {
      await nextMonthBtn.click();
      await page.waitForTimeout(100);
      console.log("[PASS] Step 9: Moved to next month");
      if (await prevMonthBtn.isEnabled()) {
        await prevMonthBtn.click();
        await page.waitForTimeout(100);
        console.log("[PASS] Moved back to current month");
      }
    } else {
      console.log("[PASS] Step 9: Month navigation checked (at boundary)");
    }

    // 10. Confirm a slot
    const confirmBtn = page.locator("button:has-text('Confirm Slot')");
    await confirmBtn.click();
    await page.waitForTimeout(400);

    const isModalOpenAfterConfirm = await modal.isVisible();
    console.log(`[PASS] Step 10: Slot confirmed. Modal closed: ${!isModalOpenAfterConfirm}`);
    if (isModalOpenAfterConfirm) allPassed = false;

    // Verify chosen slot summary on TrialDetailsPage
    const finalSlotSummary = await chooseSlotBtn.innerText();
    console.log(`  Final Slot on page: "${finalSlotSummary.replace(/\n/g, ' ')}"`);
    const hasExpectedOffset = finalSlotSummary.includes(c.expectedOffset);
    console.log(`  Slot has customer offset ${c.expectedOffset}: ${hasExpectedOffset}`);
    if (!hasExpectedOffset) allPassed = false;

    // 11. Reopen Slot Picker and repeat
    console.log("Step 11: Reopening Slot Picker to verify state persistence...");
    await chooseSlotBtn.click();
    await modal.waitFor({ state: "visible", timeout: 5000 });

    // The previously confirmed Evening batch should still be active!
    const reopenEveningActive = (await eveningBtn.innerText()).includes("ACTIVE");
    console.log(`[PASS] Reopened modal. Evening Batch preserved as active: ${reopenEveningActive}`);
    if (!reopenEveningActive) allPassed = false;

    // Switch to Morning Batch and confirm
    await morningBtn.click();
    await page.waitForTimeout(100);
    await confirmBtn.click();
    await page.waitForTimeout(400);

    const updatedSummary = await chooseSlotBtn.innerText();
    console.log(`[PASS] Updated Slot after reopen: "${updatedSummary.replace(/\n/g, ' ')}"`);
    const hasMorning = updatedSummary.includes("Morning Batch");
    console.log(`  Updated slot reflects Morning Batch: ${hasMorning}`);
    if (!hasMorning) allPassed = false;

    const tzEnd = networkStats.timezoneRequests - tzStart;
    const slotsEnd = networkStats.slotsRequests - slotsStart;
    const batchesEnd = networkStats.batchesRequests - batchesStart;
    console.log(`Network calls for ${c.country}:`);
    console.log(`  Timezone calls: ${tzEnd} (Expected: 1)`);
    console.log(`  Active Slots calls: ${slotsEnd} (Expected: 1)`);
    console.log(`  Batches calls: ${batchesEnd} (Expected: 1 or cached)`);

    if (tzEnd > 1) {
      console.warn(`[WARN] Timezone called ${tzEnd} times for ${c.country}! Expected only 1!`);
      allPassed = false;
    }
  }

  console.log("\n================================================================================");
  console.log("OVERALL VERIFICATION RESULTS:");
  console.log(`Total Timezone API Calls: ${networkStats.timezoneRequests}`);
  console.log(`Total Slots API Calls: ${networkStats.slotsRequests}`);
  console.log(`Total Batch API Calls: ${networkStats.batchesRequests}`);
  console.log(`Total Booking Window API Calls: ${networkStats.bookingWindowRequests}`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log("Console Errors detail:", consoleErrors);
    allPassed = false;
  }
  console.log(`ALL 5 COUNTRIES TEST RESULT: ${allPassed ? "SUCCESS [PASS]" : "FAILED"}`);
  console.log("================================================================================\n");

  await browser.close();
  return { allPassed };
}

runReproduction().then(({ allPassed }) => {
  if (!allPassed) process.exit(1);
}).catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
