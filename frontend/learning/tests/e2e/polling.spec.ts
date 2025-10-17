import { test, expect } from "@playwright/test";

// This test mocks the judge submission POST and subsequent polling GETs.
// It verifies the UI displays the result once the mocked judge returns a completed status.

test("frontend polls judge result and displays output", async ({ page }) => {
  // Use a stable attempt id
  const attemptId = "mock-attempt-1";

  // Intercept POST submission and return attempt id
  await page.route("**/api/judge/submissions", async (route, request) => {
    if (request.method().toUpperCase() === "POST") {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt: { id: attemptId } }),
      });
      return;
    }
    // Fallback to continue
    await route.continue();
  });

  // Track polling counts and return 'processing' a couple times then 'completed'
  let pollCount = 0;
  await page.route(`**/api/judge/submissions/${attemptId}`, async (route) => {
    pollCount += 1;
    if (pollCount < 3) {
      // return processing without result
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt: { id: attemptId, status: "processing" },
        }),
      });
      return;
    }

    // On third poll, return completed with a result
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attempt: {
          id: attemptId,
          status: "completed",
          result: { stdout: "Hello from mock judge", exit_code: 0 },
        },
      }),
    });
  });

  // Open the sample editor page
  await page.goto("/editor/sample");

  // Click the 'Run in Judge' button
  const runButton = page.getByRole("button", { name: /Run in Judge/i });
  await runButton.waitFor({ timeout: 15000 });
  await runButton.click();

  // Now wait for the output area to contain the mocked stdout string
  const outputLocator = page.locator("pre");
  await expect(outputLocator).toContainText("Hello from mock judge", {
    timeout: 10000,
  });
});
