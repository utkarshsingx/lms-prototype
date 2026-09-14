"use client";

import { useCallback, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, Sparkles, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "ai"
  // Token-named aliases, so a Badge tone can be passed straight through.
  | "jade"
  | "amber"
  | "rose"
  | "violet"
  | "brand";

export type ToastInput = { title: string; body?: string; tone?: ToastTone };
type ToastRecord = ToastInput & { id: number };

const DURATION = 3500;
const MAX_VISIBLE = 4;

/* A module store rather than context: `toast()` then works from any handler,
   and the Toaster mounted once in the shell renders whatever arrives. */
let items: ToastRecord[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((l) => l());
}

export function dismissToast(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  items = items.filter((i) => i.id !== id);
  emit();
}

/** Show a toast. Every create, save, publish and assign action calls this. */
export function toast(input: ToastInput): number {
  const id = nextId++;
  const record: ToastRecord = { ...input, tone: input.tone ?? "success", id };
  items = [...items, record].slice(-MAX_VISIBLE);
  timers.set(
    id,
    setTimeout(() => dismissToast(id), DURATION),
  );
  emit();
  return id;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const EMPTY: ToastRecord[] = [];

/** `const { toast } = useToast(); toast({ title: "Cohort created" })` */
export function useToast() {
  const show = useCallback((input: ToastInput) => toast(input), []);
  return { toast: show, dismiss: dismissToast };
}

type ToneStyle = { icon: typeof Info; tile: string; bar: string };

const TONES: Record<"success" | "info" | "warning" | "danger" | "neutral" | "ai", ToneStyle> = {
  success: { icon: CircleCheck, tile: "bg-jade-soft text-jade", bar: "bg-jade" },
  info: { icon: Info, tile: "bg-info-soft text-info", bar: "bg-info" },
  warning: { icon: TriangleAlert, tile: "bg-amber-soft text-amber", bar: "bg-amber" },
  danger: { icon: CircleAlert, tile: "bg-rose-soft text-rose", bar: "bg-rose" },
  neutral: { icon: Info, tile: "bg-surface-2 text-ink-2", bar: "bg-cta" },
  ai: { icon: Sparkles, tile: "bg-violet-soft text-violet", bar: "bg-violet" },
};

const ALIAS: Record<ToastTone, keyof typeof TONES> = {
  success: "success",
  info: "info",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
  ai: "ai",
  jade: "success",
  amber: "warning",
  rose: "danger",
  violet: "ai",
  brand: "info",
};

/**
 * Renders the toast stack, bottom right. `aboveDock` lifts it clear of the
 * student AI tutor button.
 */
export function Toaster({ aboveDock = false }: { aboveDock?: boolean }) {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed right-4 z-[95] flex w-[min(22rem,calc(100vw-2rem))] flex-col items-stretch gap-2.5 sm:right-6",
        aboveDock ? "bottom-20 sm:bottom-24" : "bottom-4 sm:bottom-6",
      )}
    >
      <AnimatePresence initial={false}>
        {list.map((t) => {
          const style = TONES[ALIAS[t.tone ?? "success"]];
          const Icon = style.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.16 } }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              role={style === TONES.danger ? "alert" : "status"}
              className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface py-3 pr-2.5 pl-3.5 shadow-[var(--shadow-e4)]"
            >
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", style.bar)} />
              <span
                aria-hidden
                className={cn("mt-px grid size-7 shrink-0 place-items-center rounded-full", style.tile)}
              >
                <Icon className="size-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13.5px] leading-snug font-semibold text-ink">{t.title}</p>
                {t.body ? (
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{t.body}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-xs)] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Mount once: renders children plus the Toaster. */
export function ToastProvider({
  children,
  aboveDock = false,
}: {
  children?: React.ReactNode;
  aboveDock?: boolean;
}) {
  return (
    <>
      {children}
      <Toaster aboveDock={aboveDock} />
    </>
  );
}
