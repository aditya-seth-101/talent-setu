import { it } from "vitest";

it("print react versions", async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const ReactDOM = require("react-dom");
  console.log("TEST REACT VERSION:", React.version);
  // try to read package.json of react-dom
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const pkg = require("react-dom/package.json");
    console.log("TEST REACT-DOM VERSION:", pkg.version);
  } catch (e) {
    console.log("TEST REACT-DOM require failed", e && e.message);
  }
});
