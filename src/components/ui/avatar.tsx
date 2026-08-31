import Image from "next/image";

import { classNames, initialsFrom } from "@/lib/format";

/**
 * Initials fallback matches the friend-dot style design.md calls for. There is
 * no upload path in this phase — avatar_url is set from a URL, or left empty.
 */
export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const shared = classNames(
    "shrink-0 overflow-hidden rounded-full border border-glass-border bg-surface-strong",
    className,
  );

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={classNames(shared, "object-cover")}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={classNames(shared, "flex items-center justify-center font-medium text-text-secondary")}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsFrom(name)}
    </span>
  );
}
