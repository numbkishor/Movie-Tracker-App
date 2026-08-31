import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/database.types";

export type SignedInUser = { id: string; email: string | null };

/** The signed-in user, verified against Supabase rather than read from a cookie. */
export async function getSignedInUser(): Promise<SignedInUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { id: user.id, email: user.email ?? null };
}

/**
 * The signed-in user's profile row, or null if there is no session.
 *
 * A trigger creates the profile on sign-up (see the migration), so a signed-in
 * user with no profile row means that trigger was never installed — worth
 * surfacing loudly rather than rendering a half-broken shell.
 */
export async function requireProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load your profile: ${error.message}`);
  }

  if (!profile) {
    throw new Error(
      "Signed in, but no profile row exists for this account. Apply " +
        "supabase/migrations/0001_init.sql — the on_auth_user_created trigger creates it.",
    );
  }

  return profile;
}
