"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";
import { RatingInput } from "@/components/movie/rating-input";
import { SwitchField } from "@/components/ui/switch-field";
import { todayIsoDate } from "@/lib/format";
import type { EntryFormState } from "@/app/(app)/title/[media]/[id]/actions";
import type { MediaType } from "@/lib/tmdb-types";
import type { WatchedEntryRow, WatchlistEntryRow } from "@/lib/supabase/database.types";

function PendingButton({
  idle,
  pendingLabel,
  variant = "primary",
}: {
  idle: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : idle}
    </Button>
  );
}

export function WatchedEntryForm({
  tmdbId,
  mediaType,
  entry,
  watchlistEntry,
  saveAction,
  removeAction,
  watchlistAction,
}: {
  tmdbId: number;
  mediaType: MediaType;
  entry: WatchedEntryRow | null;
  watchlistEntry: WatchlistEntryRow | null;
  saveAction: (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;
  removeAction: (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;
  watchlistAction: (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;
}) {
  const router = useRouter();
  const [saveState, save] = useActionState<EntryFormState, FormData>(saveAction, {});
  const [removeState, remove] = useActionState<EntryFormState, FormData>(removeAction, {});
  const [listState, toggleWatchlist] = useActionState<EntryFormState, FormData>(
    watchlistAction,
    {},
  );

  // The server actions revalidate the cache; this pulls the fresh server render
  // into view so the page reflects the change without a manual reload.
  useEffect(() => {
    if (saveState.saved || removeState.saved || listState.saved) {
      router.refresh();
    }
  }, [saveState.saved, removeState.saved, listState.saved, router]);

  const isEditing = entry !== null;
  const noun = mediaType === "tv" ? "series" : "film";

  return (
    <div className="flex flex-col gap-4">
      <form action={save} className="flex flex-col gap-4">
        <input type="hidden" name="tmdb_id" value={tmdbId} />
        <input type="hidden" name="media_type" value={mediaType} />

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

        <Field label="Your review" htmlFor="review" hint="Optional.">
          <Textarea
            id="review"
            name="review"
            rows={4}
            maxLength={4000}
            defaultValue={entry?.review ?? ""}
            placeholder="What stayed with you?"
          />
        </Field>

        <SwitchField
          name="is_public"
          label="Share with friends"
          hint="Off by default. Only people you've accepted as friends can ever see it — never the public web."
          defaultChecked={entry?.is_public ?? false}
        />

        {saveState.error ? <FormMessage tone="error">{saveState.error}</FormMessage> : null}
        {saveState.saved ? <FormMessage tone="success">Saved to your list.</FormMessage> : null}

        <div>
          <PendingButton
            idle={isEditing ? "Save changes" : `Add this ${noun}`}
            pendingLabel="Saving…"
          />
        </div>
      </form>

      {!isEditing ? (
        <form action={toggleWatchlist} className="flex flex-col gap-2 border-t border-glass-border pt-4">
          <input type="hidden" name="tmdb_id" value={tmdbId} />
          <input type="hidden" name="media_type" value={mediaType} />

          <p className="text-meta text-text-muted">
            {watchlistEntry
              ? `On your watchlist. Logging it as watched takes it off.`
              : `Not watched yet? Keep it for later.`}
          </p>

          {listState.error ? <FormMessage tone="error">{listState.error}</FormMessage> : null}

          <div>
            <PendingButton
              idle={watchlistEntry ? "Remove from watchlist" : "Add to watchlist"}
              pendingLabel="Updating…"
              variant="secondary"
            />
          </div>
        </form>
      ) : null}

      {isEditing ? (
        <form action={remove} className="flex flex-col gap-2 border-t border-glass-border pt-4">
          <input type="hidden" name="tmdb_id" value={tmdbId} />
          <input type="hidden" name="media_type" value={mediaType} />
          {removeState.error ? <FormMessage tone="error">{removeState.error}</FormMessage> : null}
          <div>
            <PendingButton idle="Remove" pendingLabel="Removing…" variant="danger" />
          </div>
        </form>
      ) : null}
    </div>
  );
}
