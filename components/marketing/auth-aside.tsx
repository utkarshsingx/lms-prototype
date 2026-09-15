import { CalendarClock } from "lucide-react";
import { Wordmark } from "@/components/shell/brand";
import { cn } from "@/lib/cn";

type PaperState = "exempt" | "passed" | "current" | "reattempt" | "planned";

const GRADUATE: { code: string; state: PaperState; note?: string }[] = [
  { code: "BT", state: "exempt" },
  { code: "MA", state: "exempt" },
  { code: "FA", state: "exempt" },
  { code: "LW", state: "exempt" },
  { code: "TX", state: "passed", note: "58%" },
  { code: "PM", state: "reattempt", note: "Dec 26" },
  { code: "FR", state: "current", note: "Dec 26" },
  { code: "AA", state: "planned" },
  { code: "FM", state: "planned" },
];

const UNDERGRAD: { code: string; state: PaperState; note?: string }[] = [
  { code: "BT", state: "passed", note: "Sem 1" },
  { code: "MA", state: "passed", note: "Sem 2" },
  { code: "FA", state: "current", note: "18 Nov" },
  { code: "LW", state: "current", note: "Sem 3" },
  { code: "PM", state: "planned", note: "Sem 4" },
  { code: "TX", state: "planned", note: "Sem 4" },
  { code: "FR", state: "planned", note: "Sem 5" },
];

const chip: Record<PaperState, string> = {
  exempt: "border border-dashed border-ink-inv/35 text-ink-inv/70",
  passed: "bg-cta text-cta-ink",
  current: "bg-ink-inv text-surface-inv ring-2 ring-cta ring-offset-2 ring-offset-surface-inv",
  reattempt: "border border-ink-inv/40 text-ink-inv",
  planned: "bg-ink-inv/8 text-ink-inv/45",
};

function Track({
  title,
  sub,
  papers,
}: {
  title: string;
  sub: string;
  papers: { code: string; state: PaperState; note?: string }[];
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-ink-inv/12 bg-ink-inv/[0.04] p-4">
      <p className="text-[13.5px] font-bold text-ink-inv">{title}</p>
      <p className="mt-0.5 text-[12px] text-ink-inv/55">{sub}</p>
      <ol className="mt-3.5 flex flex-wrap gap-x-1.5 gap-y-2.5">
        {papers.map((p) => (
          <li key={p.code} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "grid h-7 min-w-9 place-items-center rounded-[var(--radius-sm)] px-1.5 font-mono text-[11.5px] font-bold",
                chip[p.state],
              )}
            >
              {p.code}
            </span>
            <span className="h-3 text-[9.5px] leading-none text-ink-inv/45 tnum">{p.note ?? ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The black panel beside the sign-in screens: what ACCA LMS is, shown with the
 *  two student journeys it runs side by side. */
export function AuthAside() {
  return (
    <aside className="relative hidden bg-surface-inv text-ink-inv lg:block">
      <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto px-9 py-8 xl:px-11">
        <Wordmark href="/" inverse />

        <div className="mt-10">
          <span className="inline-flex items-center rounded-full bg-cta px-3 py-1 text-[11px] font-bold tracking-[0.06em] text-cta-ink uppercase">
            ACCA programmes by ZSkillup
          </span>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,1.2rem+1.5vw,2.6rem)] leading-[1.06] font-extrabold tracking-[-0.03em]">
            One platform for{" "}
            <span className="underline decoration-cta decoration-[5px] underline-offset-[7px]">
              every ACCA journey
            </span>
          </h2>
          <p className="mt-5 text-[14px] leading-relaxed text-ink-inv/65">
            Graduate learners and university undergraduates study papers, sit mock
            exams and track exemptions, exam entries and PER in one place. Staff run
            programmes, teaching, mentoring and university coordination from their
            own logins.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Track
            title="Graduate ACCA learner"
            sub="Four exemptions, then a paper at a time"
            papers={GRADUATE}
          />
          <Track
            title="University undergraduate"
            sub="Brightwater University · Semester 3"
            papers={UNDERGRAD}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[11px] text-ink-inv/55">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-cta" /> Passed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-ink-inv ring-2 ring-cta" /> Current
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] border border-dashed border-ink-inv/50" />{" "}
              Exempt
            </span>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-ink-inv/12 p-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-cta text-cta-ink">
              <CalendarClock className="size-4.5" />
            </span>
            <span className="min-w-0 text-[12.5px] leading-snug">
              <span className="block font-bold">December 2026 exam session</span>
              <span className="block text-ink-inv/60">Early entry closes 5 Oct 2026</span>
            </span>
          </div>
          <ul className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-inv/12 pt-5">
            {[
              ["6", "logins"],
              ["3", "partner universities"],
              ["13", "ACCA exams tracked"],
            ].map(([v, l]) => (
              <li key={l}>
                <p className="font-display text-[24px] leading-none font-extrabold tnum">{v}</p>
                <p className="mt-1.5 text-[11px] leading-snug text-ink-inv/55">{l}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
