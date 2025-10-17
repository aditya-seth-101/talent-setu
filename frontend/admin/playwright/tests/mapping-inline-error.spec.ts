import { test, expect } from "@playwright/test";

function makePendingRequest() {
  const now = new Date().toISOString();
  return {
    id: "req-conflict",
    name: "Conflict Tech",
    slug: "conflict-tech",
    description: "Please map this tech with overlapping aliases",
    aliases: [],
    status: "pending",
    requestedBy: "conf@example.com",
    requestedByUser: {
      id: "u-conf",
      email: "conf@example.com",
      displayName: "Conf",
    },
    candidates: [
      {
        id: "c1",
        name: "Existing A",
        slug: "existing-a",
        aliases: ["x"],
        judge0LanguageKey: "",
        judge0LanguageId: null,
        status: "active",
      },
    ],
    candidateTechnologyIds: ["c1"],
    createdAt: now,
    updatedAt: now,
  };
}

test("mapping aliases conflict shows inline request-error", async ({
  page,
}) => {
  // Mock GET queue
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

  // Mock POST review to return 400 with message about alias conflict
  await page.route(
    "**/api/technology/requests/req-conflict/review",
    async (route) => {
      // Read posted body to ensure mapping aliases are present
      const pd = route.request().postData();
      let body = {} as any;
      if (pd) {
        try {
          body = JSON.parse(pd);
        } catch {}
      }
      if (body?.mapping?.aliases && body.mapping.aliases.includes("x")) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Alias conflict with existing technology: x",
          }),
        });
        return;
      }
      // otherwise return success
      const updated = {
        ...makePendingRequest(),
        status: "approved",
        reviewerId: "r1",
        reviewer: { id: "r1", email: "r@example.com", displayName: "R" },
        updatedAt: new Date().toISOString(),
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ request: updated }),
      });
    }
  );

  await page.goto("/");
  await page.waitForSelector('button:has-text("Technology approvals")', {
    timeout: 5000,
  });
  await page.click('button:has-text("Technology approvals")');
  await page.waitForSelector("text=Pending requests");

  // Expand details so mapping form is visible
  await page.click('summary:has-text("Detected duplicates")');

  // Fill aliases to include conflicting alias 'x'
  await page.fill("input#map-aliases-req-conflict", "x");
  // Ensure required select is not blocking (select empty and remove required as test harness)
  await page.$eval(
    "select#map-existing-req-conflict",
    (el: HTMLSelectElement) => {
      el.required = false;
    }
  );
  // Select the existing candidate explicitly
  await page.selectOption("select#map-existing-req-conflict", "c1");

  // Submit approve
  await page.click('form.review-form button:has-text("Approve")');

  // The component displays server errors in a `.request-error` element
  const err = await page.waitForSelector(".request-error", { timeout: 4000 });
  expect(await err.innerText()).toContain("Alias conflict");
});
