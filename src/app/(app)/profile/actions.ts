"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error?: string; saved?: boolean };

// Matches the profiles_username_format CHECK constraint in the migration.
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export async function updateProfile(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();

  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Usernames are 3–24 characters: lowercase letters, numbers and underscores." };
  }

  if (displayName.length < 1 || displayName.length > 48) {
    return { error: "Give a display name between 1 and 48 characters." };
  }

  if (avatarUrl.length > 0 && !isSafeHttpsUrl(avatarUrl)) {
    return { error: "An avatar link must be a full https:// URL." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Sign in again." };
  }

  // RLS restricts this to the caller's own row; the explicit eq() makes that
  // obvious here rather than implied.
  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName,
      avatar_url: avatarUrl.length > 0 ? avatarUrl : null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is taken." };
    }

    console.error("Updating profile failed", error);
    return { error: "Could not save your profile. Try again." };
  }

  revalidatePath("/", "layout");
  return { saved: true };
}

/**
 * https only, and no credentials in the URL — the value is rendered into an
 * <img src>, so a javascript: or userinfo-bearing URL has no business here.
 */
function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}
