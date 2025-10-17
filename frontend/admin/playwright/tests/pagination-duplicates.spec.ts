import { test, expect } from "@playwright/test";

function makeRequestWithManyCandidates(id: string, count = 12) {
  const now = new Date().toISOString();
  const candidates = Array.from({ length: count }).map((_, i) => ({
    id: `cand-${i}`,
    name: `Candidate ${i + 1}`,
    slug: `candidate-${i + 1}`,
    aliases: [],
    judge0LanguageKey: "",
    judge0LanguageId: null,
    status: "active",
  }));
  return {
    id,
    name: "Lots of candidates",
    slug: "lots-candidates",
    description: "A request with many duplicate candidates",
    aliases: [],
    status: "pending",
    requestedBy: "many@example.com",
    requestedByUser: {
      id: "many-u",
      email: "many@example.com",
      displayName: "Many",
    },
    candidates,
    candidateTechnologyIds: candidates.map((c) => c.id),
    createdAt: now,
    updatedAt: now,
  };
}

test("approve without selecting candidate shows selection error toast", async ({
  page,
}) => {
  await page.route("**/api/technology/requests**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requests: [makeRequestWithManyCandidates("req-no-select", 3)],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });
      return;
    }
    await route.continue();
  });

  // Intercept review to ensure server would error if no selection passed (but UI should block)
  await page.route(
    "**/api/technology/requests/req-no-select/review",
    async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "No selection provided" }),
      });
    }
  );

  await page.goto("/");
  await page.click('button:has-text("Technology approvals")');
  await page.waitForSelector("text=Pending requests");

  // The select has `required` which prevents native submit when empty.
  // Clear the required constraint so the React onSubmit handler runs and shows the error toast.
  await page.$eval(
    "select#map-existing-req-no-select",
    (el: HTMLSelectElement) => {
      el.required = false;
    }
  );
  // Click Approve button without selecting candidate
  await page.click('form.review-form button:has-text("Approve")');

  // Expect selection error toast (give a little more time for UI render)
  const err = await page.waitForSelector(".toast.toast-error", {
    timeout: 6000,
  });
  expect(await err.innerText()).toContain("Selection required");
});

test("show more suggestions increases visible candidate count", async ({
  page,
}) => {
  const request = makeRequestWithManyCandidates("req-many", 12);
  await page.route("**/api/technology/requests**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requests: [request],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await page.click('button:has-text("Technology approvals")');
  await page.waitForSelector("text=Detected duplicates");

  // Initially only DEFAULT_CANDIDATE_LIMIT (5) are visible
  const visibleBefore = await page.$$eval(
    ".technology-results li",
    (els) => els.length
  );
  expect(visibleBefore).toBeGreaterThan(0);
  expect(visibleBefore).toBeLessThan(12);

  // Click 'Show more suggestions' and expect more candidates rendered
  // Expand the details first (button is inside a <details> and may be hidden)
  await page.click('summary:has-text("Detected duplicates")');
  await page.waitForSelector('button:has-text("Show more suggestions")');
  await page.click('button:has-text("Show more suggestions")');
  const visibleAfter = await page.$$eval(
    ".technology-results li",
    (els) => els.length
  );
  expect(visibleAfter).toBeGreaterThan(visibleBefore);
  expect(visibleAfter).toBeLessThanOrEqual(12);
});

test("queue pagination next/previous requests new pages", async ({ page }) => {
  // Provide different pages when the frontend requests page=1 and page=2
  await page.route("**/api/technology/requests**", async (route) => {
    const url = new URL(route.request().url());
    const pageParam = url.searchParams.get("page") || "1";
    const pageNum = Number(pageParam);
    const now = new Date().toISOString();
    const item = {
      id: `req-page-${pageNum}`,
      name: `Request page ${pageNum}`,
      slug: `req-page-${pageNum}`,
      aliases: [],
      description: "",
      status: "pending",
      requestedBy: "pagetest@example.com",
      requestedByUser: {
        id: `u-${pageNum}`,
        email: `p${pageNum}@example.com`,
        displayName: `P${pageNum}`,
      },
      candidates: [],
      candidateTechnologyIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        requests: [item],
        pagination: { page: pageNum, limit: 1, total: 2, totalPages: 2 },
      }),
    });
  });

  await page.goto("/");
  await page.click('button:has-text("Technology approvals")');
  await page.waitForSelector("text=Pending requests");

  // Initial page should be 1
  expect(await page.locator("text=Page 1 of 2").count()).toBeGreaterThan(0);

  // Click Next -> page 2
  await page.click('nav.pagination button:has-text("Next")');
  await page.waitForSelector("text=Page 2 of 2");
  expect(await page.locator("text=Request page 2").count()).toBeGreaterThan(0);

  // Click Previous -> page 1
  await page.click('nav.pagination button:has-text("Previous")');
  await page.waitForSelector("text=Page 1 of 2");
  expect(await page.locator("text=Request page 1").count()).toBeGreaterThan(0);
});
