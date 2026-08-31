import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getSignedInUser, requireProfile } from "@/lib/auth";
import { ProfileForm } from "./profile-form";
import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");

  const profile = await requireProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar name={profile.display_name} src={profile.avatar_url} size={56} />

        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="font-display text-hero font-bold leading-tight">{profile.display_name}</h1>
          <p className="text-label text-text-secondary">@{profile.username}</p>
        </div>
      </header>

      <section className="rounded-glass border border-glass-border bg-bg-2 p-5">
        <ProfileForm profile={profile} action={updateProfile} />
      </section>

      <section className="flex flex-col gap-3 rounded-glass border border-glass-border bg-bg-2 p-5">
        <h2 className="font-display text-card font-medium">Account</h2>

        <dl className="flex flex-col gap-2 text-label">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Email</dt>
            <dd className="truncate text-text-secondary">{user.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Joined</dt>
            <dd className="text-text-secondary">
              {formatDate(profile.created_at.slice(0, 10)) ?? "—"}
            </dd>
          </div>
        </dl>

        <p className="text-meta text-text-muted">
          Your watched list is private. Sharing with friends is a later phase, and nothing you have
          logged is visible to anyone else until you turn it on.
        </p>

        {/* POST, so signing out can't be triggered by a link or a prefetch. */}
        <form action="/auth/sign-out" method="post" className="pt-1">
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </section>
    </div>
  );
}
