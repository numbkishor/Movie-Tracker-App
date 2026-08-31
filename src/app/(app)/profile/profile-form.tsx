"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import type { ProfileFormState } from "./actions";
import type { ProfileRow } from "@/lib/supabase/database.types";

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save profile"}
    </Button>
  );
}

export function ProfileForm({
  profile,
  action,
}: {
  profile: ProfileRow;
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
}) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Display name" htmlFor="display_name">
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name}
          required
          maxLength={48}
        />
      </Field>

      <Field
        label="Username"
        htmlFor="username"
        hint="Lowercase letters, numbers and underscores. This is how friends will find you later."
      >
        <Input
          id="username"
          name="username"
          defaultValue={profile.username}
          required
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9_]{3,24}"
        />
      </Field>

      <Field
        label="Avatar link"
        htmlFor="avatar_url"
        hint="Optional https link to an image. There is no upload here."
      >
        <Input
          id="avatar_url"
          name="avatar_url"
          type="url"
          inputMode="url"
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://…"
        />
      </Field>

      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
      {state.saved ? <FormMessage tone="success">Profile saved.</FormMessage> : null}

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
