"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type FriendActionState = { error?: string; notice?: string };

function readUuid(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) ?? "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

async function signedInUserId(): Promise<
  { supabase: Awaited<ReturnType<typeof createClient>>; userId: string } | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, userId: user.id } : null;
}

function refresh(): void {
  revalidatePath("/friends");
  revalidatePath("/");
}

export async function sendFriendRequest(
  _state: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const addresseeId = readUuid(formData, "addressee_id");
  if (!addresseeId) return { error: "That person could not be identified." };

  const session = await signedInUserId();
  if (!session) return { error: "Your session expired. Sign in again." };

  if (addresseeId === session.userId) {
    return { error: "You can't add yourself." };
  }

  const { error } = await session.supabase.from("friendships").insert({
    requester_id: session.userId,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) {
    // The pair index is what stops A→B and B→A both existing; hitting it means
    // there is already a row, which is a state, not a failure.
    if (error.code === "23505") {
      return { notice: "You already have a request with this person." };
    }

    // A blocked pair fails the insert policy rather than a constraint.
    if (error.code === "42501") {
      return { error: "You can't send a request to this person." };
    }

    console.error("Sending friend request failed", error);
    return { error: "Could not send that request. Try again." };
  }

  refresh();
  return { notice: "Request sent." };
}

export async function respondToFriendRequest(
  _state: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const friendshipId = readUuid(formData, "friendship_id");
  const decision = String(formData.get("decision") ?? "");

  if (!friendshipId || (decision !== "accept" && decision !== "decline")) {
    return { error: "That request could not be identified." };
  }

  const session = await signedInUserId();
  if (!session) return { error: "Your session expired. Sign in again." };

  // Declining deletes the row rather than storing a rejection: there is nothing
  // useful to remember, and it leaves the pair free to try again later.
  const { error } =
    decision === "accept"
      ? await session.supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", friendshipId)
      : await session.supabase.from("friendships").delete().eq("id", friendshipId);

  if (error) {
    console.error("Responding to friend request failed", error);
    return { error: "Could not update that request. Try again." };
  }

  refresh();
  return { notice: decision === "accept" ? "You're now friends." : "Request declined." };
}

/** Unfriend, cancel a sent request, or lift a block you placed. */
export async function removeFriendship(
  _state: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const friendshipId = readUuid(formData, "friendship_id");
  if (!friendshipId) return { error: "That person could not be identified." };

  const session = await signedInUserId();
  if (!session) return { error: "Your session expired. Sign in again." };

  const { error } = await session.supabase.from("friendships").delete().eq("id", friendshipId);

  if (error) {
    console.error("Removing friendship failed", error);
    return { error: "Could not update that. Try again." };
  }

  refresh();
  return { notice: "Done." };
}

export async function blockPerson(
  _state: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const session = await signedInUserId();
  if (!session) return { error: "Your session expired. Sign in again." };

  const friendshipId = readUuid(formData, "friendship_id");

  if (friendshipId) {
    const { error } = await session.supabase
      .from("friendships")
      .update({ status: "blocked", blocked_by: session.userId })
      .eq("id", friendshipId);

    if (error) {
      console.error("Blocking failed", error);
      return { error: "Could not block that person. Try again." };
    }

    refresh();
    return { notice: "Blocked." };
  }

  // No existing row: blocking someone you were never connected to. The insert
  // policy only allows creating a pending row, so this is two steps.
  const personId = readUuid(formData, "person_id");
  if (!personId) return { error: "That person could not be identified." };

  const { data: created, error: insertError } = await session.supabase
    .from("friendships")
    .insert({ requester_id: session.userId, addressee_id: personId, status: "pending" })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("Blocking failed at insert", insertError);
    return { error: "Could not block that person. Try again." };
  }

  const { error } = await session.supabase
    .from("friendships")
    .update({ status: "blocked", blocked_by: session.userId })
    .eq("id", created.id);

  if (error) {
    console.error("Blocking failed at update", error);
    return { error: "Could not block that person. Try again." };
  }

  refresh();
  return { notice: "Blocked." };
}
