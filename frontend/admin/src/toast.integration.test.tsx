import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

import { TechnologyMultiSelect } from "./components/TechnologyMultiSelect";
import { TechnologyDirectoryDashboard } from "./components/TechnologyDirectoryDashboard";
import * as toastCtx from "./components/toastContext";

describe("Toast integration (smoke)", () => {
  it("TechnologyMultiSelect triggers toast on successful request", async () => {
    const addToast = vi.fn();
    vi.spyOn(toastCtx, "useToastContext").mockReturnValue({
      addToast,
      removeToast: vi.fn(),
    });

    // mock successful backend response
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ request: {}, suggestions: [], duplicate: false }),
    });

    render(<TechnologyMultiSelect selected={[]} onChange={() => {}} />);

    const summary = screen.getByText(/Request a new technology/i);
    expect(summary).toBeInTheDocument();

    // open request panel and submit
    fireEvent.click(summary);
    const nameInput = await screen.findByPlaceholderText(/Technology name/i);
    fireEvent.change(nameInput, { target: { value: "NewTech" } });
    const submit = screen.getByRole("button", { name: /Submit request/i });
    fireEvent.click(submit);

    // wait for addToast to be called with a success toast
    await waitFor(() => {
      expect(addToast).toHaveBeenCalled();
    });

    const callArg = addToast.mock.calls[0]?.[0];
    expect(callArg).toBeTruthy();
    expect(callArg.type).toBe("success");
    expect(callArg.title).toContain("Request submitted");
  });

  it("TechnologyDirectoryDashboard renders and can show more suggestions", () => {
    const addToast = vi.fn();
    vi.spyOn(toastCtx, "useToastContext").mockReturnValue({
      addToast,
      removeToast: vi.fn(),
    });
    render(<TechnologyDirectoryDashboard />);
    expect(screen.getByText(/Directory and approvals/i)).toBeInTheDocument();
  });

  it("TechnologyMultiSelect shows info toast when duplicate detected", async () => {
    const addToast = vi.fn();
    vi.spyOn(toastCtx, "useToastContext").mockReturnValue({
      addToast,
      removeToast: vi.fn(),
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        request: {},
        suggestions: [
          {
            id: "t1",
            name: "Existing",
            slug: "existing",
            aliases: [],
            judge0LanguageKey: "",
            judge0LanguageId: null,
            status: "active",
          },
        ],
        duplicate: true,
      }),
    });

    render(<TechnologyMultiSelect selected={[]} onChange={() => {}} />);
    const summary = screen.getByText(/Request a new technology/i);
    fireEvent.click(summary);
    const nameInput = await screen.findByPlaceholderText(/Technology name/i);
    fireEvent.change(nameInput, { target: { value: "NewTech" } });
    const submit = screen.getByRole("button", { name: /Submit request/i });
    fireEvent.click(submit);

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    const callArg = addToast.mock.calls[0]?.[0];
    expect(callArg.type).toBe("info");
    expect(callArg.title).toMatch(
      /Similar request already exists|Similar request/i
    );
  });

  it("TechnologyMultiSelect shows error toast on network failure", async () => {
    const addToast = vi.fn();
    vi.spyOn(toastCtx, "useToastContext").mockReturnValue({
      addToast,
      removeToast: vi.fn(),
    });

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("network fail"));

    render(<TechnologyMultiSelect selected={[]} onChange={() => {}} />);
    const summary = screen.getByText(/Request a new technology/i);
    fireEvent.click(summary);
    const nameInput = await screen.findByPlaceholderText(/Technology name/i);
    fireEvent.change(nameInput, { target: { value: "NewTech" } });
    const submit = screen.getByRole("button", { name: /Submit request/i });
    fireEvent.click(submit);

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    const callArg = addToast.mock.calls[0]?.[0];
    expect(callArg.type).toBe("error");
    expect(callArg.title).toMatch(
      /Request submission failed|Request submission failed/i
    );
  });

  // cleanup any global fetch mocks after each test
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-ignore
    delete globalThis.fetch;
  });
});
