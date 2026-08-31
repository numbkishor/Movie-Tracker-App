import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "../auth-form";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-hero font-bold">Start your list</h1>
        <p className="text-body text-text-secondary">
          Everything you add is private to you by default.
        </p>
      </header>

      <AuthForm
        action={signUp}
        submitLabel="Create account"
        passwordHint="At least 8 characters."
        passwordAutoComplete="new-password"
        next={safeNext}
      />

      <p className="text-label text-text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
