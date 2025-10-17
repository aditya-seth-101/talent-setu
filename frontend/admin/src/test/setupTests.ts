import "@testing-library/jest-dom";

// Provide a simple fetch mock (can be overridden per-test)
if (typeof globalThis.fetch === "undefined") {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({}),
    status: 200,
    text: async () => "",
  });
}
