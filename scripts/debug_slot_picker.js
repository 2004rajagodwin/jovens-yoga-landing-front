// scripts/debug_slot_picker.js
import { chromium } from "playwright";

async function debugModal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const networkRequests = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) {
      networkRequests.push({ time: Date.now(), method: req.method(), url: req.url() });
    }
  });

  page.on("console", (msg) => {
    console.log("CONSOLE:", msg.type(), msg.text());
  });

  console.log("1. Navigating to trial page...");
  await page.goto("http://localhost:5173/trial/details?planId=2&durationId=2");
  await page.waitForSelector("select[name=countryRegion]");

  console.log("2. Selecting United States, New York, 10001...");
  await page.locator("select[name=countryRegion]").selectOption("United States");
  await page.locator("input[name=state]").fill("New York");
  await page.locator("input[name=city]").fill("New York");
  await page.locator("input[name=postalCode]").fill("10001");

  console.log("3. Waiting for timezone badge...");
  await page.waitForSelector("#trial-form-timezone-info");

  console.log("4. Opening slot picker modal...");
  const networkCountBeforeModal = networkRequests.length;
  await page.locator("#choose-slot-button").click();
  await page.waitForSelector("#slot-picker-title");
  await page.waitForTimeout(500);

  // Monitor DOM changes inside the modal
  await page.evaluate(() => {
    window.__mutations = [];
    const modalContent = document.querySelector("div[role=dialog] > div");
    if (!modalContent) return;
    const obs = new MutationObserver((list) => {
      list.forEach((m) => {
        window.__mutations.push({
          type: m.type,
          targetTag: m.target.tagName,
          attributeName: m.attributeName,
          added: m.addedNodes.length,
          removed: m.removedNodes.length,
        });
      });
    });
    obs.observe(modalContent, { attributes: true, childList: true, subtree: true });
  });

  const batchCards = page.locator("div[role=button]");
  const count = await batchCards.count();
  console.log(`Found ${count} batch cards.`);

  console.log("5. Testing batch clicks...");
  for (let i = 0; i < count; i++) {
    const text = await batchCards.nth(i).innerText();
    console.log(`Clicking batch ${i}: ${text.split("\n")[0]}`);
    await batchCards.nth(i).click();
    await page.waitForTimeout(300);
  }

  console.log("6. Inspecting date buttons...");
  const debugInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const dayBtns = buttons.filter((b) => /^\d+$/.test(b.innerText.trim()));
    return {
      totalDayButtons: dayBtns.length,
      sampleButtons: dayBtns.slice(0, 10).map((b) => ({
        text: b.innerText.trim(),
        disabled: b.disabled,
        title: b.title,
      })),
      todayStr: document.querySelector("#slot-picker-title") ? "modal found" : "no modal",
    };
  });
  console.log(JSON.stringify(debugInfo, null, 2));

  console.log("7. Testing rapid batch switching while date is selected...");
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < count; i++) {
      await batchCards.nth(i).click();
      await page.waitForTimeout(100);
    }
  }

  console.log("8. Testing month navigation...");
  const nextBtn = page.locator("button[aria-label='Next month']");
  if (await nextBtn.isEnabled()) {
    console.log("Clicking Next month...");
    await nextBtn.click();
    await page.waitForTimeout(300);
    const octButtons = page.locator("div[style*='gridTemplateColumns'] button:not(:disabled)");
    console.log(`Found ${await octButtons.count()} enabled buttons in next month.`);
    if ((await octButtons.count()) > 0) {
      console.log(`Clicking day in next month: ${await octButtons.first().innerText()}`);
      await octButtons.first().click();
      await page.waitForTimeout(300);
    }
  }

  const resultStats = await page.evaluate(() => {
    return {
      mutationsCount: window.__mutations ? window.__mutations.length : 0,
      mutations: window.__mutations ? window.__mutations.slice(0, 30) : [],
    };
  });

  console.log(`Total mutations observed: ${resultStats.mutationsCount}`);
  console.log("Network calls during modal interaction:");
  const modalRequests = networkRequests.slice(networkCountBeforeModal);
  console.log(`Network calls since modal opened: ${modalRequests.length}`);
  modalRequests.forEach((r) => console.log(`  ${r.method} ${r.url}`));

  await browser.close();
}

debugModal().catch(console.error);
