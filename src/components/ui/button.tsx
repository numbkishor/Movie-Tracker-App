import Link from "next/link";

import { classNames } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-label font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent/90",
  secondary:
    "border border-glass-border bg-surface text-text-primary hover:bg-surface-strong",
  ghost: "text-text-secondary hover:bg-surface hover:text-text-primary",
  // Not a third brand colour — a system red reserved for destructive actions only.
  danger: "border border-red-500/40 text-red-500 hover:bg-red-500/10",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={classNames(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={classNames(base, variants[variant], className)} {...props} />;
}
