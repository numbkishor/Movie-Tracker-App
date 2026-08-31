import { classNames } from "@/lib/format";

const controlStyles =
  "w-full rounded-xl border border-glass-border bg-surface px-3 py-2 text-body " +
  "text-text-primary placeholder:text-text-muted transition-colors " +
  "focus:border-accent/60 focus:outline-none";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label font-medium text-text-secondary">
        {label}
      </label>
      {children}
      {hint ? <p className="text-meta text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames(controlStyles, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={classNames(controlStyles, "resize-y leading-relaxed", className)} {...props} />
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={classNames(
        "rounded-xl border px-3 py-2 text-label",
        tone === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-500"
          : "border-accent-2/30 bg-accent-2/10 text-accent-2",
      )}
    >
      {children}
    </p>
  );
}
