const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ADMIN_PERMISSIONS,
  canCreateCollaborationSpace,
  hasAdminPermission,
  normalizeAdminPermissions,
  normalizeNotificationPreferences,
  normalizeProfileInput,
  normalizeRepeatFrequency,
  normalizeTaskStatus,
  normalizeTaskType,
  nullableDate
} = require("../lib/core-rules.cjs");

test("admin permissions only allow explicit active permission values", () => {
  const profile = {
    role: "admin",
    adminPermissions: [
      ADMIN_PERMISSIONS.users,
      "admin.unknown",
      ADMIN_PERMISSIONS.users,
      ADMIN_PERMISSIONS.collaboration
    ]
  };

  assert.deepEqual(normalizeAdminPermissions(profile.adminPermissions), [
    ADMIN_PERMISSIONS.users,
    ADMIN_PERMISSIONS.collaboration
  ]);
  assert.equal(hasAdminPermission(profile, ADMIN_PERMISSIONS.users), true);
  assert.equal(hasAdminPermission({ role: "user", adminPermissions: [ADMIN_PERMISSIONS.users] }, ADMIN_PERMISSIONS.users), false);
  assert.equal(canCreateCollaborationSpace(profile), true);
  assert.equal(canCreateCollaborationSpace({ role: "admin", adminPermissions: [ADMIN_PERMISSIONS.users] }), false);
});

test("notification preferences default to enabled and preserve explicit opt-outs", () => {
  assert.deepEqual(normalizeNotificationPreferences(null), { email: true, inApp: true });
  assert.deepEqual(normalizeNotificationPreferences([]), { email: true, inApp: true });
  assert.deepEqual(normalizeNotificationPreferences({ email: false }), { email: false, inApp: true });
  assert.deepEqual(normalizeNotificationPreferences({ inApp: false }), { email: true, inApp: false });
});

test("collaboration task rules reject invalid status, type, repeat frequency, and dates", () => {
  assert.equal(normalizeTaskStatus(" "), "not_started");
  assert.equal(normalizeTaskStatus("blocked"), "blocked");
  assert.throws(() => normalizeTaskStatus("paused"), /Invalid task status/);

  assert.equal(normalizeTaskType(" "), "one_time");
  assert.equal(normalizeTaskType("recurring"), "recurring");
  assert.throws(() => normalizeTaskType("milestone"), /Invalid task type/);

  assert.equal(normalizeRepeatFrequency("weekly", "recurring"), "weekly");
  assert.equal(normalizeRepeatFrequency("weekly", "one_time"), null);
  assert.throws(() => normalizeRepeatFrequency("", "recurring"), /Repeat frequency is required/);

  assert.equal(nullableDate(""), null);
  assert.match(nullableDate("2026-06-01"), /^2026-06-01T/);
  assert.throws(() => nullableDate("not-a-date"), /Invalid date/);
});

test("profile input normalization trims user-editable fields and drops non-string values", () => {
  assert.deepEqual(
    normalizeProfileInput({
      displayName: "  Martin  ",
      organization: " Aifar ",
      jobTitle: null,
      countryRegion: " CN ",
      phone: 12345
    }),
    {
      displayName: "Martin",
      organization: "Aifar",
      jobTitle: "",
      countryRegion: "CN",
      phone: ""
    }
  );
});
