import { test, expect } from "@playwright/test";

// Smoke test: serve the built `dist/` on localhost:5173 before running.
// Intercept POST /api/technology/requests to return a mocked success response.

test("technology request fires toast on success", async ({ page }) => {
  // Intercept the API POST and return a success payload
  await page.route("**/api/technology/requests", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          request: { id: "r1" },
          suggestions: [],
          duplicate: false,
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/");

  // Switch to the Technology tab
  await page.click('button:has-text("Technology approvals")');
  // Wait for the technology dashboard to render
  await page.waitForSelector("text=Directory and approvals");

  // Click "Request a new technology" summary
  const summary = await page.$("text=Request a new technology");
  if (summary) {
    await summary.click();
  }

  // Fill name and submit
  await page.fill('input[name="name"], #request-name', "PlaywrightTech");
  await page.click('button:has-text("Submit request")');

  // Wait for toast to appear
  const toast = await page.waitForSelector(".toast.toast-success", {
    timeout: 3000,
  });
  expect(await toast?.innerText()).toContain("Request submitted");

  // Save screenshot for inspection
  await page.screenshot({
    path: "playwright-smoke-toast.png",
    fullPage: false,
  });
});
