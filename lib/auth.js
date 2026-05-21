import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin-permissions";

export const ACCESS_COOKIE = "aifar_access_token";
export const REFRESH_COOKIE = "aifar_refresh_token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class AdminRequiredError extends Error {
  constructor(message = "Administrator access required.") {
    super(message);
    this.name = "AdminRequiredError";
  }
}

export class AccountInactiveError extends Error {
  constructor(message = "This account is not active.") {
    super(message);
    this.name = "AccountInactiveError";
  }
}

export class AuthConfigurationError extends Error {
  constructor(message = "Supabase authentication configuration is incomplete.") {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function getAuthConfig() {
  const url = process.env.SUPABASE_AUTH_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new AuthConfigurationError();
  }

  return {
    url: url.replace(/\/$/, ""),
    anonKey
  };
}

export function getSupabaseUrl() {
  return getAuthConfig().url;
}

export function getSupabaseAnonKey() {
  return getAuthConfig().anonKey;
}

export function getSupabaseStorageUrl() {
  const url = new URL(getSupabaseUrl());
  const projectRef = url.hostname.split(".")[0];
  return `${url.protocol}//${projectRef}.storage.supabase.co`;
}

function createAuthClient() {
  const { url, anonKey } = getAuthConfig();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function createAdminAuthClient() {
  const { url } = getAuthConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new AuthConfigurationError("Supabase service role key is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function createUserSupabaseClient(accessToken) {
  const { url, anonKey } = getAuthConfig();

  return createClient(url, anonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function createPublicSupabaseClient() {
  return createUserSupabaseClient("");
}

export async function createSessionSupabaseClient(accessToken, refreshToken) {
  if (!accessToken || !refreshToken) {
    throw new AuthRequiredError();
  }

  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  throwAuthError(error, "Authentication session could not be restored.");

  return {
    supabase,
    session: flattenAuthResult(data)
  };
}

export async function createCurrentSessionSupabaseClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value || "";
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value || "";

  return createSessionSupabaseClient(accessToken, refreshToken);
}

export async function createOAuthClient(request, setCookie) {
  const { url, anonKey } = getAuthConfig();
  const { createServerClient } = await import("@supabase/ssr");

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options);
        });
      }
    }
  });
}

function flattenAuthResult(data) {
  return {
    ...(data.session || {}),
    user: data.user || data.session?.user || null
  };
}

function throwAuthError(error, fallback) {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

export async function signInWithPassword(email, password) {
  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  throwAuthError(error, "Sign in failed.");
  return flattenAuthResult(data);
}

export async function signUpWithPassword(email, password, data = {}, emailRedirectTo = "") {
  const supabase = createAuthClient();
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data,
      ...(emailRedirectTo ? { emailRedirectTo } : {})
    }
  });

  throwAuthError(error, "Registration failed.");
  return flattenAuthResult(authData);
}

export async function startGoogleOAuth(request, redirectTo) {
  const pendingCookies = [];
  const supabase = await createOAuthClient(request, (name, value, options) => {
    pendingCookies.push({ name, value, options });
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: "openid email profile",
      queryParams: {
        access_type: "offline",
        prompt: "select_account"
      }
    }
  });

  throwAuthError(error, "Google sign in failed.");

  if (!data?.url) {
    throw new Error("Google sign in URL was not returned.");
  }

  return {
    url: data.url,
    cookies: pendingCookies
  };
}

export async function exchangeOAuthCode(request, code) {
  const pendingCookies = [];
  const supabase = await createOAuthClient(request, (name, value, options) => {
    pendingCookies.push({ name, value, options });
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  throwAuthError(error, "Google sign in callback failed.");

  return {
    session: flattenAuthResult(data),
    cookies: pendingCookies
  };
}

export async function getUserByAccessToken(accessToken) {
  if (!accessToken) return null;

  try {
    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) return null;
    return data.user || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) return null;

  try {
    return await getUserByAccessToken(accessToken);
  } catch {
    return null;
  }
}

export async function getCurrentAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value || "";
}

export async function getCurrentRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value || "";
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.id || !user?.email) {
    throw new AuthRequiredError();
  }
  return user;
}

export async function requireAdmin(getProfile) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (profile?.accountStatus && profile.accountStatus !== "active") {
    throw new AdminRequiredError("This account is not active.");
  }

  if (profile?.role !== "admin") {
    throw new AdminRequiredError();
  }

  return { user, profile };
}

export async function deleteAuthUser(userId) {
  const supabase = createAdminAuthClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    const message = error.message || "Supabase Auth user deletion failed.";
    if (/not found|404/i.test(message)) {
      return { deleted: false, missing: true };
    }
    throw new Error(message);
  }

  return { deleted: true, missing: false };
}

export async function requireAdminPermission(getProfile, permission) {
  const context = await requireAdmin(getProfile);

  if (!hasAdminPermission(context.profile, permission)) {
    throw new AdminRequiredError("Administrator permission required.");
  }

  return context;
}

export function setAuthCookies(response, session) {
  if (session?.access_token) {
    response.cookies.set(ACCESS_COOKIE, session.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: session.expires_in || 3600
    });
  }

  if (session?.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30
    });
  }
}

export function clearAuthCookies(response) {
  response.cookies.set(ACCESS_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
