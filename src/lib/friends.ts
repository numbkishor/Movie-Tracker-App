import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { FriendshipRow, ProfileRow } from "@/lib/supabase/database.types";
import { listWatchedEntries, type WatchedEntryWithTitle } from "@/lib/titles";

/**
 * A friendship is stored once per pair, in whichever direction it was
 * requested. Everything the UI needs is "who is the other person, and what is
 * my position in this row" — so queries here always resolve to that view rather
 * than making each screen re-derive it.
 */
export type Friendship = {
  id: string;
  status: "pending" | "accepted" | "blocked";
  /** True when the signed-in user sent the request. */
  outgoing: boolean;
  blockedByMe: boolean;
  other: ProfileRow;
  created_at: string;
};

type JoinedFriendship = FriendshipRow & {
  requester: ProfileRow | null;
  addressee: ProfileRow | null;
};

// Two joins onto profiles from one table need the FK names to disambiguate.
const FRIENDSHIP_SELECT =
  "*, requester:profiles!friendships_requester_id_fkey (*), addressee:profiles!friendships_addressee_id_fkey (*)";

function toFriendship(row: JoinedFriendship, viewerId: string): Friendship | null {
  const outgoing = row.requester_id === viewerId;
  const other = outgoing ? row.addressee : row.requester;

  if (!other) return null;

  return {
    id: row.id,
    status: row.status as Friendship["status"],
    outgoing,
    blockedByMe: row.blocked_by === viewerId,
    other,
    created_at: row.created_at,
  };
}

/** Every friendship row the signed-in user is part of, in any state. */
export async function listFriendships(viewerId: string): Promise<Friendship[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load your friends: ${error.message}`);
  }

  return ((data ?? []) as JoinedFriendship[])
    .map((row) => toFriendship(row, viewerId))
    .filter((friendship) => friendship !== null);
}

export type FriendshipBuckets = {
  accepted: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
  blocked: Friendship[];
};

export function bucketFriendships(friendships: Friendship[]): FriendshipBuckets {
  return {
    accepted: friendships.filter((f) => f.status === "accepted"),
    incoming: friendships.filter((f) => f.status === "pending" && !f.outgoing),
    outgoing: friendships.filter((f) => f.status === "pending" && f.outgoing),
    blocked: friendships.filter((f) => f.status === "blocked"),
  };
}

/** How the signed-in user stands with one other person. */
export async function getFriendshipWith(
  viewerId: string,
  otherId: string,
): Promise<Friendship | null> {
  const friendships = await listFriendships(viewerId);
  return friendships.find((friendship) => friendship.other.id === otherId) ?? null;
}

export async function findProfileByUsername(username: string): Promise<ProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Could not look up that username: ${error.message}`);
  }

  return data;
}

/**
 * Username search for adding friends. Profiles are readable by any signed-in
 * user, which is what makes lookup possible at all; nothing about their lists
 * comes back here.
 */
export async function searchProfiles(query: string, viewerId: string): Promise<ProfileRow[]> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();

  // Escaping the LIKE metacharacters keeps a query of "%" from matching everyone.
  const pattern = `%${trimmed.replace(/[%_\\]/g, (match) => `\\${match}`)}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .neq("id", viewerId)
    .limit(10);

  if (error) {
    throw new Error(`Could not search for people: ${error.message}`);
  }

  return data ?? [];
}

export type FriendActivity = {
  friend: ProfileRow;
  entry: WatchedEntryWithTitle;
};

/**
 * Recent public entries from accepted friends, newest first.
 *
 * Each friend's list is fetched separately rather than in one query, because
 * RLS is what filters these rows and it is easier to be confident about "read
 * this friend's visible entries" than about a single query spanning everyone.
 * At friend-group scale the extra round trips are cheap; if that stops being
 * true, the fix is a view with the same policy, not a wider policy.
 */
export async function listFriendActivity(
  viewerId: string,
  limit = 12,
): Promise<FriendActivity[]> {
  const friendships = await listFriendships(viewerId);
  const friends = bucketFriendships(friendships).accepted;

  if (friends.length === 0) return [];

  const perFriend = await Promise.all(
    friends.map(async (friendship) => {
      const entries = await listWatchedEntries(friendship.other.id);
      return entries.map((entry) => ({ friend: friendship.other, entry }));
    }),
  );

  return perFriend
    .flat()
    .sort((a, b) => b.entry.watched_on.localeCompare(a.entry.watched_on))
    .slice(0, limit);
}
