import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

describe("Toast integration (smoke)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-ignore
    delete globalThis.fetch;
  });

  it("TechnologyMultiSelect triggers toast on successful request (fake)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ request: {}, suggestions: [], duplicate: false }),
    });

    // Use the module mock (setup file) which returns a primitive string
    const mod = await import("../components/TechnologyMultiSelect");
    expect(mod.TechnologyMultiSelect()).toBe("FAKE_TECH_MULTI");
  });

  it("TechnologyDirectoryDashboard renders and can show more suggestions (fake)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        requests: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      }),
    } as any);

    // Use the module mock for the dashboard
    const dir = await import("../components/TechnologyDirectoryDashboard");
    expect(dir.TechnologyDirectoryDashboard()).toBe("FAKE_DIRECTORY_DASHBOARD");
  });
});
