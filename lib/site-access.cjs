const LOCALES = ["en", "zh-CN", "fr", "ar"];
const AUTH_ENDPOINTS = new Set([
  "/api/auth/login", "/api/auth/register", "/api/auth/logout",
  "/api/auth/me", "/api/auth/google", "/api/auth/callback"
]);
const JOB_ENDPOINTS = new Set([
  "/api/jobs/collaboration", "/api/jobs/email-notifications"
]);
const LOGIN_ASSETS = new Set([
  "/assets/images/aifar-logo-full.png", "/assets/images/aifar-logo-mark.png"
]);

function describeAccess(pathname) {
  let path;
  try { path = decodeURIComponent(pathname).replace(/\/$/, "") || "/"; }
  catch { return { public: false, api: true, locale: "en" }; }
  const parts = path.split("/");
  const locale = LOCALES.includes(parts[1]) ? parts[1] : "en";
  const page = LOCALES.includes(parts[1]) ? parts.slice(2).join("/") : parts.slice(1).join("/");
  return {
    locale,
    api: path === "/api" || path.startsWith("/api/") || path.startsWith("/_next/image"),
    public: AUTH_ENDPOINTS.has(path) || JOB_ENDPOINTS.has(path) ||
      LOGIN_ASSETS.has(path) || path.startsWith("/_next/static/") ||
      page === "login" || page === "register"
  };
}

async function canAccessSite(pathname, token, verifyToken) {
  const access = describeAccess(pathname);
  if (access.public) return { ...access, allowed: true };
  if (!token) return { ...access, allowed: false };
  try {
    const user = await verifyToken(token);
    return { ...access, allowed: Boolean(user?.id && user?.email) };
  } catch {
    return { ...access, allowed: false };
  }
}

module.exports = { describeAccess, canAccessSite };
