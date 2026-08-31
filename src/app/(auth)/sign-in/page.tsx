import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "../auth-form";
import { signIn } from "../actions";
import { FormMessage } from "@/components/ui/field";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-hero font-bold">Welcome back</h1>
        <p className="text-body text-text-secondary">
          Your list follows your account, on whichever device you sign in from.
        </p>
      </header>

      {error === "invalid-link" ? (
        <FormMessage tone="error">That confirmation link has expired or was already used.</FormMessage>
      ) : null}

      <AuthForm
        action={signIn}
        submitLabel="Sign in"
        passwordAutoComplete="current-password"
        next={safeNext}
      />

      <p className="text-label text-text-secondary">
        No account yet?{" "}
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
