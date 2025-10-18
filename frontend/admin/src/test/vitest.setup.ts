// Global test setup for admin package: apply lightweight mocks before tests run
import { vi } from "vitest";
import React from "react";

// Mock useToast globally
vi.mock("../hooks/useToast", () => ({
  useToast: () => ({
    success: () => 1,
    error: () => 1,
    info: () => 1,
  }),
}));

// Mock components globally to prevent importing heavy implementations during test discovery
vi.mock("../components/TechnologyMultiSelect", () => ({
  TechnologyMultiSelect: (props: any) => (
    <div>
      <label>Technologies</label>
      <details className="request-panel">
        <summary>Request a new technology</summary>
        <form className="request-form">
          <input placeholder="Technology name" name="name" />
          <button type="submit">Submit request</button>
        </form>
      </details>
    </div>
  ),
}));

vi.mock("../components/TechnologyDirectoryDashboard", () => ({
  TechnologyDirectoryDashboard: () => (
    <div>
      <header className="page-header">
        <h1>Directory and approvals</h1>
      </header>
    </div>
  ),
}));
