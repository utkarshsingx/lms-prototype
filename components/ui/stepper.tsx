import { Check, Lock, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepState = "done" | "current" | "upcoming" | "exempt" | "failed" | "locked";

export type Step = {
  id: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  state: StepState;
};

export const STEP_STATE_LABEL: Record<StepState, string> = {
  done: "Done",
  current: "Current",
  upcoming: "Upcoming",
  exempt: "Exempt",
  failed: "Failed",
  locked: "Locked",
};

const marker: Record<StepState, string> = {
  done: "bg-jade text-on-accent border-jade",
  current: "bg-surface-inv text-cta border-cta ring-4 ring-cta/35",
  upcoming: "bg-surface text-ink-3 border-line-strong",
  exempt: "bg-jade-soft text-jade border-jade border-dashed",
  failed: "bg-rose text-on-accent border-rose",
  locked: "bg-surface-2 text-ink-3 border-line",
};

const labelTone: Record<StepState, string> = {
  done: "text-ink",
  current: "text-ink font-bold",
  upcoming: "text-ink-2",
  exempt: "text-ink",
  failed: "text-rose",
  locked: "text-ink-3",
};

/** Connector colour leading OUT of a step. */
const connector: Record<StepState, string> = {
  done: "bg-jade",
  exempt: "bg-jade/50",
  failed: "bg-rose/60",
  current: "bg-line-strong",
  upcoming: "bg-line-strong",
  locked: "bg-line",
};

function Marker({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-[1] grid size-8 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold tnum",
        marker[state],
      )}
    >
      {state === "done" ? (
        <Check className="size-4" strokeWidth={3} />
      ) : state === "failed" ? (
        <X className="size-4" strokeWidth={3} />
      ) : state === "exempt" ? (
        <ShieldCheck className="size-4" strokeWidth={2.4} />
      ) : state === "locked" ? (
        <Lock className="size-3.5" strokeWidth={2.4} />
      ) : state === "current" ? (
        <span className="size-2.5 rounded-full bg-cta" />
      ) : (
        index + 1
      )}
    </span>
  );
}

function StateTag({ state }: { state: StepState }) {
  if (state === "exempt" || state === "failed" || state === "current") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-1.5 py-px text-[10px] font-bold tracking-[0.06em] uppercase",
          state === "exempt" && "bg-jade-soft text-jade",
          state === "failed" && "bg-rose-soft text-rose",
          state === "current" && "bg-cta text-cta-ink",
        )}
      >
        {STEP_STATE_LABEL[state]}
      </span>
    );
  }
  return <span className="sr-only">({STEP_STATE_LABEL[state]})</span>;
}

export function Stepper({
  steps,
  orientation = "horizontal",
  className,
  "aria-label": ariaLabel = "Progress",
}: {
  steps: Step[];
  orientation?: "horizontal" | "vertical";
  className?: string;
  "aria-label"?: string;
}) {
  if (orientation === "vertical") {
    return (
      <ol aria-label={ariaLabel} className={cn("relative", className)}>
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li
              key={s.id}
              aria-current={s.state === "current" ? "step" : undefined}
              className={cn("relative flex gap-3.5", !last && "pb-5")}
            >
              {!last ? (
                <span
                  aria-hidden
                  className={cn("absolute top-8 bottom-0 left-[15px] w-0.5", connector[s.state])}
                />
              ) : null}
              <Marker state={s.state} index={i} />
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cn("text-[13.5px] leading-snug font-semibold", labelTone[s.state])}>
                    {s.label}
                  </span>
                  <StateTag state={s.state} />
                </div>
                {s.sub ? <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{s.sub}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className={cn("scrollbar-slim -mx-1 overflow-x-auto px-1 pt-1 pb-2", className)}>
      <ol aria-label={ariaLabel} className="flex min-w-max">
        {steps.map((s, i) => {
          const first = i === 0;
          const last = i === steps.length - 1;
          const prev = steps[i - 1];
          return (
            <li
              key={s.id}
              aria-current={s.state === "current" ? "step" : undefined}
              className="relative flex w-[7.5rem] shrink-0 flex-col items-center px-1.5 text-center"
            >
              {!first ? (
                <span
                  aria-hidden
                  className={cn("absolute top-[15px] right-1/2 left-0 h-0.5", connector[prev!.state])}
                />
              ) : null}
              {!last ? (
                <span
                  aria-hidden
                  className={cn("absolute top-[15px] right-0 left-1/2 h-0.5", connector[s.state])}
                />
              ) : null}
              <Marker state={s.state} index={i} />
              <span className={cn("mt-2 text-[12.5px] leading-tight font-semibold", labelTone[s.state])}>
                {s.label}
              </span>
              {s.sub ? <span className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{s.sub}</span> : null}
              <span className="mt-1">
                <StateTag state={s.state} />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
