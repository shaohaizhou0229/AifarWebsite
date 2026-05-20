import { cache } from "react";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getProfile } from "@/lib/profiles";
import { getAdminShellInitials } from "@/components/AdminShell";

export const getAdminShellContext = cache(async () => {
  const { user, profile } = await requireAdmin(getProfile);

  return {
    user,
    profile,
    shellUser: {
      name: profile?.displayName || user?.user_metadata?.name || user?.email || "Admin",
      email: profile?.email || user?.email || "",
      initials: getAdminShellInitials(user, profile)
    }
  };
});

export const requireAdminPermissionCached = cache(async (permission) => {
  const context = await getAdminShellContext();

  if (!hasAdminPermission(context.profile, permission)) {
    throw new AdminRequiredError("Administrator permission required.");
  }

  return context;
});
