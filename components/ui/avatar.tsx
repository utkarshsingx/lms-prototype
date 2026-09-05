import { cn } from "@/lib/cn";

/** Deterministic tint so the same person is always the same color. */
const TINTS = [
  "bg-brand-soft text-brand",
  "bg-jade-soft text-jade",
  "bg-ember-soft text-ember",
  "bg-violet-soft text-violet",
  "bg-amber-soft text-amber",
  "bg-rose-soft text-rose",
];

export function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-9.5 text-[12.5px]",
  lg: "size-12 text-[15px]",
  xl: "size-16 text-[20px]",
};

export function Avatar({
  name,
  size = "md",
  className,
  ring,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      title={name}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-tight select-none",
        sizes[size],
        tintFor(name),
        ring && "ring-2 ring-surface",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  max = 4,
  size = "sm",
}: {
  names: string[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((n) => (
        <Avatar key={n} name={n} size={size} ring />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "inline-grid place-items-center rounded-full bg-surface-3 font-semibold text-ink-2 ring-2 ring-surface",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
