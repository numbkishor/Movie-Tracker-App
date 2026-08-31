import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FriendActionButton } from "@/components/friends/friend-actions";
import { FriendSearch } from "@/components/friends/friend-search";
import { PersonRow } from "@/components/friends/person-row";
import { requireProfile } from "@/lib/auth";
import { bucketFriendships, listFriendships, type Friendship } from "@/lib/friends";
import {
  blockPerson,
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
} from "./actions";

export const metadata: Metadata = { title: "Friends" };
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const profile = await requireProfile();
  if (!profile) redirect("/sign-in");

  const buckets = bucketFriendships(await listFriendships(profile.id));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-hero font-bold">Friends</h1>
        <p className="text-body text-text-secondary">
          Nothing you&apos;ve logged is shared until you mark it shared, entry by entry.
        </p>
      </header>

      {buckets.incoming.length > 0 ? (
        <Section title="Requests for you" count={buckets.incoming.length}>
          {buckets.incoming.map((friendship) => (
            <PersonRow key={friendship.id} profile={friendship.other} detail="wants to be friends">
              <FriendActionButton
                action={respondToFriendRequest}
                label="Accept"
                pendingLabel="…"
                variant="primary"
                fields={{ friendship_id: friendship.id, decision: "accept" }}
              />
              <FriendActionButton
                action={respondToFriendRequest}
                label="Decline"
                pendingLabel="…"
                variant="ghost"
                fields={{ friendship_id: friendship.id, decision: "decline" }}
              />
              <FriendActionButton
                action={blockPerson}
                label="Block"
                pendingLabel="…"
                variant="danger"
                fields={{ friendship_id: friendship.id }}
              />
            </PersonRow>
          ))}
        </Section>
      ) : null}

      <Section title="Your friends" count={buckets.accepted.length}>
        {buckets.accepted.length === 0 ? (
          <Empty>
            No friends yet. Find someone below — they&apos;ll need to accept before either of you
            sees anything.
          </Empty>
        ) : (
          buckets.accepted.map((friendship) => (
            <PersonRow key={friendship.id} profile={friendship.other}>
              <FriendActionButton
                action={removeFriendship}
                label="Unfriend"
                pendingLabel="…"
                variant="ghost"
                fields={{ friendship_id: friendship.id }}
              />
              <FriendActionButton
                action={blockPerson}
                label="Block"
                pendingLabel="…"
                variant="danger"
                fields={{ friendship_id: friendship.id }}
              />
            </PersonRow>
          ))
        )}
      </Section>

      {buckets.outgoing.length > 0 ? (
        <Section title="Requests you've sent" count={buckets.outgoing.length}>
          {buckets.outgoing.map((friendship) => (
            <PersonRow key={friendship.id} profile={friendship.other} detail="waiting for a reply">
              <FriendActionButton
                action={removeFriendship}
                label="Cancel"
                pendingLabel="…"
                variant="ghost"
                fields={{ friendship_id: friendship.id }}
              />
            </PersonRow>
          ))}
        </Section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-glass border border-glass-border bg-bg-2 p-5">
        <h2 className="font-display text-card font-medium">Add a friend</h2>
        <FriendSearch action={sendFriendRequest} searchEndpoint="/api/people/search" />
      </section>

      {buckets.blocked.length > 0 ? (
        <Section title="Blocked" count={buckets.blocked.length}>
          {buckets.blocked.map((friendship) => (
            <BlockedRow key={friendship.id} friendship={friendship} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function BlockedRow({ friendship }: { friendship: Friendship }) {
  return (
    <PersonRow
      profile={friendship.other}
      detail={friendship.blockedByMe ? "you blocked them" : "they blocked you"}
    >
      {/* Only the person who placed a block can lift it. */}
      {friendship.blockedByMe ? (
        <FriendActionButton
          action={removeFriendship}
          label="Unblock"
          pendingLabel="…"
          variant="ghost"
          fields={{ friendship_id: friendship.id }}
        />
      ) : null}
    </PersonRow>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-2 font-display text-card font-medium">
        {title}
        <span className="text-meta text-text-muted">{count}</span>
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-glass border border-dashed border-glass-border px-4 py-6 text-center text-body text-text-secondary">
      {children}
    </p>
  );
}
