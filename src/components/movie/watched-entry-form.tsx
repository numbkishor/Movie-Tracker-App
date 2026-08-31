"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";
import { RatingInput } from "@/components/movie/rating-input";
import { todayIsoDate } from "@/lib/format";
import type { EntryFormState } from "@/app/(app)/movie/[id]/actions";
import type { WatchedEntryRow } from "@/lib/supabase/database.types";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isEditing ? "Save changes" : "Add to my list"}
    </Button>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}

export function WatchedEntryForm({
  movieId,
  entry,
  saveAction,
  removeAction,
}: {
  movieId: number;
  entry: WatchedEntryRow | null;
  saveAction: (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;
  removeAction: (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;
}) {
  const router = useRouter();
  const [saveState, save] = useActionState<EntryFormState, FormData>(saveAction, {});
  const [removeState, remove] = useActionState<EntryFormState, FormData>(removeAction, {});

  // The server action revalidates the cache; this pulls the fresh server render
  // into view so the page reflects the save without a manual reload.
  useEffect(() => {
    if (saveState.saved || removeState.saved) {
      router.refresh();
    }
  }, [saveState.saved, removeState.saved, router]);

  const isEditing = entry !== null;

  return (
    <div className="flex flex-col gap-4">
      <form action={save} className="flex flex-col gap-4">
        <input type="hidden" name="movie_id" value={movieId} />

        <Field label="Your rating" htmlFor="rating-input">
          <div id="rating-input">
            <RatingInput name="rating" defaultValue={entry?.rating ?? null} />
          </div>
        </Field>

        <Field label="Watched on" htmlFor="watched_on">
          <Input
            id="watched_on"
            name="watched_on"
            type="date"
            required
            max={todayIsoDate()}
            defaultValue={entry?.watched_on ?? todayIsoDate()}
          />
        </Field>

        <Field label="Your review" htmlFor="review" hint="Optional. Only you can see this.">
          <Textarea
            id="review"
            name="review"
            rows={4}
            maxLength={4000}
            defaultValue={entry?.review ?? ""}
            placeholder="What stayed with you?"
          />
        </Field>

        {saveState.error ? <FormMessage tone="error">{saveState.error}</FormMessage> : null}
        {saveState.saved ? <FormMessage tone="success">Saved to your list.</FormMessage> : null}

        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton isEditing={isEditing} />
        </div>
      </form>

      {isEditing ? (
        <form action={remove} className="flex flex-col gap-2 border-t border-glass-border pt-4">
          <input type="hidden" name="movie_id" value={movieId} />
          {removeState.error ? <FormMessage tone="error">{removeState.error}</FormMessage> : null}
          <div>
            <RemoveButton />
          </div>
        </form>
      ) : null}
    </div>
  );
}
