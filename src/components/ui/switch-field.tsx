import { classNames } from "@/lib/format";

/**
 * A plain checkbox, styled. Deliberately not a JS-driven toggle: it has to
 * submit with the surrounding form and be reachable by keyboard, and a native
 * checkbox does both for free.
 */
export function SwitchField({
  name,
  label,
  hint,
  defaultChecked = false,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  const id = `switch-${name}`;

  return (
    <div className={classNames("flex items-start gap-3", className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
      />
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="text-label font-medium text-text-primary">{label}</span>
        {hint ? <span className="text-meta text-text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}
