import Image from "next/image";

import { initialsFrom } from "@/lib/format";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import type { CastMember } from "@/lib/tmdb-types";

/**
 * Name, photo and role only. No outbound IMDb link — that is an explicit
 * product decision in docs/prd.md, not an oversight to fill in later.
 */
export function CastRow({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) {
    return <p className="text-body text-text-secondary">TMDB has no cast listed for this title.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {cast.map((member) => {
        const photo = tmdbImageUrl(member.profile_path, "w185");

        return (
          <li key={member.id} className="flex items-center gap-3">
            {photo ? (
              <Image
                src={photo}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full border border-glass-border object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-glass-border bg-surface-strong text-meta font-medium text-text-secondary"
              >
                {initialsFrom(member.name)}
              </span>
            )}

            <span className="flex min-w-0 flex-col">
              <span className="truncate text-label font-medium text-text-primary">{member.name}</span>
              {member.character ? (
                <span className="truncate text-meta text-text-muted">{member.character}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
