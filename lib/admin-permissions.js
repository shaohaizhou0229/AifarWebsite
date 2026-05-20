import coreRules from "@/lib/core-rules.cjs";

export const ADMIN_PERMISSIONS = coreRules.ADMIN_PERMISSIONS;
export const ADMIN_PERMISSION_VALUES = coreRules.ADMIN_PERMISSION_VALUES;

export function normalizeAdminPermissions(value) {
  return coreRules.normalizeAdminPermissions(value);
}

export function hasAdminPermission(profile, permission) {
  return coreRules.hasAdminPermission(profile, permission);
}

export function allAdminPermissions() {
  return coreRules.allAdminPermissions();
}
