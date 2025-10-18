import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // point Turbopack explicitly to the monorepo root to avoid inferring
    // the wrong workspace when user-level lockfiles exist (e.g., pnpm-lock.yaml
    // in the home directory).
    root: path.resolve(__dirname, "../../"),
  },
};

export default nextConfig;
