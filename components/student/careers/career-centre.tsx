"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileText,
  GraduationCap,
  MapPin,
  Mic,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import {
  applicationsForStudent,
  careerProfiles,
  companyReadinessFor,
  formatAccaDate,
  internshipRecords,
  interviewsForStudent,
  opportunityById,
  resumeForStudent,
  staffById,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { HeroBand } from "@/components/ui/hero-band";
import { LineChart } from "@/components/ui/charts";
import { Checkbox } from "@/components/ui/field";
import { ScoreBar, ScoreRing, scoreBand } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { useStudentRecord } from "@/components/student/help/shared";
import { rankedFor, stageLabel } from "./career-data";

type Step = { id: string; label: string; detail: string; href?: string; cta: string };

export function CareerCentre() {
  const s = useStudentRecord();
  return <CareerCentreView key={s.id} s={s} />;
}

function CareerCentreView({ s }: { s: Student }) {
  const undergrad = s.type === "undergraduate";
  const cr = companyReadinessFor(s.id);
  const resume = resumeForStudent(s.id);
  const profile = careerProfiles.find((p) => p.studentId === s.id);
  const apps = applicationsForStudent(s.id);
  const interviews = interviewsForStudent(s.id).filter((m) => m.status === "completed").sort((a, b) => b.date.localeCompare(a.date));
  const internship = internshipRecords.find((r) => r.studentId === s.id);
  const ranked = rankedFor(s, undergrad ? "internship" : "job");
  const eligibleCount = ranked.filter((r) => r.elig.eligible).length;
  const careerLead = staffById(undergrad ? "st-meera" : "st-rahul");
  const crScore = cr?.score ?? s.career.companyReadiness ?? 0;
  const ats = resume?.atsScore ?? s.career.atsScore ?? 0;
  const completeness = Math.round(profile?.completeness ?? 0);
  const interviewComponent = cr?.components.find((c) => c.label === "Mock interviews");

  const notApplied = ranked.find((r) => r.elig.eligible && !apps.some((a) => a.opportunityId === r.opp.id));
  const steps: Step[] = [
    {
      id: "resume",
      label: resume?.feedback[0] ?? "Tailor your resume to your target role",
      detail: `Resume suggestions can lift your ATS score from ${ats}.`,
      href: "/careers/resume",
      cta: "Open resume builder",
    },
    {
      id: "interview",
      label: `Take an AI mock interview for ${s.career.targetRole.toLowerCase()} roles`,
      detail: interviewComponent
        ? `Mock interviews are ${interviewComponent.weight}% of your Company Readiness Score and yours sits at ${interviewComponent.score}.`
        : "Mock interviews count towards your Company Readiness Score.",
      href: "/careers/interviews",
      cta: "Start interview",
    },
    notApplied
      ? {
          id: "apply",
          label: `Apply to ${notApplied.opp.title} at ${notApplied.opp.company}`,
          detail: `You meet every rule. Applications close ${formatAccaDate(notApplied.opp.closesOn)}.`,
          href: "/careers/jobs",
          cta: "View role",
        }
      : {
          id: "apply",
          label: "Check which roles you are eligible for",
          detail: "Eligibility updates as you pass papers and raise your scores.",
          href: "/careers/jobs",
          cta: "Browse roles",
        },
    {
      id: "mentor",
      label: `Book a mentor mock interview with ${careerLead?.name}`,
      detail: `${careerLead?.title}. A 45 minute panel-style interview with written feedback.`,
      cta: "Request",
    },
  ];

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [requested, setRequested] = useState(false);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <HeroBand
        eyebrow={undergrad ? "Career · Internship focus" : "Career"}
        title="Career centre"
        sub={
          undergrad
            ? `Build towards a ${s.career.internship.period?.toLowerCase() ?? "summer 2027"} internship: a resume that parses, interview practice and the internships open to Semester 3 learners.`
            : `${s.career.transitionGoal ?? s.career.targetRole}. Your scores, your next steps and the roles you can apply for today.`
        }
        stats={[
          { label: "Company Readiness Score", value: crScore, hint: cr?.band ?? scoreBand(crScore).label },
          { label: "ATS score", value: ats, hint: resume ? `Resume ${resume.version} · ${resume.status.replace(/-/g, " ")}` : undefined },
          { label: "Profile completeness", value: `${completeness}%`, hint: `${profile?.skills.length ?? 0} skills listed` },
          undergrad
            ? { label: "Internship", value: s.career.internship.period ?? "Planned", hint: `${eligibleCount} open to you now` }
            : { label: "Applications", value: apps.length, hint: s.career.placementEligible ? "Placement-eligible" : "Not yet placement-eligible" },
        ]}
        actions={
          <>
            <LinkButton href="/careers/jobs">
              <Briefcase className="size-4" /> {undergrad ? "Browse internships" : "Browse jobs"}
            </LinkButton>
            <LinkButton href="/careers/resume" variant="inverse">
              <FileText className="size-4" /> Improve my resume
            </LinkButton>
          </>
        }
        aside={
          <div className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-surface p-4 lg:w-64">
            <ScoreRing value={crScore} size={80} stroke={7} label="Company Readiness Score" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Company Readiness</p>
              <p className="mt-1 text-[13px] leading-snug text-ink-2">
                {crScore >= 70 ? "Ready for most roles you target." : `Target 70 for ${undergrad ? "internship shortlists" : "audit shortlists"}.`}
              </p>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/careers/resume",
            icon: FileText,
            title: "Resume builder",
            figure: `ATS ${ats}`,
            line: resume ? `${resume.version} · updated ${formatAccaDate(resume.updated)}` : "Start your first version",
          },
          {
            href: "/careers/interviews",
            icon: Mic,
            title: "AI mock interviews",
            figure: interviews[0]?.score != null ? `Last ${interviews[0].score}` : "Not started",
            line: `${interviews.length} completed · ${s.career.targetRole} track`,
          },
          {
            href: "/careers/jobs",
            icon: Briefcase,
            title: "Jobs and internships",
            figure: `${eligibleCount} eligible`,
            line: apps.length ? `${apps.length} application${apps.length > 1 ? "s" : ""} in progress` : "No applications yet",
          },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex min-w-0 items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4 transition-colors hover:border-ink hover:bg-cta-soft"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-inv text-cta">
              <t.icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-ink">{t.title}</span>
              <span className="block truncate text-[12.5px] text-ink-3">{t.line}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-[18px] font-bold tracking-[-0.02em] text-ink tnum">{t.figure}</span>
              <ArrowRight className="ml-auto size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Company Readiness Score"
            sub="What employers see when the placement team shortlists you"
            action={<StatusPill status={cr?.band ?? "Developing"} tone={scoreBand(crScore).tone} />}
          />
          <div className="grid gap-5 border-t border-line px-5 py-5 md:grid-cols-2">
            <div className="min-w-0 space-y-3.5">
              {(cr?.components ?? []).map((c) => (
                <ScoreBar key={c.label} value={c.score} label={`${c.label} · ${c.weight}%`} height={6} />
              ))}
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Last six months</p>
              <LineChart
                height={150}
                min={0}
                max={100}
                labels={["Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
                series={[{ label: "Company Readiness Score", values: cr?.trend ?? [crScore], tone: "cta-strong" }]}
              />
            </div>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Next steps"
            sub={`${Object.values(done).filter(Boolean).length} of ${steps.length} done this week`}
          />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {steps.map((st) => (
              <li key={st.id} className={cn("px-5 py-3.5", done[st.id] && "bg-surface-2/60")}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Checkbox
                      checked={Boolean(done[st.id])}
                      onChange={(e) => {
                        setDone((d) => ({ ...d, [st.id]: e.target.checked }));
                        if (e.target.checked) toast({ title: "Step done", body: st.label });
                      }}
                      label={<span className={cn("font-semibold text-ink", done[st.id] && "text-ink-3 line-through")}>{st.label}</span>}
                    />
                    <p className="mt-0.5 pl-7 text-[12px] leading-snug text-ink-3">{st.detail}</p>
                  </div>
                  {st.href ? (
                    <LinkButton href={st.href} size="xs" variant="outline" className="shrink-0">
                      {st.cta}
                    </LinkButton>
                  ) : (
                    <Button
                      size="xs"
                      variant={requested ? "ghost" : "secondary"}
                      className="shrink-0"
                      disabled={requested}
                      onClick={() => {
                        setRequested(true);
                        toast({ title: `Mock interview requested with ${careerLead?.name}`, body: "You will get a slot within two working days." });
                      }}
                    >
                      {requested ? "Requested" : st.cta}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title={undergrad ? "Recommended internships" : "Recommended jobs"}
            sub={undergrad ? "Internships open to Semester 3 learners" : "Matched to your papers, scores and target role"}
            action={
              <Link href="/careers/jobs" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
                All roles <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {ranked.slice(0, 3).map(({ opp, elig }) => {
              const applied = apps.find((a) => a.opportunityId === opp.id);
              return (
                <li key={opp.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-2 font-display text-[13px] font-bold text-ink">
                    {opp.company.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink">{opp.title}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
                      <span className="truncate">{opp.company}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {opp.location}
                      </span>
                      <span>{opp.compensation}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {applied ? (
                      <StatusPill status={applied.stage}>{stageLabel(applied)}</StatusPill>
                    ) : (
                      <StatusPill status={elig.eligible ? "eligible" : "pending"} tone={elig.eligible ? "jade" : "amber"}>
                        {elig.label}
                      </StatusPill>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Upcoming mock interview" sub={`${s.career.targetRole} track`} action={<Mic className="size-4 text-ink-3" />} />
            <div className="border-t border-line px-5 py-4">
              {requested ? (
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 size-5 shrink-0 text-ink" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink">Mentor mock interview requested</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      With {careerLead?.name}. The slot is confirmed within two working days.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 size-5 shrink-0 text-violet" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink">AI mock interview ready now</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      Six questions, 20 minutes, scored on four competencies.
                      {interviews[0] ? ` Your last one scored ${interviews[0].score} on ${formatAccaDate(interviews[0].date)}.` : ""}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <LinkButton href="/careers/interviews" size="sm">
                  <Mic className="size-4" /> Start AI interview
                </LinkButton>
                {!requested ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRequested(true);
                      toast({ title: `Mock interview requested with ${careerLead?.name}`, body: "You will get a slot within two working days." });
                    }}
                  >
                    <UserRoundCheck className="size-4" /> Request mentor interview
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          {undergrad && internship ? (
            <Card>
              <CardHeader title="Internship plan" sub="Tracked by the internship coordinator" action={<StatusPill status={internship.status} />} />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-5 py-4 text-[12.5px]">
                <div className="min-w-0">
                  <dt className="text-ink-3">Window</dt>
                  <dd className="font-semibold text-ink">
                    {formatAccaDate(internship.start)} to {formatAccaDate(internship.end)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Hours required</dt>
                  <dd className="font-semibold text-ink tnum">{internship.hoursRequired}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Company</dt>
                  <dd className="font-semibold text-ink">{internship.company}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Coordinator</dt>
                  <dd className="font-semibold text-ink">{careerLead?.name}</dd>
                </div>
              </dl>
              <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-[12px] leading-relaxed text-ink-3">
                <GraduationCap className="mt-0.5 size-3.5 shrink-0" />
                Internship hours can count towards the PER if a qualified supervisor signs them off.
              </p>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Placement status" sub={`Managed by ${careerLead?.name}`} action={<StatusPill status={s.career.placementEligible ? "eligible" : "not eligible"}>{s.career.placementEligible ? "Placement-eligible" : "Not yet eligible"}</StatusPill>} />
              <ul className="space-y-2.5 border-t border-line px-5 py-4">
                {apps.length ? (
                  apps.map((a) => {
                    const o = opportunityById(a.opportunityId);
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink">{o?.title}</span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {o?.company} · applied {formatAccaDate(a.appliedOn)}
                          </span>
                        </span>
                        <StatusPill status={a.stage} size="sm">
                          {stageLabel(a)}
                        </StatusPill>
                      </li>
                    );
                  })
                ) : (
                  <li className="text-[13px] text-ink-3">No applications yet.</li>
                )}
                <li className="flex items-center gap-2 pt-1 text-[12px] text-ink-3">
                  <CheckCircle2 className="size-3.5 text-jade" /> Profile owner: {staffById(profile?.ownerId)?.name ?? careerLead?.name}
                </li>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
