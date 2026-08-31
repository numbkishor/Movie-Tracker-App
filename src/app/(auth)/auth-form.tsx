"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import type { AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="mt-1 w-full">
      {pending ? "Just a moment…" : label}
    </Button>
  );
}

export function AuthForm({
  action,
  submitLabel,
  passwordHint,
  passwordAutoComplete,
  next,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  passwordHint?: string;
  passwordAutoComplete: "current-password" | "new-password";
  next: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" hint={passwordHint}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          required
          minLength={8}
          placeholder="••••••••"
        />
      </Field>

      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
      {state.notice ? <FormMessage tone="success">{state.notice}</FormMessage> : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
