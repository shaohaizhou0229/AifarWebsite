const ADMIN_PERMISSIONS = {
  users: "admin.users",
  product: "admin.product",
  downloads: "admin.downloads",
  docs: "admin.docs",
  support: "admin.support",
  contact: "admin.contact",
  collaboration: "admin.collaboration"
};

const ADMIN_PERMISSION_VALUES = Object.values(ADMIN_PERMISSIONS);

const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: true,
  inApp: true
};

const TASK_STATUSES = new Set(["not_started", "in_progress", "blocked", "completed"]);
const TASK_TYPES = new Set(["one_time", "recurring"]);
const REPEAT_FREQUENCIES = new Set(["daily", "weekly", "monthly"]);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value) {
  const next = clean(value);
  return next || null;
}

function nullableDate(value) {
  const next = clean(value);
  if (!next) return null;
  const date = new Date(next);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }
  return date.toISOString();
}

function normalizeAdminPermissions(value) {
  const source = Array.isArray(value) ? value : [];
  return source.filter((permission, index) =>
    ADMIN_PERMISSION_VALUES.includes(permission) && source.indexOf(permission) === index
  );
}

function hasAdminPermission(profile, permission) {
  if (!permission) return profile?.role === "admin";
  return profile?.role === "admin" && normalizeAdminPermissions(profile?.adminPermissions).includes(permission);
}

function allAdminPermissions() {
  return [...ADMIN_PERMISSION_VALUES];
}

function normalizeNotificationPreferences(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    email: source.email !== false,
    inApp: source.inApp !== false
  };
}

function normalizeTaskStatus(value) {
  const status = clean(value) || "not_started";
  if (!TASK_STATUSES.has(status)) {
    throw new Error("Invalid task status.");
  }
  return status;
}

function normalizeTaskType(value) {
  const type = clean(value) || "one_time";
  if (!TASK_TYPES.has(type)) {
    throw new Error("Invalid task type.");
  }
  return type;
}

function normalizeRepeatFrequency(value, taskType) {
  const frequency = clean(value);
  if (taskType !== "recurring") return null;
  if (!REPEAT_FREQUENCIES.has(frequency)) {
    throw new Error("Repeat frequency is required.");
  }
  return frequency;
}

function canCreateCollaborationSpace(profile) {
  return hasAdminPermission(profile, ADMIN_PERMISSIONS.collaboration);
}

function normalizeProfileInput(input = {}) {
  return {
    displayName: clean(input.displayName),
    organization: clean(input.organization),
    jobTitle: clean(input.jobTitle),
    countryRegion: clean(input.countryRegion),
    phone: clean(input.phone)
  };
}

module.exports = {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_VALUES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  TASK_STATUSES,
  TASK_TYPES,
  REPEAT_FREQUENCIES,
  allAdminPermissions,
  canCreateCollaborationSpace,
  clean,
  hasAdminPermission,
  normalizeAdminPermissions,
  normalizeNotificationPreferences,
  normalizeProfileInput,
  normalizeRepeatFrequency,
  normalizeTaskStatus,
  normalizeTaskType,
  nullableDate,
  nullableText
};
