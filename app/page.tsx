import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, Check, GraduationCap } from "lucide-react";
import { Wordmark } from "@/components/shell/brand";
import { LinkButton } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme/theme-picker";
import { ThemeSection } from "@/components/theme/theme-section";
import { ROLE_ICONS } from "@/lib/nav";
import { ROLES, personasForRole, type RoleId } from "@/lib/personas";
import { cn } from "@/lib/cn";

export const metadata = {
  title: { absolute: "ACCA LMS · Powered by ZSkillup" },
  description:
    "One ACCA learning platform for graduate learners and university undergraduates, with six logins for ZSkillup, universities, faculty, mentors and students.",
};

const HIGHLIGHTS: Record<RoleId, string[]> = {
  "super-admin": [
    "Partner universities, workspaces and branding",
    "ACCA paper structure and exemption rules",
    "Cross-university reports and audit logs",
  ],
  "programme-admin": [
    "Cohorts, batches, calendars and live classes",
    "ACCA registrations, exemptions and results",
    "Support tickets, with finance by permission",
  ],
  "university-admin": [
    "University-linked students and semesters",
    "Curriculum-to-ACCA mapping and roadmaps",
    "Joint-certificate eligibility and reports",
  ],
  faculty: [
    "Live classes, attendance and recordings",
    "Content studio with review before publishing",
    "Question banks, mock exams and grading",
  ],
  mentor: [
    "Risk alerts, action plans and mentor notes",
    "Resume reviews and mock interviews",
    "Jobs, internships and the placement pipeline",
  ],
  student: [
    "Papers, live classes and mock exams",
    "Readiness score, exam bookings and results",
    "AI tutor, mentor support and career centre",
  ],
};

const JOURNEYS = [
  {
    id: "graduate",
    icon: GraduationCap,
    eyebrow: "Graduate ACCA learner",
    title: "A personal route to membership",
    body: "For graduates studying with ZSkillup directly. Exemptions come first, then a plan built around work and exam sessions.",
    points: [
      "Qualification-document upload and exemption evaluation",
      "Paper selection and a fast-track journey",
      "Weekend or weekday batches, with reattempt and revision cohorts",
      "Previous-attempt recording and a personal ACCA completion plan",
      "Career-transition roadmap",
    ],
    example: {
      who: "Anaya Rao · accounts executive, Bengaluru",
      steps: [
        ["BT MA FA LW", "Exempt"],
        ["TX", "Passed Mar 2026"],
        ["PM", "Reattempt Dec 2026"],
        ["FR", "Current paper"],
      ],
    },
  },
  {
    id: "university",
    icon: Building2,
    eyebrow: "University undergraduate",
    title: "ACCA papers inside the degree",
    body: "For students of partner universities. The ACCA sequence follows the semester and steps around university exams.",
    points: [
      "University and cohort identity, with the current semester",
      "Semester-to-ACCA roadmap and university-subject overlap",
      "Academic-calendar alignment and examination blackout periods",
      "University cohort community and cohort leaderboard",
      "Joint-certificate eligibility and university announcements",
    ],
    example: {
      who: "Rohan Iyer · Brightwater University, Semester 3",
      steps: [
        ["BT", "Passed Sem 1"],
        ["MA", "Passed Sem 2"],
        ["FA", "Exam 18 Nov 2026"],
        ["LW", "Semester 3"],
      ],
    },
  },
] as const;

const sectionLabel = "text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase";
const h2 =
  "mt-3 font-display text-[clamp(1.9rem,1.4rem+2vw,3rem)] leading-[1.06] font-extrabold tracking-[-0.03em] text-ink";

export default function Landing() {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[80rem] items-center gap-8 px-4 sm:px-8">
          <Wordmark href="/" />
          <nav className="hidden items-center gap-7 md:flex">
            {[
              ["Six logins", "#logins"],
              ["Journeys", "#journeys"],
              ["Themes", "#themes"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="text-[13.5px] font-semibold text-ink-2 transition-colors hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
            <span className="hidden sm:contents">
              <ThemeMenu />
            </span>
            <LinkButton href="/login" size="sm">
              Sign in
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[80rem] gap-10 px-4 pt-14 pb-14 sm:px-8 sm:pt-20 sm:pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-inv px-3 py-1.5 text-[12px] font-bold text-ink-inv">
              <span className="size-2 rounded-full bg-cta" />
              ACCA LMS · Powered by ZSkillup
            </span>
            <h1 className="mt-6 font-display text-[clamp(2.4rem,1.6rem+3.8vw,4.4rem)] leading-[1] font-extrabold tracking-[-0.035em] text-ink">
              One platform for graduate and university{" "}
              <span className="underline decoration-cta decoration-[6px] underline-offset-[8px]">
                ACCA journeys
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-[16.5px] leading-[1.65] text-ink-2">
              Graduate learners and university undergraduates share one student login that
              adapts to how they study. ZSkillup, partner universities, faculty and mentors
              each work from a login of their own, on the same ACCA record.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/login" size="lg">
                Choose a login <ArrowRight className="size-4" />
              </LinkButton>
              <LinkButton href="/signup" variant="secondary" size="lg">
                Create a student account
              </LinkButton>
            </div>
          </div>

          <div className="min-w-0 rounded-[var(--radius-xl)] bg-surface-inv p-6 text-ink-inv sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-cta text-cta-ink">
                <CalendarClock className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/55 uppercase">
                  Next exam session
                </p>
                <p className="font-display text-[20px] font-extrabold tracking-[-0.02em]">
                  December 2026
                </p>
              </div>
            </div>
            <ul className="mt-5 divide-y divide-ink-inv/10 border-y border-ink-inv/10">
              {[
                ["Early entry closes", "5 Oct 2026"],
                ["Standard entry closes", "2 Nov 2026"],
                ["Late entry closes", "16 Nov 2026"],
                ["Exams", "7 to 10 Dec 2026"],
                ["Results", "25 Jan 2027"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]">
                  <span className="text-ink-inv/65">{k}</span>
                  <span className="font-semibold tnum">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["610", "learners"],
                ["3", "partner universities"],
                ["13", "ACCA exams tracked"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-display text-[26px] leading-none font-extrabold tnum">{v}</p>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-ink-inv/55">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Six logins */}
      <section id="logins" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-[80rem] px-4 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className={sectionLabel}>Six logins</p>
              <h2 className={h2}>Everyone works from their own login</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
                Each login has its own navigation, dashboard and permissions. Finance and
                support sit inside Programme Admin as restricted permissions.
              </p>
            </div>
            <LinkButton href="/login" variant="secondary">
              Open the sign-in page <ArrowRight className="size-4" />
            </LinkButton>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r, i) => {
              const Icon = ROLE_ICONS[r.id];
              return (
                <Link
                  key={r.id}
                  href={`/login?role=${r.id}`}
                  className="group flex flex-col rounded-[var(--radius-xl)] border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-150 hover:border-nav-active hover:shadow-[0_0_0_3px_var(--cta)] sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-nav-active text-nav-active-icon">
                      <Icon className="size-5" strokeWidth={2.1} />
                    </span>
                    <span className="font-mono text-[12px] font-bold text-ink-3">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-[17px] font-bold tracking-[-0.01em] text-ink">{r.label}</h3>
                  <p className="mt-1 text-[13px] leading-snug text-ink-3">{r.who}</p>
                  <ul className="mt-4 space-y-2">
                    {HIGHLIGHTS[r.id].map((h) => (
                      <li key={h} className="flex items-start gap-2 text-[13px] text-ink-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-jade" strokeWidth={2.6} />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-[12.5px]">
                    <span className="min-w-0 truncate text-ink-3">
                      {personasForRole(r.id)
                        .map((p) => p.name)
                        .join(", ")}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink underline decoration-cta decoration-2 underline-offset-2">
                      Sign in <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Journeys */}
      <section id="journeys" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-[80rem] px-4 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className={sectionLabel}>One student login, two journeys</p>
            <h2 className={h2}>The dashboard changes with the student type</h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {JOURNEYS.map((j, idx) => {
              const dark = idx === 1;
              return (
                <div
                  key={j.id}
                  className={cn(
                    "flex flex-col rounded-[var(--radius-xl)] p-6 sm:p-8",
                    dark ? "bg-surface-inv text-ink-inv" : "border border-line bg-surface text-ink",
                  )}
                >
                  <span className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-cta text-cta-ink">
                    <j.icon className="size-5" />
                  </span>
                  <p
                    className={cn(
                      "mt-5 text-[11px] font-bold tracking-[0.12em] uppercase",
                      dark ? "text-ink-inv/55" : "text-ink-3",
                    )}
                  >
                    {j.eyebrow}
                  </p>
                  <h3 className="mt-2 font-display text-[26px] leading-tight font-extrabold tracking-[-0.03em]">
                    {j.title}
                  </h3>
                  <p className={cn("mt-2.5 text-[14px] leading-relaxed", dark ? "text-ink-inv/70" : "text-ink-2")}>
                    {j.body}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {j.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[13.5px]">
                        <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-cta text-cta-ink">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span className={dark ? "text-ink-inv/85" : "text-ink-2"}>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div
                    className={cn(
                      "mt-6 rounded-[var(--radius-lg)] p-4",
                      dark ? "border border-ink-inv/12" : "bg-surface-2",
                    )}
                  >
                    <p className={cn("text-[12px] font-semibold", dark ? "text-ink-inv/65" : "text-ink-3")}>
                      {j.example.who}
                    </p>
                    <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {j.example.steps.map(([code, state]) => (
                        <li
                          key={code}
                          className={cn(
                            "rounded-[var(--radius-sm)] px-2.5 py-2",
                            dark ? "bg-ink-inv/[0.06]" : "border border-line bg-surface",
                          )}
                        >
                          <span className="block font-mono text-[12.5px] font-bold">{code}</span>
                          <span
                            className={cn("mt-0.5 block text-[11px] leading-snug", dark ? "text-ink-inv/60" : "text-ink-3")}
                          >
                            {state}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ThemeSection />

      {/* Closing band */}
      <section className="bg-surface-inv text-ink-inv">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-[clamp(1.7rem,1.3rem+1.6vw,2.4rem)] leading-[1.08] font-extrabold tracking-[-0.03em]">
              See every workspace
            </h2>
            <p className="mt-2 text-[14.5px] text-ink-inv/65">
              Sign in as any of the six logins and switch between them from the sidebar.
            </p>
          </div>
          <LinkButton href="/login" size="lg">
            Choose a login <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      </section>

      <footer className="bg-surface-2">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-center gap-x-8 gap-y-4 px-4 py-9 sm:px-8">
          <Wordmark href="/" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-3">
            {[
              ["Sign in", "/login"],
              ["Student sign-up", "/signup"],
              ["Student dashboard", "/dashboard"],
              ["Programme Admin", "/programme"],
            ].map(([l, h]) => (
              <Link key={l} href={h} className="hover:text-ink">
                {l}
              </Link>
            ))}
          </nav>
          <p className="ml-auto text-[12.5px] text-ink-3">© 2026 ZSkillup · Sample data for demonstration</p>
        </div>
      </footer>
    </div>
  );
}
