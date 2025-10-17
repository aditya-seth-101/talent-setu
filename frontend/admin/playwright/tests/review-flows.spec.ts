import { test, expect } from "@playwright/test";

function makePendingRequest() {
  const now = new Date().toISOString();
  return {
    id: "req-1",
    name: "Requested Tech",
    slug: "requested-tech",
    description: "Please add this tech",
    aliases: [],
    status: "pending",
    requestedBy: "user@example.com",
    requestedByUser: {
      id: "u1",
      email: "user@example.com",
      displayName: "User One",
    },
    reviewerId: null,
    reviewer: null,
    reviewerNotes: null,
    mappedTechnologyId: null,
    createdTechnologyId: null,
    candidateTechnologyIds: ["tech-1", "tech-2"],
    candidates: [
      {
        id: "tech-1",
        name: "Tech One",
        slug: "tech-one",
        aliases: [],
        judge0LanguageKey: "",
        judge0LanguageId: null,
        status: "active",
      },
      {
        id: "tech-2",
        name: "Tech Two",
        slug: "tech-two",
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

test.beforeEach(async ({ page }) => {
  // Intercept the list endpoint to return our single pending request
  await page.route("**/api/technology/requests**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (method === "GET") {
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
});

test("approve and map to existing technology", async ({ page }) => {
  // Intercept review POST and return updated request
  await page.route("**/api/technology/requests/req-1/review", async (route) => {
    const pd = route.request().postData();
    let body = {} as any;
    if (pd) {
      try {
        body = JSON.parse(pd);
      } catch (e) {
        body = {};
      }
    }
    const now = new Date().toISOString();
    const updated = {
      ...makePendingRequest(),
      status: "approved",
      mappedTechnologyId: body?.mapping?.technologyId ?? "tech-1",
      reviewerId: "admin-1",
      reviewer: {
        id: "admin-1",
        email: "admin@example.com",
        displayName: "Admin",
      },
      updatedAt: now,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ request: updated }),
    });
  });

  await page.goto("/");
  // Wait for the navigation button to be visible then click
  await page.waitForSelector('button:has-text("Technology approvals")', {
    timeout: 5000,
  });
  await page.click('button:has-text("Technology approvals")');
  await page
    .waitForSelector("text=Pending requests", { timeout: 3000 })
    .catch(() => {});

  // Select candidate and submit approve
  await page.selectOption("select#map-existing-req-1", "tech-1");
  await page.click('form.review-form button:has-text("Approve")');

  const toast = await page.waitForSelector(".toast.toast-success", {
    timeout: 3000,
  });
  expect(await toast.innerText()).toContain("Approved");
});

test("approve and create new technology", async ({ page }) => {
  await page.route("**/api/technology/requests/req-1/review", async (route) => {
    const pd = route.request().postData();
    let body = {} as any;
    if (pd) {
      try {
        body = JSON.parse(pd);
      } catch (e) {
        body = {};
      }
    }
    const now = new Date().toISOString();
    const updated = {
      ...makePendingRequest(),
      status: "approved",
      createdTechnologyId: "tech-new-1",
      reviewerId: "admin-1",
      reviewer: {
        id: "admin-1",
        email: "admin@example.com",
        displayName: "Admin",
      },
      updatedAt: now,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        request: updated,
        technology: {
          id: "tech-new-1",
          name: body?.mapping?.aliases?.[0] ?? "NewTech",
          slug: "new-tech",
          aliases: body?.mapping?.aliases ?? [],
        },
      }),
    });
  });

  await page.goto("/");
  await page.waitForSelector('button:has-text("Technology approvals")', {
    timeout: 5000,
  });
  await page.click('button:has-text("Technology approvals")');
  await page
    .waitForSelector("text=Pending requests", { timeout: 3000 })
    .catch(() => {});

  // Fill create new form and submit
  await page.fill("input#create-aliases-req-1", "alias1");
  await page.click('form.review-form button:has-text("Approve new")');

  const toast = await page.waitForSelector(".toast.toast-success", {
    timeout: 3000,
  });
  expect(await toast.innerText()).toContain("Approved");
});

test("reject request flow shows error toast", async ({ page }) => {
  await page.route("**/api/technology/requests/req-1/review", async (route) => {
    const now = new Date().toISOString();
    const updated = {
      ...makePendingRequest(),
      status: "rejected",
      reviewerId: "admin-1",
      reviewer: {
        id: "admin-1",
        email: "admin@example.com",
        displayName: "Admin",
      },
      reviewerNotes: "Not a good fit",
      updatedAt: now,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ request: updated }),
    });
  });

  await page.goto("/");
  await page.waitForSelector('button:has-text("Technology approvals")', {
    timeout: 5000,
  });
  await page.click('button:has-text("Technology approvals")');
  await page
    .waitForSelector("text=Pending requests", { timeout: 3000 })
    .catch(() => {});

  await page.fill("textarea#reject-notes-req-1", "Not relevant");
  await page.click('form.review-form button:has-text("Reject")');

  const toast = await page.waitForSelector(".toast.toast-success", {
    timeout: 3000,
  });
  expect(await toast.innerText()).toContain("Request rejected");
});
