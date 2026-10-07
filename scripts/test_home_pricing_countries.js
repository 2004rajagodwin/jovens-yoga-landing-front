import { chromium } from "playwright";

const COUNTRIES = [
  {
    code: "IN",
    name: "India",
    currency: "INR",
    symbol: "₹",
    expectedHomeText: "₹999/Month.",
    expectedFormPrice: "₹999",
  },
  {
    code: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
    expectedHomeText: "$29/Month.",
    expectedFormPrice: "$29",
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    expectedHomeText: "£25/Month.",
    expectedFormPrice: "£25",
  },
  {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    symbol: "C$",
    expectedHomeText: "C$39/Month.",
    expectedFormPrice: "C$39",
  },
  {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    symbol: "A$",
    expectedHomeText: "A$45/Month.",
    expectedFormPrice: "A$45",
  },
];

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  let allPassed = true;

  console.log("==================================================");
  console.log("STARTING HOME PAGE DYNAMIC PRICING VERIFICATION");
  console.log("==================================================");

  for (const c of COUNTRIES) {
    const consoleErrors = [];
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });

    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Route /api/geo/country to simulate the user's detected country from Cloudflare/GeoIP
    await page.route("**/api/geo/country", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Country detected.",
          code: "OK",
          data: {
            countryCode: c.code,
            countryName: c.name,
            currency: c.currency,
            symbol: c.symbol,
          },
        }),
      });
    });

    try {
      // 1. Visit Home Page
      await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });

      // Locate the How It Works center box
      const centerBox = page.locator(".how-it-center-box");
      await centerBox.waitFor({ state: "visible", timeout: 5000 });

      const heading = centerBox.locator("h3");
      const span = heading.locator("span");

      // Wait for price resolution (span text should not be "...")
      await page.waitForFunction(
        () => {
          const el = document.querySelector(".how-it-center-box h3 span");
          return el && el.textContent.trim() !== "..." && el.textContent.trim() !== ".../Month.";
        },
        null,
        { timeout: 5000 }
      );

      const spanText = (await span.textContent()).trim();
      const headingFullText = (await heading.innerText()).trim().replace(/\s+/g, " ");

      console.log(`\nTesting Country: ${c.name} (${c.code})`);
      console.log(`- Home Card Heading: "${headingFullText}"`);
      console.log(`- Home Dynamic Span: "${spanText}"`);

      // Verify span matches expectedHomeText
      if (spanText === c.expectedHomeText) {
        console.log(`  ✓ Home page price matches expected: ${c.expectedHomeText}`);
      } else {
        console.error(`  ✗ MISMATCH: Expected "${c.expectedHomeText}", got "${spanText}"`);
        allPassed = false;
      }

      // Verify no hardcoded ₹29 exists
      if (spanText.includes("₹29") || headingFullText.includes("₹29")) {
        console.error(`  ✗ FAILED: Hardcoded ₹29 still present!`);
        allPassed = false;
      } else {
        console.log(`  ✓ Confirmed no hardcoded ₹29 present on Home Page.`);
      }

      // 2. Visit Trial Details Page and verify the exact same country produces the exact same price
      await page.goto("http://localhost:5173/trial/details?planId=2&durationId=2", { waitUntil: "domcontentloaded" });
      await page.locator("#trial-country").waitFor({ state: "visible", timeout: 5000 });
      await page.selectOption("#trial-country", c.name);
      await page.waitForTimeout(600);

      const formContainerText = await page.innerText(".container");
      const formHasPrice = formContainerText.includes(c.expectedFormPrice);
      console.log(`- Form page price matches (${c.expectedFormPrice}): ${formHasPrice ? "YES ✓" : "NO ✗"}`);
      if (!formHasPrice) {
        console.error(`  ✗ Form page price mismatch for ${c.name}`);
        allPassed = false;
      } else {
        console.log(`  ✓ Home Page amount (${c.expectedHomeText}) matches Form Page amount (${c.expectedFormPrice})!`);
      }

      if (consoleErrors.length > 0) {
        console.warn(`  ⚠️ Console errors logged:`, consoleErrors);
      } else {
        console.log(`  ✓ Zero console errors.`);
      }
    } catch (err) {
      console.error(`  ✗ Error testing ${c.name}:`, err);
      allPassed = false;
    } finally {
      await context.close();
    }
  }

  // Fallback test: Network failure on /api/geo/country should safely fall back to India (₹999/Month.)
  console.log("\nTesting Fallback: /api/geo/country Network Failure");
  const fallbackContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.route("**/api/geo/country", async (route) => {
    await route.abort("failed");
  });

  try {
    await fallbackPage.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
    await fallbackPage.waitForFunction(
      () => {
        const el = document.querySelector(".how-it-center-box h3 span");
        return el && el.textContent.trim() !== "..." && el.textContent.trim() !== ".../Month.";
      },
      null,
      { timeout: 5000 }
    );
    const fallbackSpan = (await fallbackPage.locator(".how-it-center-box h3 span").textContent()).trim();
    console.log(`- Fallback Dynamic Span: "${fallbackSpan}"`);
    if (fallbackSpan === "₹999/Month.") {
      console.log(`  ✓ Successfully fell back to India default (₹999/Month.)!`);
    } else {
      console.error(`  ✗ Fallback unexpected: got "${fallbackSpan}"`);
      allPassed = false;
    }
  } catch (err) {
    console.error("  ✗ Error testing fallback:", err);
    allPassed = false;
  } finally {
    await fallbackContext.close();
  }

  // Responsive UI test: Mobile viewport (375x667, India)
  console.log("\nTesting Responsive Mobile Viewport (375x667, India)");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const mobilePage = await mobileContext.newPage();
  try {
    await mobilePage.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
    await mobilePage.waitForFunction(
      () => {
        const el = document.querySelector(".how-it-center-box h3 span");
        return el && el.textContent.trim() !== "..." && el.textContent.trim() !== ".../Month.";
      },
      null,
      { timeout: 5000 }
    );
    const mobileSpan = (await mobilePage.locator(".how-it-center-box h3 span").textContent()).trim();
    console.log(`- Mobile Dynamic Span: "${mobileSpan}"`);
    const isVisible = await mobilePage.locator(".how-it-center-box").isVisible();
    console.log(`- Mobile Card Visible: ${isVisible}`);
    if (mobileSpan === "₹999/Month." && isVisible) {
      console.log(`  ✓ Mobile viewport renders correctly!`);
    } else {
      console.error(`  ✗ Mobile viewport test failed.`);
      allPassed = false;
    }
  } catch (err) {
    console.error("  ✗ Error testing mobile viewport:", err);
    allPassed = false;
  } finally {
    await mobileContext.close();
  }

  await browser.close();

  console.log("\n==================================================");
  if (allPassed) {
    console.log("ALL TESTS PASSED SUCCESSFULLY! ✓");
  } else {
    console.log("SOME TESTS FAILED! ✗");
  }
  console.log("==================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runTests();
