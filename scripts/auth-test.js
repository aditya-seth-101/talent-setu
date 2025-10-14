/*
Simple auth flow test script for local development.
Usage: node scripts/auth-test.js [apiBaseUrl]
Default apiBaseUrl: http://localhost:4000

This script uses fetch (node 18+) to run signup -> login -> me -> refresh -> logout
and prints the responses. It expects the API to be running locally.
*/

const apiBase = process.argv[2] || "http://localhost:4000";

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function run() {
  console.log("API base:", apiBase);

  // 1) Signup
  const signupResp = await fetch(`${apiBase}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "autotest+alice@example.test",
      password: "Test12345!",
      roles: ["student"],
    }),
  });
  const signup = await safeJson(signupResp);
  console.log(
    "\nSIGNUP status",
    signupResp.status,
    JSON.stringify(signup, null, 2)
  );

  // 2) Login
  const loginResp = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "autotest+alice@example.test",
      password: "Test12345!",
    }),
  });
  const login = await safeJson(loginResp);
  console.log(
    "\nLOGIN status",
    loginResp.status,
    JSON.stringify(login, null, 2)
  );

  const access = login?.tokens?.accessToken;
  const refresh = login?.tokens?.refreshToken;

  if (!access) {
    console.error("\nNo access token received; aborting further steps.");
    return;
  }

  // 3) Me
  const meResp = await fetch(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  const me = await safeJson(meResp);
  console.log("\nME status", meResp.status, JSON.stringify(me, null, 2));

  // 4) Refresh
  const refreshResp = await fetch(`${apiBase}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  const refreshed = await safeJson(refreshResp);
  console.log(
    "\nREFRESH status",
    refreshResp.status,
    JSON.stringify(refreshed, null, 2)
  );

  // 5) Logout
  const logoutResp = await fetch(`${apiBase}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  const logout = await safeJson(logoutResp);
  console.log(
    "\nLOGOUT status",
    logoutResp.status,
    JSON.stringify(logout, null, 2)
  );
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
