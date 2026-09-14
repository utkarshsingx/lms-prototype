import { cn } from "@/lib/cn";
import { toneFill, toneSoft, type StatusTone } from "./status";

export type TimelineItem = {
  id: string;
  title: React.ReactNode;
  /** Date, actor or source line, e.g. "12 Feb 2025 · Priya Menon". */
  meta?: React.ReactNode;
  body?: React.ReactNode;
  tone?: StatusTone;
  /** A lucide icon element; replaces the dot. */
  icon?: React.ReactNode;
};

export function Timeline({
  items,
  dense = false,
  empty = "No activity recorded yet.",
  className,
}: {
  items: TimelineItem[];
  dense?: boolean;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className={cn("py-6 text-center text-[13px] text-ink-3", className)}>{empty}</p>;
  }
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, i) => {
        const tone = item.tone ?? "neutral";
        const last = i === items.length - 1;
        return (
          <li key={item.id} className={cn("relative flex gap-3.5", last ? "" : dense ? "pb-4" : "pb-6")}>
            {!last ? (
              <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-line-strong" />
            ) : null}
            <span aria-hidden className="relative z-[1] grid size-8 shrink-0 place-items-center">
              {item.icon ? (
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full border [&>svg]:size-4",
                    toneSoft[tone],
                    tone === "neutral" && "bg-surface",
                  )}
                >
                  {item.icon}
                </span>
              ) : (
                <span className="grid size-4 place-items-center rounded-full bg-surface ring-4 ring-surface">
                  <span className={cn("size-2.5 rounded-full", toneFill[tone])} />
                </span>
              )}
            </span>
            <div className={cn("min-w-0 flex-1", item.icon ? "pt-1" : "pt-1.5")}>
              <p className="text-[13.5px] leading-snug font-semibold text-ink">{item.title}</p>
              {item.meta ? <p className="mt-0.5 text-[12px] text-ink-3">{item.meta}</p> : null}
              {item.body ? (
                <div className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{item.body}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
