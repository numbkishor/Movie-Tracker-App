"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { FriendActionState } from "@/app/(app)/friends/actions";

type Action = (state: FriendActionState, formData: FormData) => Promise<FriendActionState>;

function SubmitButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending} className="px-3 py-1.5">
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * One button that posts a friendship action. Each button is its own form so a
 * row can offer accept/decline/block side by side without any of them
 * submitting the others.
 */
export function FriendActionButton({
  action,
  label,
  pendingLabel,
  variant = "secondary",
  fields,
}: {
  action: Action;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fields: Record<string, string>;
}) {
  const router = useRouter();
  const [state, submit] = useActionState<FriendActionState, FormData>(action, {});

  useEffect(() => {
    if (state.notice) router.refresh();
  }, [state.notice, router]);

  return (
    <form action={submit} className="flex flex-col items-end gap-1">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <SubmitButton label={label} pendingLabel={pendingLabel} variant={variant} />

      {state.error ? (
        <span role="alert" className="text-meta text-red-500">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
