## Frontend theme, component-repo & setup guidelines

This document outlines the design language, exact theming tokens, component-repo options, integration patterns and recommended tooling for the Talent-Setu frontends. Goal: consistent black & white primary theme with Lakers-jersey-inspired secondary colors across all front-end projects (admin, assessment, learning, recruitment) and a shared component library to enforce reuse.

---

## 1) High level decisions (contract)

- Primary colors: Black and White (used for surfaces, text, UI rhythm)
- Secondary (brand accents): Lakers Purple and Lakers Gold
- Delivery: a shared component library published as an internal npm package (monorepo preferred) + a small theme token package consumed by each app
- Tooling: TypeScript, React, Storybook, Vitest/Jest, ESLint, Prettier, Playwright/Chromatic for visual/acceptance tests

Contract (small):

- Inputs: design tokens (colors, spacing, type), component props (typed), theming overrides
- Outputs: accessible React UI components, CSS variables and optional Tailwind plugin
- Error modes: components must render safe fallbacks for missing props; tokens package should export defaults

---

## 2) Colors & tokens (suggested)

Color palette (hex) — authoritative list:

- --color-black: #000000
- --color-white: #ffffff
- --color-surface-dark: #0a0a0a
- --color-surface-light: #f5f5f5
- --color-lakers-purple: #552583
- --color-lakers-gold: #fdb927
- --color-lakers-gold-alt: #ffc72c
- --color-overlay-white-08: rgba(255,255,255,0.08)
- --color-overlay-black-08: rgba(0,0,0,0.08)

Usage rules:

- Backgrounds: use black/near-black for main app backgrounds; white/off-white for cards and surfaces when using light mode
- Text: prefer white on dark surfaces and black on white surfaces; ensure contrast ratio >= 4.5:1 for body text
- Accents: use Lakers Purple for primary call-to-action outlines, badges and icons; use Lakers Gold for primary CTA fills and highlights

Example CSS variables (tokens) — copy this file to `packages/ui-tokens/src/tokens.css`:

```css
:root {
  --color-black: #000000;
  --color-white: #ffffff;
  --color-surface-dark: #0a0a0a;
  --color-surface-light: #f5f5f5;
  --color-lakers-purple: #552583;
  --color-lakers-gold: #fdb927;
  --color-lakers-gold-alt: #ffc72c;
  --color-overlay-white-08: rgba(255, 255, 255, 0.08);
  --color-overlay-black-08: rgba(0, 0, 0, 0.08);

  --text-primary-dark: var(--color-white);
  --text-primary-light: var(--color-black);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
}
```

Also publish these as a small TypeScript token-export (example below) so apps can import color constants directly.

Example tokens export (TypeScript):

```ts
export const color = {
  black: "#000000",
  white: "#ffffff",
  surfaceDark: "#0a0a0a",
  surfaceLight: "#f5f5f5",
  lakersPurple: "#552583",
  lakersGold: "#fdb927",
};
```

Tailwind config snippet (if using Tailwind): add the colors extension to your Tailwind config:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        black: "#000000",
        white: "#ffffff",
        "lakers-purple": "#552583",
        "lakers-gold": "#fdb927",
      },
      borderRadius: { sm: "6px", md: "10px", lg: "16px" },
    },
  },
};
```

Accessibility note: always validate with contrast checks. If using dark backgrounds with purple accents, ensure text and iconography meet AA/AAA where required.

---

## 3) Component design system

Atomic breakdown (suggested):

- Tokens (colors, spacing, type, z-index)
- Primitives: Button, Icon, Text, Link, Input, Checkbox, Radio, Select
- Layouts: Grid, Stack, Container
- Components: Card, Modal, Toast, Tooltip, Avatar, Badge, Table, Dropdown, NavBar

Design rules:

- Components must be theme-aware (consume CSS variables or a ThemeProvider)
- Prefer composition over inheritance (slot/children props)
- Keep components small and focused; break large components into smaller parts
- Each component must include a Storybook story, unit tests and accessibility attributes

Component API contract example (Button):

- Props: { variant: 'primary'|'secondary'|'ghost', size: 'sm'|'md'|'lg', disabled?: boolean, onClick?: ()=>void }
- Behavior: primary uses Lakers Gold fill on dark surfaces or purple outline on light surfaces; secondary uses purple fill or gold outline depending on context; ghost is transparent

Edge cases to handle:

- Long text / truncation
- Icon-only buttons with accessible labels
- Loading states with spinners
- Right-to-left text (if relevant)

---

## 4) Shared component repo — options & recommended setup

Option A: Monorepo (recommended)

- Use npm workspaces (recommended) or pnpm workspaces (optional). Root workspace with packages:
  - packages/ui-tokens (exports tokens and CSS vars)
  - packages/ui-components (React components, Storybook)
  - packages/ui-utils (helpers, hooks)

Benefits: single repo for components + apps, versioned together or independently, easier local development, consistent tooling

Option B: Separate repo per package

- Use if you want strict separation or different CI pipelines. More overhead for local linking and cross-repo changes.

Minimal package structure (for `packages/ui-components`):

- package.json (name: `@talent-setu/ui-components`)
- src/
  - index.ts (exports)
  - components/
- stories/
- .storybook/
- tsconfig.json

Suggested dev dependencies:

- react, react-dom (peerDependencies)
- typescript
- storybook
- vitest or jest + testing-library
- eslint, prettier
- rollup/tsup for bundling

Build & publish:

- Build: compile to ES modules + CJS and include types
- Publish: Regulate with semantic-release or manual; use Github Packages or internal npm registry

CI example (high-level):

- On PR: run lint, tests, build, storybook build, visual tests
- On main merge: run publish flow (with semantic-release)

---

## 5) Storybook, Testing & Visual QA

- Storybook: one Storybook per workspace package or a single Storybook that aggregates all packages. Stories per component showing all variants and accessibility notes.
- Unit tests: Vitest + React Testing Library for components (happy path + 1-2 edge cases)
- Visual regression: Chromatic or Percy; run snapshots and visual diffs for major components
- E2E/acceptance: Playwright for cross-browser smoke tests

---

## 6) Integration guidelines for existing frontends

Consume tokens/components using either the built package or workspace link during development.

Quick steps to integrate (example for a Next.js app):

1. Add package as dependency: `pnpm add @talent-setu/ui-components` (or `npm i` if using npm)
2. Import CSS variables or ThemeProvider at top-level (e.g., `src/pages/_app.tsx`):

```tsx
import "@talent-setu/ui-components/dist/styles.css";
import { ThemeProvider } from "@talent-setu/ui-components";

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider theme={defaultTokens}>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
```

3. Replace local styles incrementally: start with header/nav, then buttons, then forms

SSR considerations (Next.js/Remix):

- Prefer CSS variables for immediate paint; ensure tokens CSS is included in server render
- Avoid client-only ThemeProvider for above-the-fold colors

---

## 7) Accessibility & performance

- Contrast: ensure 4.5:1 for normal text and 3:1 for large text
- Keyboard focus: visible, high-contrast outlines — prefer a gold or purple focus ring depending on surface
- Reduce bundle size: mark react as peerDependency, tree-shake components, publish ESM builds

---

## 8) Migration plan (practical incremental path)

Phase 0 — bootstrap:

- Create `packages/ui-tokens` and `packages/ui-components` with initial README and exports
- Add CSS variable file and TypeScript token export
- Add a small Button and Text component with stories

Phase 1 — adopt core primitives:

- Replace header/nav in each app with `ui-components` versions
- Replace global CSS reset with tokens

Phase 2 — broader adoption & polish:

- Replace forms, inputs, cards
- Add visual tests and confirm look across apps

Phase 3 — maintenance and governance:

- Define contribution guidelines, design-review process, and release cadence

---

## 9) Quality gates checklist

- Build passes
- Linting and types pass
- Unit tests (core components) pass
- Storybook builds successfully
- Visual tests pass (no unexpected diffs)

Use CI to enforce these on PRs.

---

## 10) Example tasks / next steps (pick one to start)

1. Scaffold the monorepo packages (`ui-tokens`, `ui-components`) with basic build and Storybook (I can scaffold this)
2. Add token CSS and a small Button component with stories and tests
3. Add Tailwind theme extension and examples for `learning` and `admin`
4. Create GH Action to run lint/test/build for packages

---

## 11) Notes & rationale

- Black & white primary keeps UI minimal and accessible; Lakers purple/gold add distinctive, high-energy accents
- Separating tokens from components keeps theming flexible for future alternate themes

---

If you'd like, I can scaffold the monorepo package structure and implement the tokens + a `Button` component with Storybook and tests. I have provided a recommended starting scaffold inside `packages/ui-tokens` and `packages/ui-components` in this repository. See the `packages/` folder for a working example. Next steps below explain how to install and run local builds.

How to run the local packages (recommended):

1. Install dependencies from repo root using npm (workspaces):

```bash
npm install --workspaces --include-workspace-root=false
```

2. Build tokens first, then components:

```bash
npm --workspace=@talent-setu/ui-tokens run build
npm --workspace=@talent-setu/ui-components run build
```

3. (Optional) Run package tests — if present:

```bash
npm --workspace=@talent-setu/ui-components run test
```
