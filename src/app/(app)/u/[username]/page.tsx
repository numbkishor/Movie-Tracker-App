import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { FriendActionButton } from "@/components/friends/friend-actions";
import { TitleGrid } from "@/components/feed/title-grid";
import { requireProfile } from "@/lib/auth";
import { findProfileByUsername, getFriendshipWith } from "@/lib/friends";
import { formatDate } from "@/lib/format";
import { listWatchedEntries, listWatchlistEntries } from "@/lib/titles";
import {
  blockPerson,
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/app/(app)/friends/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

/**
 * Someone else's profile.
 *
 * What a viewer sees is decided by RLS, not by this component: the entry
 * queries below return a friend's shared rows and nothing at all for a
 * stranger. The branches here only choose the wording — if a policy were wrong,
 * hiding a section in the UI would not make the data safe.
 */
export default async function PersonPage({ params }: { params: Promise<{ username: string }> }) {
  const viewer = await requireProfile();
  if (!viewer) redirect("/sign-in");

  const { username } = await params;
  const profile = await findProfileByUsername(username);

  if (!profile) notFound();
  if (profile.id === viewer.id) redirect("/profile");

  const friendship = await getFriendshipWith(viewer.id, profile.id);
  const isFriend = friendship?.status === "accepted";
  const isBlocked = friendship?.status === "blocked";

  const [watched, watchlist] = isFriend
    ? await Promise.all([listWatchedEntries(profile.id), listWatchlistEntries(profile.id)])
    : [[], []];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} src={profile.avatar_url} size={56} />

          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-display text-hero font-bold leading-tight">
              {profile.display_name}
            </h1>
            <p className="text-label text-text-secondary">
              @{profile.username}
              {profile.created_at
                ? ` · joined ${formatDate(profile.created_at.slice(0, 10)) ?? ""}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Relationship
            friendshipId={friendship?.id ?? null}
            status={friendship?.status ?? null}
            outgoing={friendship?.outgoing ?? false}
            blockedByMe={friendship?.blockedByMe ?? false}
            personId={profile.id}
          />
        </div>
      </header>

      {isBlocked ? (
        <Notice>
          {friendship?.blockedByMe
            ? "You've blocked this person. Neither of you can see the other's entries."
            : "This person has blocked you."}
        </Notice>
      ) : !isFriend ? (
        <Notice>
          {friendship?.status === "pending"
            ? friendship.outgoing
              ? "Your request is waiting for them to accept. Until then, nothing of theirs is visible."
              : "They've asked to be friends. Accept to see whatever they choose to share."
            : "You're not friends, so nothing of theirs is visible here — not even a count."}
        </Notice>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-2 font-display text-card font-medium">
              Shared with you
              <span className="text-meta text-text-muted">{watched.length}</span>
            </h2>

            {watched.length === 0 ? (
              <Notice>
                You&apos;re friends, but they haven&apos;t marked any entries as shared yet.
              </Notice>
            ) : (
              <TitleGrid entries={watched} />
            )}
          </section>

          {watchlist.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 font-display text-card font-medium">
                Their shared watchlist
                <span className="text-meta text-text-muted">{watchlist.length}</span>
              </h2>
              <TitleGrid entries={watchlist} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Relationship({
  friendshipId,
  status,
  outgoing,
  blockedByMe,
  personId,
}: {
  friendshipId: string | null;
  status: string | null;
  outgoing: boolean;
  blockedByMe: boolean;
  personId: string;
}) {
  if (status === "blocked") {
    return blockedByMe && friendshipId ? (
      <FriendActionButton
        action={removeFriendship}
        label="Unblock"
        pendingLabel="…"
        variant="ghost"
        fields={{ friendship_id: friendshipId }}
      />
    ) : null;
  }

  if (status === "accepted" && friendshipId) {
    return (
      <>
        <FriendActionButton
          action={removeFriendship}
          label="Unfriend"
          pendingLabel="…"
          variant="ghost"
          fields={{ friendship_id: friendshipId }}
        />
        <FriendActionButton
          action={blockPerson}
          label="Block"
          pendingLabel="…"
          variant="danger"
          fields={{ friendship_id: friendshipId }}
        />
      </>
    );
  }

  if (status === "pending" && friendshipId) {
    return outgoing ? (
      <FriendActionButton
        action={removeFriendship}
        label="Cancel request"
        pendingLabel="…"
        variant="ghost"
        fields={{ friendship_id: friendshipId }}
      />
    ) : (
      <>
        <FriendActionButton
          action={respondToFriendRequest}
          label="Accept"
          pendingLabel="…"
          variant="primary"
          fields={{ friendship_id: friendshipId, decision: "accept" }}
        />
        <FriendActionButton
          action={respondToFriendRequest}
          label="Decline"
          pendingLabel="…"
          variant="ghost"
          fields={{ friendship_id: friendshipId, decision: "decline" }}
        />
      </>
    );
  }

  return (
    <>
      <FriendActionButton
        action={sendFriendRequest}
        label="Add friend"
        pendingLabel="Sending…"
        variant="primary"
        fields={{ addressee_id: personId }}
      />
      <FriendActionButton
        action={blockPerson}
        label="Block"
        pendingLabel="…"
        variant="danger"
        fields={{ person_id: personId }}
      />
    </>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-glass border border-dashed border-glass-border px-4 py-6 text-center text-body text-text-secondary">
      {children}
    </p>
  );
}
