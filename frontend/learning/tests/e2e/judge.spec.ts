import { test, expect } from '@playwright/test';

// This E2E test assumes there's a sample editor route at /editor/sample
// and a "Run" button that triggers a POST to /api/judge/submit.

test('editor run triggers judge submit API call', async ({ page }) => {
  await page.goto('/editor/sample');

  // wait for the page and the Run in Judge button to appear
  const runButton = page.getByRole('button', { name: /Run in Judge/i });
  await runButton.waitFor({ timeout: 15000 });

  // intercept the judge submit request (app posts to /api/judge/submissions)
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().includes('/api/judge/submissions') && r.method() === 'POST'),
    // click the run button which should send the request
    runButton.click(),
  ]);

  expect(req).toBeTruthy();

  const postData = JSON.parse(req.postData() || '{}');
  // basic assertions about the shape of the payload
  expect(postData).toHaveProperty('sourceCode');
  expect(postData).toHaveProperty('languageId');
});
