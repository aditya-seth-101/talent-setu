import { test, expect } from "@playwright/test";

function makePendingRequest() {
  const now = new Date().toISOString();
  return {
    id: "req-map-1",
    name: "MapConflict Tech",
    slug: "map-conflict-tech",
    description: "Please map this tech",
    aliases: [],
    status: "pending",
    requestedBy: "userb@example.com",
    requestedByUser: {
      id: "u2",
      email: "userb@example.com",
      displayName: "User B",
    },
    reviewerId: null,
    reviewer: null,
    reviewerNotes: null,
    mappedTechnologyId: null,
    createdTechnologyId: null,
    candidateTechnologyIds: ["tech-a", "tech-b"],
    candidates: [
      {
        id: "tech-a",
        name: "Tech A",
        slug: "tech-a",
        aliases: [],
        judge0LanguageKey: "",
        judge0LanguageId: null,
        status: "active",
      },
      {
        id: "tech-b",
        name: "Tech B",
        slug: "tech-b",
        aliases: [],
        judge0LanguageKey: "",
        judge0LanguageId: null,
        status: "active",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

test("mapping conflict shows error toast", async ({ page }) => {
  // GET queue -> pending request
  await page.route("**/api/technology/requests**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requests: [makePendingRequest()],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });
      return;
    }
    await route.continue();
  });

  // POST review -> conflict error (non-2xx)
  await page.route(
    "**/api/technology/requests/req-map-1/review",
    async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Mapping conflict: aliases overlap" }),
      });
    }
  );

  await page.goto("/");
  await page.click('button:has-text("Technology approvals")');
  await page.waitForSelector("text=Pending requests");

  // choose existing mapping and submit to trigger conflict
  await page.selectOption("select#map-existing-req-map-1", "tech-a");
  await page.click('form.review-form button:has-text("Approve")');

  // expect an error toast
  const err = await page.waitForSelector(".toast.toast-error", {
    timeout: 4000,
  });
  expect(await err.innerText()).toContain("Review failed");
  expect(await err.innerText()).toContain("Mapping conflict");
});

test("reviewer name and notes display after successful review", async ({
  page,
}) => {
  // GET queue -> pending request
  await page.route("**/api/technology/requests**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requests: [makePendingRequest()],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });
      return;
    }
    await route.continue();
  });

  // POST review -> success with reviewer info
  await page.route(
    "**/api/technology/requests/req-map-1/review",
    async (route) => {
      const pd = route.request().postData();
      let body = {} as any;
      if (pd) {
        try {
          body = JSON.parse(pd);
        } catch {
          body = {};
        }
      }
      const now = new Date().toISOString();
      const updated = {
        ...makePendingRequest(),
        status: "approved",
        reviewerId: "rev-1",
        reviewer: {
          id: "rev-1",
          email: "rev@example.com",
          displayName: "Reviewer One",
        },
        reviewerNotes: body?.notes ?? "Approved via test",
        updatedAt: now,
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ request: updated }),
      });
    }
  );

  await page.goto("/");
  await page.click('button:has-text("Technology approvals")');
  await page.waitForSelector("text=Pending requests");

  // Fill notes and reject or approve; use reject form for notes flow
  await page.fill("textarea#reject-notes-req-map-1", "Looks out of scope");
  await page.click('form.review-form button:has-text("Reject")');

  // Wait for success toast and then verify reviewer display
  const toast = await page.waitForSelector(".toast.toast-success", {
    timeout: 4000,
  });
  expect(await toast.innerText()).toContain("Request rejected");

  // The request card should now show reviewer name and notes
  await page.waitForSelector("text=Reviewed by");
  expect(await page.locator("text=Reviewer One").count()).toBeGreaterThan(0);
  expect(await page.locator("text=Looks out of scope").count()).toBeGreaterThan(
    0
  );
});
