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
  TechnologyMultiSelect: (props: any) => {
    // Return a primitive string to avoid creating React element objects at module load time
    return "FAKE_TECH_MULTI";
  },
}));

vi.mock("../components/TechnologyDirectoryDashboard", () => ({
  TechnologyDirectoryDashboard: () => {
    return "FAKE_DIRECTORY_DASHBOARD";
  },
}));

// Also mock the same components when imported from src/ using "./components/..."
vi.mock("./components/TechnologyMultiSelect", () => ({
  TechnologyMultiSelect: (props: any) => "FAKE_TECH_MULTI",
}));

vi.mock("./components/TechnologyDirectoryDashboard", () => ({
  TechnologyDirectoryDashboard: () => "FAKE_DIRECTORY_DASHBOARD",
}));
