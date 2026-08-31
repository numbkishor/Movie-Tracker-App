"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { FriendActionButton } from "@/components/friends/friend-actions";
import type { FriendActionState } from "@/app/(app)/friends/actions";
import type { ProfileRow } from "@/lib/supabase/database.types";

type Outcome = { query: string; results: ProfileRow[]; error: string | null };

const DEBOUNCE_MS = 300;

/**
 * Username search for adding friends. Live results, so this is one of the cases
 * .cursorrules allows a client fetch for.
 *
 * People already connected to you are filtered out server-side, so every row
 * here is someone you can actually send a request to.
 */
export function FriendSearch({
  action,
  searchEndpoint,
}: {
  action: (state: FriendActionState, formData: FormData) => Promise<FriendActionState>;
  searchEndpoint: string;
}) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const inputId = useId();
  const requestRef = useRef(0);

  const trimmed = query.trim();
  const settled = outcome?.query === trimmed ? outcome : null;
  const isSearching = trimmed.length >= 2 && settled === null;

  useEffect(() => {
    const search = query.trim();
    if (search.length < 2) return;

    const controller = new AbortController();
    const requestId = ++requestRef.current;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${searchEndpoint}?q=${encodeURIComponent(search)}`, {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        if (requestId !== requestRef.current) return;

        setOutcome({
          query: search,
          results: response.ok ? readProfiles(body) : [],
          error: response.ok ? null : "Could not search right now.",
        });
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestRef.current) return;

        console.error(error);
        setOutcome({ query: search, results: [], error: "Could not reach the server." });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchEndpoint]);

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Find someone"
        htmlFor={inputId}
        hint="Search by username or display name. They'll get a request to accept."
      >
        <Input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="username"
          autoComplete="off"
          maxLength={48}
        />
      </Field>

      <div aria-live="polite" className="min-h-5 text-label text-text-muted">
        {isSearching ? "Searching…" : null}
        {settled?.error ? <span className="text-red-500">{settled.error}</span> : null}
        {settled && !settled.error && settled.results.length === 0
          ? "Nobody matched that."
          : null}
      </div>

      <ul className="flex flex-col gap-2">
        {(settled?.results ?? []).map((profile) => (
          <li
            key={profile.id}
            className="flex items-center gap-3 rounded-glass border border-glass-border bg-bg-2 p-3"
          >
            <Avatar name={profile.display_name} src={profile.avatar_url} size={40} />

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-label font-medium text-text-primary">
                {profile.display_name}
              </span>
              <span className="truncate text-meta text-text-muted">@{profile.username}</span>
            </span>

            <FriendActionButton
              action={action}
              label="Add friend"
              pendingLabel="Sending…"
              variant="primary"
              fields={{ addressee_id: profile.id }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function readProfiles(body: unknown): ProfileRow[] {
  if (typeof body !== "object" || body === null) return [];

  const results = (body as { results?: unknown }).results;
  return Array.isArray(results) ? (results as ProfileRow[]) : [];
}
