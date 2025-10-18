import { it } from "vitest";

it("dynamic import debug", async () => {
  console.log("IMPORT-DEBUG: start");
  globalThis.fetch = () =>
    Promise.resolve({ ok: true, json: async () => ({}) }) as any;
  console.log("IMPORT-DEBUG: before import");
  const [tp, multi, dir] = await Promise.all([
    import("./TestProviders"),
    import("../components/TechnologyMultiSelect"),
    import("../components/TechnologyDirectoryDashboard"),
  ]);
  console.log("IMPORT-DEBUG: after import", {
    tp: !!tp,
    multi: !!multi,
    dir: !!dir,
  });
});
