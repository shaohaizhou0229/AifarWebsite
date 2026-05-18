export const ADMIN_PERMISSIONS = {
  users: "admin.users",
  product: "admin.product",
  downloads: "admin.downloads",
  docs: "admin.docs",
  support: "admin.support",
  contact: "admin.contact"
};

export const ADMIN_PERMISSION_VALUES = Object.values(ADMIN_PERMISSIONS);

export function normalizeAdminPermissions(value) {
  const source = Array.isArray(value) ? value : [];
  return source.filter((permission, index) =>
    ADMIN_PERMISSION_VALUES.includes(permission) && source.indexOf(permission) === index
  );
}

export function hasAdminPermission(profile, permission) {
  if (!permission) return profile?.role === "admin";
  return profile?.role === "admin" && normalizeAdminPermissions(profile?.adminPermissions).includes(permission);
}

export function allAdminPermissions() {
  return [...ADMIN_PERMISSION_VALUES];
}
