import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  MessageSquareText,
  Package,
  PenSquare,
  PhoneCall,
  Play,
  Route,
  Sparkles,
} from "lucide-react";
import { Mark } from "@/components/shell/brand";
import { LinkButton } from "@/components/ui/button";
import { LiveDot } from "@/components/ui/badge";
import { ThemeMenu } from "@/components/theme/theme-picker";
import { ThemeSection } from "@/components/theme/theme-section";

export const metadata = {
  title: "Meridian — the learning platform",
};

const PILLARS = [
  {
    icon: PenSquare,
    tone: "brand",
    title: "Authoring that survives review",
    body: "Modules, lessons and versions. Publishing a change never moves someone mid-attempt — they finish on the version they started.",
    points: ["Version history with diffs", "Publish checklist", "Co-authors and reviewers"],
  },
  {
    icon: Package,
    tone: "violet",
    title: "Every format, one player",
    body: "Video with chapters and transcripts, readings, PDFs, decks, SCORM 2004 and xAPI packages with their runtime data on screen, labs with a test runner.",
    points: ["SCORM 2004 and xAPI 1.0.3", "Searchable transcripts", "Notes that export"],
  },
  {
    icon: ClipboardCheck,
    tone: "ember",
    title: "Assessment with a straight face",
    body: "Auto-graded quizzes and exams, assignments and projects marked against a rubric the learner reads before they start, not after they fail.",
    points: ["Six question types", "Rubric grading queue", "Nothing graded by a model alone"],
  },
  {
    icon: Route,
    tone: "jade",
    title: "Paths, not shelves",
    body: "Sequence courses against a role, a skill or a moment. Gate a step on evidence rather than attendance, and let the assistant chase what slips.",
    points: ["Role and onboarding tracks", "Evidence gates", "Auto-assignment"],
  },
];

const CHANNELS = [
  {
    icon: Sparkles,
    title: "In-product assistant",
    stat: "82%",
    label: "resolved without a human",
    body: "Grounded in the learner's own record. It answers from the course, acts on the platform, and hands off the moment it hits a decision that is not its to make.",
  },
  {
    icon: MessageSquareText,
    title: "WhatsApp",
    stat: "89%",
    label: "read rate",
    body: "The same assistant, where people actually reply. Opted-in numbers, approved utility templates, and a human takes over inside the same thread.",
  },
  {
    icon: PhoneCall,
    title: "Agentic telephony",
    stat: "+21%",
    label: "completion lift",
    body: "For the learners who never open email. Nova calls, listens, updates the record, and opens a ticket for anything consequential. It says it is automated in its first sentence.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[80rem] items-center gap-8 px-5 sm:px-8">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <Mark className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-rotate-6" />
            <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-ink">
              Meridian
            </span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {[
              ["Product", "#product"],
              ["Channels", "#channels"],
              ["Themes", "#themes"],
              ["Catalog", "/catalog"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
            <ThemeMenu />
            {/* `hidden` and the button's own `inline-flex` are both display
                utilities in the same layer, so a wrapper decides it outright. */}
            <span className="hidden sm:contents">
              <LinkButton href="/login" variant="ghost" size="sm">
                Sign in
              </LinkButton>
            </span>
            <LinkButton href="/signup" size="sm">
              Get started
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full opacity-[0.13] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--brand) 0%, transparent 68%)",
          }}
        />
        <div className="relative mx-auto max-w-[80rem] px-5 pt-20 pb-16 sm:px-8 sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 shadow-[var(--shadow-e1)]">
              <LiveDot tone="jade" />
              Chat, WhatsApp and voice, in one platform
            </span>

            <h1 className="mt-7 font-display text-[clamp(2.6rem,1.8rem+4.4vw,5rem)] leading-[0.98] tracking-[var(--display-tracking)] text-ink">
              A course catalogue
              <br />
              is not a career.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.65] text-ink-2">
              Meridian sequences what someone needs for the role they are moving
              into, gates it on evidence rather than attendance, and follows up
              over chat, WhatsApp or a phone call when they stall.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/dashboard" size="lg">
                <Play className="size-4 fill-current" />
                Explore the prototype
              </LinkButton>
              <LinkButton href="/signup" variant="secondary" size="lg">
                Create an account <ArrowRight className="size-4" />
              </LinkButton>
            </div>
            <p className="mt-4 text-[12.5px] text-ink-3">
              No sign-up needed. Every screen is populated with real-shaped data.
            </p>
          </div>

          {/* Product frame */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-line bg-surface shadow-[var(--shadow-e4)]">
              <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
                <span className="flex gap-1.5">
                  {["#f0574a", "#f6be4f", "#61c454"].map((c) => (
                    <span
                      key={c}
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: c, opacity: 0.85 }}
                    />
                  ))}
                </span>
                <span className="mx-auto rounded-full border border-line bg-surface px-3 py-0.5 font-mono text-[11px] text-ink-3">
                  meridian.northwind.co/dashboard
                </span>
              </div>

              <div className="grid gap-0 sm:grid-cols-[13rem_1fr]">
                <div className="hidden flex-col gap-1.5 border-r border-line bg-surface-2 p-4 sm:flex">
                  {[
                    [BookOpen, "Home", true],
                    [BookOpen, "My learning", false],
                    [Route, "Learning paths", false],
                    [ClipboardCheck, "Assessments", false],
                    [Sparkles, "Assistant", false],
                  ].map(([Icon, label, active], i) => {
                    const I = Icon as typeof BookOpen;
                    return (
                      <span
                        key={i}
                        className={
                          "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[12.5px] " +
                          (active
                            ? "bg-surface font-medium text-ink shadow-[var(--shadow-e1)]"
                            : "text-ink-3")
                        }
                      >
                        <I className="size-3.5" />
                        {label as string}
                      </span>
                    );
                  })}
                </div>

                <div className="p-5 sm:p-7">
                  <p className="text-[11px] text-ink-3">Saturday 5 September</p>
                  <p className="mt-1.5 font-display text-[1.75rem] leading-tight tracking-[var(--display-tracking)] text-ink">
                    Good morning, Anaya
                  </p>

                  <div className="mt-5 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-brand uppercase">
                      In progress
                    </p>
                    <p className="mt-2 font-display text-[1.25rem] leading-snug tracking-[var(--display-tracking)] text-ink">
                      Lab: implement log replication
                    </p>
                    <div className="mt-3.5 flex items-center gap-3">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <span className="block h-full w-[62%] rounded-full bg-brand" />
                      </span>
                      <span className="text-[11.5px] font-semibold text-ink tnum">
                        62%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      ["14h 20m", "this month"],
                      ["4,820", "points"],
                      ["18", "day streak"],
                    ].map(([v, l]) => (
                      <div
                        key={l}
                        className="rounded-[var(--radius-md)] border border-line bg-surface p-3"
                      >
                        <p className="text-[17px] leading-none font-semibold tracking-[-0.02em] text-ink tnum">
                          {v}
                        </p>
                        <p className="mt-1.5 text-[10.5px] text-ink-3">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-b border-line bg-surface-2">
        <div className="mx-auto grid max-w-[80rem] gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {[
            ["4,218", "learners active each month"],
            ["12,650", "enrolments across 13 courses"],
            ["82%", "of questions never reach a human"],
            ["19h", "median grading turnaround"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-[2.4rem] leading-none tracking-[var(--display-tracking)] text-ink tnum">
                {v}
              </p>
              <p className="mt-2.5 text-[13px] leading-snug text-ink-3">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section id="product" className="border-b border-line">
        <div className="mx-auto max-w-[80rem] px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
              The platform
            </p>
            <h2 className="mt-3.5 font-display text-[clamp(2rem,1.5rem+2.2vw,3.2rem)] leading-[1.06] tracking-[var(--display-tracking)] text-ink">
              Four things a learning platform owes you
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="group rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-[var(--shadow-e1)] transition-[box-shadow,border-color,transform] duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-e3)] sm:p-7"
              >
                <span
                  className="grid size-11 place-items-center rounded-[var(--radius-md)]"
                  style={{
                    backgroundColor: `var(--${p.tone}-soft)`,
                    color: `var(--${p.tone})`,
                  }}
                >
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.015em] text-ink">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                  {p.body}
                </p>
                <ul className="mt-4 space-y-2">
                  {p.points.map((x) => (
                    <li
                      key={x}
                      className="flex items-center gap-2.5 text-[13px] text-ink-3"
                    >
                      <Check className="size-3.5 shrink-0 text-jade" strokeWidth={2.5} />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ThemeSection />

      {/* Channels — dark */}
      <section id="channels" className="relative overflow-hidden border-y border-stage-line bg-stage">
        <div className="grain absolute inset-0" />
        <div
          className="pointer-events-none absolute -top-32 right-0 size-[34rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle,var(--stage-brand),transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 size-[30rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle,var(--stage-ember),transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-[80rem] px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-stage-ink/40 uppercase">
              Reach
            </p>
            <h2 className="mt-3.5 font-display text-[clamp(2rem,1.5rem+2.2vw,3.2rem)] leading-[1.06] tracking-[var(--display-tracking)] text-stage-ink">
              The learners who stall are not reading your email
            </h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-stage-ink/55">
              One assistant, three channels, the same record behind all of them.
              It acts where it can, and it stops where a person has to decide.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {CHANNELS.map((c) => (
              <div
                key={c.title}
                className="rounded-[var(--radius-xl)] border border-stage-ink/10 bg-stage-ink/[0.04] p-6 backdrop-blur-sm"
              >
                <span className="grid size-10 place-items-center rounded-[var(--radius-md)] border border-stage-ink/12 bg-stage-ink/[0.06] text-stage-ink/80">
                  <c.icon className="size-4.5" />
                </span>
                <p className="mt-5 font-display text-[2.4rem] leading-none tracking-[var(--display-tracking)] text-stage-ink tnum">
                  {c.stat}
                </p>
                <p className="mt-2 text-[12.5px] text-stage-ink/45">{c.label}</p>
                <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.01em] text-stage-ink">
                  {c.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-stage-ink/55">
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-stage-ink/10 pt-8 text-[12.5px] text-stage-ink/40">
            {[
              "Consent logged before any outbound contact",
              "Calling window in the learner's own timezone",
              "Grades and account decisions always escalate",
            ].map((x) => (
              <span key={x} className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-stage-jade" strokeWidth={2.5} />
                {x}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[80rem] px-5 py-20 text-center sm:px-8 sm:py-24">
          <h2 className="mx-auto max-w-2xl font-display text-[clamp(2rem,1.5rem+2.2vw,3.2rem)] leading-[1.06] tracking-[var(--display-tracking)] text-ink">
            Have a look around
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-ink-2">
            Every screen is populated. Switch between the learner and admin views
            from the sidebar to see both halves of the product.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/dashboard" size="lg">
              Open the dashboard <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="/login" variant="secondary" size="lg">
              Sign in
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="bg-surface-2">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-center gap-x-8 gap-y-4 px-5 py-10 sm:px-8">
          <span className="inline-flex items-center gap-2.5">
            <Mark />
            <span className="text-[14px] font-semibold tracking-[-0.02em] text-ink">
              Meridian
            </span>
          </span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-3">
            {[
              ["Dashboard", "/dashboard"],
              ["Catalog", "/catalog"],
              ["Paths", "/paths"],
              ["Assistant", "/assistant"],
              ["Sign in", "/login"],
            ].map(([l, h]) => (
              <Link key={l} href={h} className="hover:text-ink">
                {l}
              </Link>
            ))}
          </nav>
          <p className="ml-auto text-[12.5px] text-ink-3">
            A design prototype · not a live product
          </p>
        </div>
      </footer>
    </div>
  );
}
