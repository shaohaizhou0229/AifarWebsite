const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isApprovedProfile, accountAccessError } = require("../lib/account-approval.cjs");

test("only explicit administrator-approved active profiles are allowed", () => {
  for (const status of ["pending_approval", "deactivated", "deleted", undefined]) {
    assert.equal(isApprovedProfile({ accountStatus: status }), false);
  }
  assert.equal(isApprovedProfile(null), false);
  assert.equal(isApprovedProfile({ accountStatus: "active" }), true);
  assert.equal(isApprovedProfile({ account_status: "active" }), true);
});

test("waiting for approval has a dedicated login message", () => {
  assert.equal(accountAccessError({ accountStatus: "pending_approval" }), "account_pending_approval");
  assert.equal(accountAccessError({ accountStatus: "deactivated" }), "account_inactive");
});
