import coreRules from "@/lib/core-rules.cjs";
import {
  AccountInactiveError,
  AuthRequiredError,
  createCurrentSessionSupabaseClient,
  createSessionSupabaseClient,
  signInWithPassword
} from "@/lib/auth";
import { ensureProfile, isProfileActive } from "@/lib/profiles";

function mapIdentity(identity) {
  return {
    identityId: identity.identity_id,
    provider: identity.provider,
    email: identity.email || identity.identity_data?.email || "",
    createdAt: identity.created_at,
    lastSignInAt: identity.last_sign_in_at
  };
}

function mapSecurity(user, identities) {
  const summary = coreRules.summarizeAuthIdentities(identities);
  return {
    email: user?.email || "",
    pendingEmail: user?.new_email || null,
    emailChangeSentAt: user?.email_change_sent_at || null,
    identities: identities.map(mapIdentity),
    ...summary
  };
}

async function readIdentities(supabase) {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) {
    throw new Error(error.message || "Unable to load linked accounts.");
  }
  return data?.identities || [];
}

export async function getAccountSecurityContext() {
  const { supabase, session } = await createCurrentSessionSupabaseClient();
  const user = session.user;

  if (!user?.id || !user?.email) {
    throw new AuthRequiredError();
  }

  const profile = await ensureProfile(user);
  if (!isProfileActive(profile)) {
    throw new AccountInactiveError();
  }

  const identities = await readIdentities(supabase);

  return {
    supabase,
    session,
    user,
    profile,
    identities,
    security: mapSecurity(user, identities)
  };
}

export async function requestAccountEmailChange({ email, redirectTo }) {
  const context = await getAccountSecurityContext();
  const currentEmail = String(context.user.email || "").toLowerCase();

  if (email === currentEmail) {
    const error = new Error("New email must be different from the current email.");
    error.code = "same_email";
    throw error;
  }

  const { data, error } = await context.supabase.auth.updateUser(
    { email },
    redirectTo ? { emailRedirectTo: redirectTo } : {}
  );

  if (error) {
    throw new Error(error.message || "Unable to request email change.");
  }

  const user = data?.user || context.user;
  return {
    ...context,
    user,
    security: mapSecurity(user, context.identities)
  };
}

export async function updateAccountPassword({ currentPassword, newPassword }) {
  const context = await getAccountSecurityContext();
  const security = context.security;
  let supabase = context.supabase;
  let session = context.session;

  if (security.hasEmailIdentity) {
    let verifiedSession;
    try {
      verifiedSession = await signInWithPassword(context.user.email, currentPassword);
    } catch {
      const error = new Error("Current password could not be verified.");
      error.code = "current_password_invalid";
      throw error;
    }

    if (verifiedSession.user?.id !== context.user.id) {
      const error = new Error("Current password could not be verified.");
      error.code = "current_password_invalid";
      throw error;
    }

    const verified = await createSessionSupabaseClient(
      verifiedSession.access_token,
      verifiedSession.refresh_token
    );
    supabase = verified.supabase;
    session = verified.session;
  }

  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(error.message || "Unable to update password.");
  }

  const identities = await readIdentities(supabase).catch(() => context.identities);
  const user = data?.user || session.user || context.user;

  return {
    ...context,
    supabase,
    session,
    user,
    identities,
    security: mapSecurity(user, identities)
  };
}

export async function unlinkGoogleIdentity() {
  const context = await getAccountSecurityContext();
  const googleIdentity = context.identities.find((identity) => identity.provider === "google");

  if (!googleIdentity) {
    const error = new Error("Google is not connected.");
    error.code = "google_not_connected";
    throw error;
  }

  if (!context.security.canUnlinkGoogle) {
    const error = new Error("Set an email password before disconnecting Google.");
    error.code = "google_unlink_blocked";
    throw error;
  }

  const { error } = await context.supabase.auth.unlinkIdentity(googleIdentity);
  if (error) {
    throw new Error(error.message || "Unable to disconnect Google.");
  }

  const identities = await readIdentities(context.supabase);
  return {
    ...context,
    identities,
    security: mapSecurity(context.user, identities)
  };
}
