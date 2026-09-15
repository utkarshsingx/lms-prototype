"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Briefcase,
  ClipboardCheck,
  FileText,
  Mic,
  Pencil,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  ACCA_TODAY,
  EXAMS_TO_QUALIFY,
  careerProfiles,
  companyReadinessFor,
  daysBetween,
  formatAccaDate,
  interviewsForStudent,
  isEligibleFor,
  opportunities,
  paperName,
  papersCleared,
  perObjectiveById,
  perObjectives,
  resumeForStudent,
  transitionRoadmapFor,
  type PaperCode,
  type Student,
  type TransitionRoadmap,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Stepper } from "@/components/ui/stepper";
import { ScoreBar } from "@/components/ui/score";
import { Progress } from "@/components/ui/progress";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, useStudentRecord } from "./shared";
import { StudentTypeGate } from "./type-gate";

type Action = { id: string; label: string; href?: string; hrefLabel?: string };
type Stage = {
  id: string;
  title: string;
  icon: React.ReactNode;
  base: number;
  summary: string;
  body: React.ReactNode;
  actions: Action[];
};

/** Sample salary bands by target role (Indian market, entry level). */
const SALARY_BANDS: Record<string, string> = {
  "Audit associate": "₹5.5 to 6.5 LPA",
  "Financial reporting analyst": "₹6 to 7.5 LPA",
  "Internal audit analyst": "₹6 to 7 LPA",
};

const ROLE_PAPERS: { code: PaperCode; unlocks: string }[] = [
  { code: "FA", unlocks: "Required by audit and finance operations internships" },
  { code: "TX", unlocks: "Tax associate (UK tax) roles" },
  { code: "PM", unlocks: "Management accountant and FP&A roles" },
  { code: "FR", unlocks: "Financial reporting analyst roles need six papers cleared" },
  { code: "AA", unlocks: "Audit associate: AA preferred; audit semi-senior needs AA passed" },
];

function paperState(s: Student, code: PaperCode) {
  const p = s.papers[code];
  const pass = p.attempts.find((a) => a.result === "passed");
  if (p.status === "exempt") return { label: "Exempt", status: "exempt", done: true };
  if (p.status === "passed") return { label: `Passed ${pass?.label ?? ""} · ${pass?.score ?? ""}%`, status: "passed", done: true };
  if (p.status === "failed") return { label: `Reattempt ${p.plannedLabel ?? ""}`.trim(), status: "reattempt", done: false };
  if (p.status === "current") return { label: `Sitting ${p.plannedLabel ?? "next session"}`, status: "booked", done: false };
  return { label: p.plannedLabel ? `Planned ${p.plannedLabel}` : "Not started", status: "planned", done: false };
}

export function CareerTransitionPage() {
  const student = useStudentRecord();
  const roadmap = transitionRoadmapFor(student.id);
  return (
    <StudentTypeGate type="graduate" eyebrow="Your plan" title="Career transition">
      {roadmap ? <CareerTransitionView key={student.id} student={student} roadmap={roadmap} /> : null}
    </StudentTypeGate>
  );
}

export function CareerTransitionView({ student, roadmap }: { student: Student; roadmap: TransitionRoadmap }) {
  const [goal, setGoal] = useState({ to: roadmap.to, targetDate: roadmap.targetDate });
  const [done, setDone] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  const resume = resumeForStudent(student.id);
  const profile = careerProfiles.find((p) => p.studentId === student.id);
  const readiness = companyReadinessFor(student.id);
  const interviews = interviewsForStudent(student.id).filter((i) => i.status === "completed");
  const mentorInterviews = interviews.filter((i) => i.kind === "mentor").length;
  const achieved = student.per.objectives.map((id) => perObjectiveById(id)).filter(Boolean);
  const nextObjectives = perObjectives.filter((o) => ["po4", "po8", "po2"].includes(o.id));
  const cleared = papersCleared(student);

  const stages: Stage[] = (() => {
    const papersDone = ROLE_PAPERS.filter((r) => paperState(student, r.code).done).length;
    const skillPct = Math.round((roadmap.skillGaps.reduce((s, g) => s + Math.min(1, g.current / g.target), 0) / roadmap.skillGaps.length) * 100);
    const perPct = Math.round(((student.per.months / 36) * 100 + (student.per.objectives.length / 9) * 100) / 2);
    return [
      {
        id: "papers",
        title: "ACCA papers that unlock roles",
        icon: <BookOpenCheck />,
        base: Math.round((papersDone / ROLE_PAPERS.length) * 100),
        summary: `${papersDone} of ${ROLE_PAPERS.length} papers that matter for ${goal.to.toLowerCase()} roles are cleared.`,
        body: (
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {ROLE_PAPERS.map((r) => {
              const st = paperState(student, r.code);
              return (
                <li key={r.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <span className="w-9 font-mono text-[13px] font-bold text-ink">{r.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{paperName(r.code)}</span>
                    <span className="block text-[12px] text-ink-3">{r.unlocks}</span>
                  </span>
                  <StatusPill status={st.status} size="sm">
                    {st.label}
                  </StatusPill>
                </li>
              );
            })}
          </ul>
        ),
        actions: [
          { id: "p1", label: "Sit the FR mock exam on 24 Oct and score 55% or more", href: "/mocks", hrefLabel: "Mock exams" },
          { id: "p2", label: "Book the PM reattempt before early entry closes on 5 Oct", href: "/exams", hrefLabel: "Exam bookings" },
          { id: "p3", label: "Start AA pre-reading in November, ahead of the Mar 2027 cohort", href: "/plan", hrefLabel: "Completion plan" },
        ],
      },
      {
        id: "skills",
        title: "Skills",
        icon: <Sparkles />,
        base: skillPct,
        summary: `Biggest gaps: ${[...roadmap.skillGaps].sort((a, b) => a.current / a.target - b.current / b.target).slice(0, 2).map((g) => g.skill).join(" and ")}.`,
        body: (
          <div className="space-y-3">
            {roadmap.skillGaps.map((g) => (
              <div key={g.skill} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="truncate text-ink-2">{g.skill}</span>
                  <span className="font-mono text-ink-3 tnum">
                    {g.current} <span className="text-ink-3">/ {g.target}</span>
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full", g.current >= g.target ? "bg-jade" : g.current / g.target >= 0.75 ? "bg-amber" : "bg-rose")} style={{ width: `${g.current}%` }} />
                  <span aria-hidden className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink" style={{ left: `${g.target}%` }} title={`Target ${g.target}`} />
                </div>
              </div>
            ))}
            <p className="text-[12px] text-ink-3">The black tick is the level employers expect for the role.</p>
          </div>
        ),
        actions: [
          { id: "s1", label: "Complete the ISA fundamentals practice set in AA study material", href: "/practice", hrefLabel: "Practice" },
          { id: "s2", label: "Ask to shadow a vendor audit file review at work this month" },
          { id: "s3", label: "Finish the Excel data analysis workshop recording", href: "/classes", hrefLabel: "Recordings" },
        ],
      },
      {
        id: "experience",
        title: "Experience and PER objectives",
        icon: <ClipboardCheck />,
        base: perPct,
        summary: `${student.per.months} of 36 months logged and ${student.per.objectives.length} of 9 performance objectives achieved at ${student.per.employer ?? "your employer"}.`,
        body: (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-[12.5px]">
                <span className="text-ink-2">Relevant experience</span>
                <span className="font-mono text-ink tnum">{student.per.months} / 36 months</span>
              </div>
              <Progress value={(student.per.months / 36) * 100} tone="brand" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {achieved.map((o) => (
                <StatusPill key={o!.id} status="achieved" tone="jade" size="sm">
                  {o!.code} {o!.name}
                </StatusPill>
              ))}
            </div>
            <div>
              <MicroLabel>Next objectives that suit audit work</MicroLabel>
              <ul className="mt-1.5 space-y-1 text-[12.5px] text-ink-2">
                {nextObjectives.map((o) => (
                  <li key={o.id}>
                    <span className="font-mono font-semibold text-ink">{o.code}</span> {o.name} · {o.kind}
                  </li>
                ))}
              </ul>
            </div>
            {student.per.supervisor ? <p className="text-[12px] text-ink-3">Supervisor: {student.per.supervisor}</p> : null}
          </div>
        ),
        actions: [
          { id: "e1", label: "Draft a PO4 governance, risk and control statement from the vendor audit" },
          { id: "e2", label: `Log September experience with ${student.per.supervisor?.split(",")[0] ?? "your supervisor"}` },
        ],
      },
      {
        id: "portfolio",
        title: "Portfolio",
        icon: <FileText />,
        base: Math.round(((resume?.atsScore ?? 0) + (profile?.completeness ?? 0)) / 2),
        summary: `Resume ${resume?.status === "in-review" ? "in review with the placement team" : resume?.status ?? "not started"}, ATS score ${resume?.atsScore ?? "not scored"}, profile ${Math.round(profile?.completeness ?? 0)}% complete.`,
        body: (
          <div className="space-y-3">
            <ScoreBar label="ATS score" value={resume?.atsScore ?? 0} />
            <ScoreBar label="Career profile completeness" value={Math.round(profile?.completeness ?? 0)} />
            {resume?.missingKeywords.length ? (
              <div>
                <MicroLabel>Missing keywords</MicroLabel>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {resume.missingKeywords.map((k) => (
                    <StatusPill key={k} status="missing" tone="amber" size="sm" dot={false}>
                      {k}
                    </StatusPill>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ),
        actions: [
          ...(resume?.feedback ?? []).slice(0, 2).map((f, i) => ({ id: `r${i}`, label: f, href: "/careers/resume", hrefLabel: "Resume builder" })),
          ...(resume?.missingKeywords.length ? [{ id: "r9", label: `Work the missing keywords into your experience: ${resume.missingKeywords.join(", ")}`, href: "/careers/resume", hrefLabel: "Resume builder" }] : []),
        ],
      },
      {
        id: "interview",
        title: "Interview preparation",
        icon: <Mic />,
        base: Math.round(((readiness?.score ?? 0) / 70) * 60 + (mentorInterviews / 2) * 40),
        summary: `Company Readiness Score ${readiness?.score ?? "not scored"} against a target of 70. ${mentorInterviews} of 2 mentor mock interviews done.`,
        body: (
          <div className="space-y-3">
            <ScoreBar label="Company Readiness Score" value={readiness?.score ?? 0} marker={70} />
            <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
              {interviews.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[12.5px]">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">
                      {i.kind === "ai" ? "AI mock interview" : "Mentor mock interview"} · {i.role}
                    </span>
                    <span className="block text-ink-3">
                      {formatAccaDate(i.date)} · {i.improvements[0]}
                    </span>
                  </span>
                  <StatusPill status="score" tone={(i.score ?? 0) >= 70 ? "jade" : (i.score ?? 0) >= 50 ? "amber" : "rose"} size="sm" dot={false}>
                    {i.score}
                  </StatusPill>
                </li>
              ))}
            </ul>
          </div>
        ),
        actions: [
          { id: "i1", label: "Book the second mentor mock interview for audit roles before 15 Nov", href: "/my-mentor", hrefLabel: "My mentor" },
          { id: "i2", label: "Practise two STAR answers in an AI mock interview", href: "/careers/interviews", hrefLabel: "AI mock interviews" },
          { id: "i3", label: "Prepare a two-minute summary of your ACCA journey and current role" },
        ],
      },
    ];
  })();

  const allActions = stages.flatMap((s) => s.actions);
  const stageProgress = (s: Stage) => {
    const n = s.actions.filter((a) => done.includes(a.id)).length;
    return Math.min(100, Math.round(s.base + (n / s.actions.length) * (100 - s.base) * 0.5));
  };
  const overall = Math.min(100, roadmap.progressPct + done.length * 2);
  const daysLeft = daysBetween(ACCA_TODAY, goal.targetDate);
  const milestones = [...roadmap.milestones].sort((a, b) => a.due.localeCompare(b.due));

  const toggle = (a: Action, on: boolean) => {
    setDone((d) => (on ? [...d, a.id] : d.filter((x) => x !== a.id)));
    if (on) toast({ title: "Action marked done", body: `${a.label}. Roadmap progress ${Math.min(100, overall + 2)}%.` });
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Your plan"
        title="Career transition"
        sub={`Your career-transition roadmap from ${roadmap.from.toLowerCase()} to ${goal.to.toLowerCase()}: the papers, skills, experience, portfolio and interview preparation that get you there.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil aria-hidden className="size-4" />
              Update goal
            </Button>
            <LinkButton href="/careers/jobs">
              <Briefcase aria-hidden className="size-4" />
              See matching jobs
            </LinkButton>
          </>
        }
      />

      <section className="relative isolate overflow-hidden rounded-[var(--radius-lg)] bg-surface-inv px-5 py-6 text-ink-inv sm:px-7">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-cta" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.12em] text-cta uppercase">Career-transition roadmap</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 rounded-[var(--radius-md)] border border-ink-inv/20 px-3.5 py-2.5">
                <p className="text-[11.5px] text-ink-inv/60">From</p>
                <p className="font-display text-[clamp(1.1rem,0.95rem+0.7vw,1.5rem)] leading-tight font-bold text-ink-inv">{roadmap.from}</p>
                <p className="text-[12px] text-ink-inv/60">{student.per.employer}</p>
              </div>
              <ArrowRight aria-hidden className="size-6 shrink-0 text-cta" />
              <div className="min-w-0 rounded-[var(--radius-md)] border border-cta bg-cta px-3.5 py-2.5 text-cta-ink">
                <p className="text-[11.5px] font-semibold">To</p>
                <p className="font-display text-[clamp(1.1rem,0.95rem+0.7vw,1.5rem)] leading-tight font-bold">{goal.to}</p>
                <p className="text-[12px] font-medium">Target {formatAccaDate(goal.targetDate)}</p>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] text-ink-inv/70">Roadmap progress</span>
              <span className="font-display text-[34px] leading-none font-bold text-cta tnum">{overall}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-inv/15" role="progressbar" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100} aria-label="Roadmap progress">
              <div className="h-full rounded-full bg-cta transition-[width] duration-500" style={{ width: `${overall}%` }} />
            </div>
            <p className="mt-2 text-[12.5px] text-ink-inv/65">
              {daysLeft} days to target · {done.length} of {allActions.length} recommended actions done
            </p>
          </div>
        </div>
      </section>

      <KpiRow cols={4}>
        <KpiTile label="ATS score" value={resume?.atsScore ?? "Not scored"} tone="amber" icon={<FileText />} sub="Resume in review" href="/careers/resume" />
        <KpiTile label="Company Readiness Score" value={readiness?.score ?? "Not scored"} tone="amber" icon={<Target />} sub={`${readiness?.band ?? ""} · target 70`} />
        <KpiTile label="PER experience" value={`${student.per.months} of 36`} tone="info" icon={<ClipboardCheck />} sub={`${student.per.objectives.length} of 9 objectives`} />
        <KpiTile label="Exams cleared" value={`${cleared} of ${EXAMS_TO_QUALIFY}`} tone="jade" icon={<TrendingUp />} sub="Passed or exempt" />
      </KpiRow>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="stages-title" className="min-w-0 space-y-4">
          <h2 id="stages-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
            Stages
          </h2>
          {stages.map((s, idx) => {
            const pct = stageProgress(s);
            return (
              <Card key={s.id} className="min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-inv text-cta [&>svg]:size-5">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Stage {idx + 1}</p>
                    <h3 className="text-[15.5px] leading-tight font-bold text-ink">{s.title}</h3>
                  </div>
                  <div className="w-full sm:w-44">
                    <div className="mb-1 flex justify-between text-[12px]">
                      <StatusPill status={pct >= 70 ? "on track" : pct >= 40 ? "in progress" : "needs attention"} size="sm">
                        {pct >= 70 ? "On track" : pct >= 40 ? "In progress" : "Needs attention"}
                      </StatusPill>
                      <span className="font-mono font-semibold text-ink tnum">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                </div>
                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
                  <div className="min-w-0">
                    <p className="mb-3 text-[13px] text-ink-2">{s.summary}</p>
                    {s.body}
                  </div>
                  <div className="min-w-0 rounded-[var(--radius-md)] bg-surface-2 p-4">
                    <MicroLabel>Recommended actions</MicroLabel>
                    <ul className="mt-2.5 space-y-2.5">
                      {s.actions.map((a) => (
                        <li key={a.id} className="min-w-0">
                          <Checkbox checked={done.includes(a.id)} onChange={(e) => toggle(a, e.target.checked)} label={<span className={cn(done.includes(a.id) && "text-ink-3 line-through")}>{a.label}</span>} />
                          {a.href ? (
                            <LinkButton href={a.href} size="xs" variant="ghost" className="mt-0.5 ml-6">
                              {a.hrefLabel} <ArrowRight aria-hidden className="size-3" />
                            </LinkButton>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <MicroLabel className="mb-4">Milestones</MicroLabel>
            <Stepper
              orientation="vertical"
              aria-label="Career-transition milestones"
              steps={milestones.map((m) => ({
                id: m.id,
                label: m.label,
                sub: `${formatAccaDate(m.due)} · ${m.detail}`,
                state: m.status === "done" ? "done" : m.status === "current" ? "current" : "upcoming",
              }))}
            />
          </Card>

          <Card>
            <CardHeader title="Target roles" sub="Fit, sample salary bands and whether you can apply today" />
            <ul className="divide-y divide-line border-t border-line">
              {roadmap.targetRoles.map((r) => {
                const opp = opportunities.find((o) => o.title === r.title && o.status === "open");
                const elig = opp ? isEligibleFor(student, opp) : null;
                return (
                  <li key={r.title} className={cn("space-y-2 px-5 py-4", r.title === goal.to && "bg-cta-soft")}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[14px] font-semibold text-ink">{r.title}</p>
                      <p className="font-mono text-[12.5px] text-ink-2">{SALARY_BANDS[r.title] ?? "Band not set"}</p>
                    </div>
                    <ScoreBar label="Fit" value={r.fit} height={6} />
                    <div className="flex flex-wrap items-center gap-2">
                      {elig ? (
                        <StatusPill status={elig.eligible ? "eligible" : "not eligible"} tone={elig.eligible ? "jade" : "amber"}>
                          {elig.eligible ? `Eligible now · ${opp!.company}` : elig.reasons[0]}
                        </StatusPill>
                      ) : (
                        <StatusPill status="planned" tone="neutral">
                          No opening posted yet
                        </StatusPill>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-3">{r.note}</p>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line px-5 py-3 text-[12px] text-ink-3">Salary bands are sample ranges for entry-level roles in Bengaluru, Hyderabad and Pune.</p>
          </Card>
        </div>
      </div>

      <FormDrawer
        open={editing}
        onClose={() => setEditing(false)}
        title="Update career goal"
        sub={`Currently: ${roadmap.from} to ${goal.to}`}
        submitLabel="Save goal"
        onSubmit={(data) => {
          const to = String(data.get("to"));
          const targetDate = String(data.get("date"));
          setGoal({ to, targetDate });
          toast({ title: "Career goal updated", body: `${roadmap.from} to ${to} by ${formatAccaDate(targetDate)}. Your mentor and the placement team can see it.` });
          setEditing(false);
        }}
      >
        <Field label="Target role">
          <Select name="to" defaultValue={goal.to}>
            {roadmap.targetRoles.map((r) => (
              <option key={r.title}>{r.title}</option>
            ))}
          </Select>
        </Field>
        <Field label="Target date">
          <Select name="date" defaultValue={goal.targetDate}>
            <option value="2027-06-30">30 Jun 2027</option>
            <option value="2027-12-31">31 Dec 2027</option>
            <option value="2028-06-30">30 Jun 2028</option>
          </Select>
        </Field>
        <p className="text-[12.5px] leading-relaxed text-ink-3">
          The papers and recommended actions stay the same; the placement team uses your target role to match openings.
        </p>
      </FormDrawer>
    </div>
  );
}
