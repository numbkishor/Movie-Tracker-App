"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

/**
 * Only relative, same-site paths are accepted, so a crafted `?next=` cannot turn
 * sign-in into an open redirect.
 */
function safeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  return value;
}

function readCredentials(formData: FormData): { email: string; password: string } | null {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") return null;

  return { email: email.trim(), password };
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData);

  if (!credentials || credentials.email.length === 0 || credentials.password.length === 0) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    // Deliberately not "no account with that email" — that would let anyone
    // check which addresses are registered.
    return { error: "That email and password don't match an account." };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(formData.get("next")));
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData);

  if (!credentials || credentials.email.length === 0) {
    return { error: "Enter an email address." };
  }

  // Supabase enforces a minimum too; checking here gives a useful message
  // instead of a raw API error.
  if (credentials.password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials);

  if (error) {
    return { error: error.message };
  }

  // Session present means email confirmation is off — the account is usable now.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeRedirectPath(formData.get("next")));
  }

  return { notice: "Check your email for a confirmation link, then sign in." };
}
