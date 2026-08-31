import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import type { ProfileRow } from "@/lib/supabase/database.types";

/** One person, with whatever actions the surrounding screen offers. */
export function PersonRow({
  profile,
  detail,
  children,
}: {
  profile: ProfileRow;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-glass border border-glass-border bg-bg-2 p-3">
      <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={profile.display_name} src={profile.avatar_url} size={40} />

        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label font-medium text-text-primary">
            {profile.display_name}
          </span>
          <span className="truncate text-meta text-text-muted">
            @{profile.username}
            {detail ? ` · ${detail}` : ""}
          </span>
        </span>
      </Link>

      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}
