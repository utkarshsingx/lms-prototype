import { cn } from "@/lib/cn";

export type Tone =
  | "neutral"
  | "brand"
  | "jade"
  | "ember"
  | "amber"
  | "rose"
  | "violet"
  | "info"
  | "cta"
  | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  brand: "bg-brand-soft text-brand border-brand-line",
  jade: "bg-jade-soft text-jade border-transparent",
  ember: "bg-ember-soft text-ember border-transparent",
  amber: "bg-amber-soft text-amber border-transparent",
  rose: "bg-rose-soft text-rose border-transparent",
  violet: "bg-violet-soft text-violet border-transparent",
  info: "bg-info-soft text-info border-transparent",
  /* Yellow fill, dark ink. Never yellow text. */
  cta: "bg-cta text-cta-ink border-transparent",
  /* The black identity chip (inverse surface). */
  dark: "bg-surface-inv text-ink-inv border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  dot,
  children,
}: {
  tone?: Tone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span className="size-1.5 rounded-full bg-current opacity-80" />
      ) : null}
      {children}
    </span>
  );
}

/** Uppercase micro-label for metadata rows. */
export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10.5px] font-bold tracking-[0.1em] text-ink-3 uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ tone = "ember" }: { tone?: "ember" | "jade" }) {
  const c = tone === "ember" ? "bg-ember" : "bg-jade";
  return (
    <span className="relative flex size-2">
      <span
        className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", c)}
      />
      <span className={cn("relative inline-flex size-2 rounded-full", c)} />
    </span>
  );
}
