const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canAccessSite } = require("../lib/site-access.cjs");

test("anonymous requests cannot read pages, APIs, files or optimized images", async () => {
  for (const path of ["/", "/fr/docs/private/", "/api/docs/", "/api/docs/private/download/", "/assets/images/aifar-hero.png", "/_next/image", "/_next/data/build/fr/docs.json", "/sitemap.xml", "/fr/docs/file.pdf", "/api/auth/login/extra/"]) {
    assert.equal((await canAccessSite(path, "", () => { throw Error("must not verify"); })).allowed, false, path);
  }
});

test("login flow and its required assets remain reachable in every language", async () => {
  for (const path of ["/en/login/", "/zh-CN/login/", "/fr/register/", "/ar/login/", "/login/", "/api/auth/login/", "/api/auth/callback/", "/assets/images/aifar-logo-full.png", "/_next/static/chunks/login.js"]) {
    assert.equal((await canAccessSite(path, "", () => null)).allowed, true, path);
  }
});

test("forged, expired and unverifiable sessions fail closed", async () => {
  for (const verify of [async () => null, async () => ({}), async () => { throw Error("auth outage"); }]) {
    assert.equal((await canAccessSite("/en/docs/", "invalid-token", verify)).allowed, false);
  }
});

test("only an authenticated user opens protected resources", async () => {
  let received;
  const result = await canAccessSite("/api/docs/", "verified-token", async token => {
    received = token;
    return { id: "user-id", email: "member@example.com" };
  });
  assert.equal(received, "verified-token");
  assert.equal(result.allowed, true);
});
