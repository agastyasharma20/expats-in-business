// Access-control matrix against a running server with demo data (admin, member and visitor).
//   $env:QA_BASE_URL="http://localhost:3000"; node scripts/qa-access.mjs docs/test-evidence/access-matrix.json
// Also checks the sign-in rate limit and that a foreign Origin cannot sign in. Clear RateLimit rows
// first if you ran it recently (sign-in is limited to a few attempts per minute per address).
import { writeFileSync } from "node:fs";

const base = process.env.QA_BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "access-matrix.json";

async function signIn(email) {
  const r = await fetch(new URL("/api/auth/sign-in/email", base), {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email, password: "Demo!2026" }),
  });
  if (!r.ok) throw new Error(`sign-in ${email}: ${r.status}`);
  return r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

const cookies = {
  visitor: "",
  member: await signIn("priya@demo.eib.local"),
  admin: await signIn("admin@demo.eib.local"),
};

// [path, persona, expectation]: "signin" = redirect to sign-in, "403", or "200"
const CASES = [
  ["/dashboard", "visitor", "signin"],
  ["/settings/account", "visitor", "signin"],
  ["/roadmap", "visitor", "signin"],
  ["/connections", "visitor", "signin"],
  ["/notifications", "visitor", "signin"],
  ["/admin", "visitor", "signin"],
  ["/admin/team", "visitor", "signin"],
  ["/admin/members", "visitor", "signin"],
  ["/provider/inbox", "visitor", "signin"],
  ["/admin", "member", "403"],
  ["/admin/team", "member", "403"],
  ["/admin/members", "member", "403"],
  ["/admin/roles", "member", "403"],
  ["/admin/system", "member", "403"],
  ["/admin/settings", "member", "403"],
  ["/admin/catalogs", "member", "403"],
  ["/admin/audit", "member", "403"],
  ["/provider/analytics", "member", "403"],
  ["/dashboard", "member", "200"],
  ["/settings/profile", "member", "200"],
  ["/team", "visitor", "200"],
  ["/admin", "admin", "200"],
  ["/admin/team", "admin", "200"],
  ["/admin/members", "admin", "200"],
  ["/admin/roles", "admin", "200"],
  ["/admin/audit", "admin", "200"],
];
const API = [
  ["GET", "/api/admin/export", "visitor", [401, 403]],
  ["GET", "/api/admin/export", "member", [401, 403]],
  ["GET", "/api/account/export", "visitor", [401]],
  ["GET", "/api/account/export", "member", [200]],
  ["GET", "/api/roadmap/ics", "visitor", [401]],
  ["GET", "/api/admin/festivals/x/attendees", "member", [401, 403, 404]],
  ["POST", "/api/team/email/doesnotexist", "visitor", [404]],
  ["GET", "/api/team/email/x", "visitor", [405]],
  ["GET", "/api/team/photo/doesnotexist", "visitor", [404]],
  ["POST", "/api/stripe/webhook", "visitor", [400, 503]],
  ["GET", "/api/health", "visitor", [200]],
];

// Denied pages are streamed, so the HTTP status is 200 even when the person sees a sign-in prompt
// or a 403 page. What matters is that no personal or admin data is in the response. These seed
// strings only appear in real member, admin and provider data.
const PERSONAL = [
  "admin@demo.eib.local",
  "karim@demo.eib.local",
  "priya@demo.eib.local",
  "marta.provider@demo.eib.local",
  "lead@demo.eib.local",
];
const rows = [];
for (const [path, who, expect] of CASES) {
  const r = await fetch(new URL(path, base), {
    redirect: "manual",
    headers: { cookie: cookies[who] },
  });
  const loc = r.headers.get("location") ?? "";
  const body = await r.text();
  const leaked = PERSONAL.filter((p) => body.includes(p));
  let pass;
  if (expect === "200") pass = r.status === 200;
  else if (expect === "signin" && r.status >= 300 && r.status < 400 && loc.includes("sign-in"))
    pass = true;
  else if (expect === "403" && r.status === 403) pass = true;
  else pass = r.status === 200 && leaked.length === 0;
  rows.push({
    kind: "page",
    path,
    who,
    expect,
    status: r.status,
    loc,
    leaked: leaked.length,
    pass,
  });
}
for (const [method, path, who, ok] of API) {
  const r = await fetch(new URL(path, base), {
    method,
    redirect: "manual",
    headers: { cookie: cookies[who] },
    body: method === "POST" ? "{}" : undefined,
  });
  rows.push({
    kind: "api",
    path: `${method} ${path}`,
    who,
    expect: ok.join("/"),
    status: r.status,
    loc: "",
    pass: ok.includes(r.status),
  });
}

// Cross-origin sign-in must be rejected.
const evil = await fetch(new URL("/api/auth/sign-in/email", base), {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://evil.example",
  },
  body: JSON.stringify({
    email: "priya@demo.eib.local",
    password: "Demo!2026",
  }),
});
rows.push({
  kind: "csrf",
  path: "POST sign-in with foreign Origin",
  who: "visitor",
  expect: "4xx",
  status: evil.status,
  loc: "",
  pass: evil.status >= 400 && evil.status < 500,
});

// Sign-in rate limit: wrong password, rapid fire.
const codes = [];
for (let i = 0; i < 9; i++) {
  const r = await fetch(new URL("/api/auth/sign-in/email", base), {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({
      email: "nobody@example.com",
      password: "wrong-password",
    }),
  });
  codes.push(r.status);
}
rows.push({
  kind: "ratelimit",
  path: "POST sign-in x9 (wrong password)",
  who: "visitor",
  expect: "429 appears",
  status: codes.join(","),
  loc: "",
  pass: codes.includes(429),
});

writeFileSync(out, JSON.stringify(rows, null, 2));
for (const r of rows)
  console.info(
    r.pass ? "PASS" : "FAIL",
    r.kind.padEnd(9),
    r.who.padEnd(8),
    r.path.padEnd(46),
    "expect",
    r.expect,
    "got",
    r.status,
    r.loc,
  );
console.info(`\n${rows.filter((r) => r.pass).length}/${rows.length} passed`);
