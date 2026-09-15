"use client";

import { useState } from "react";
import { BadgeCheck, CalendarCheck, Download, IdCard, Plus, ShieldCheck } from "lucide-react";
import {
  ACCA_TODAY,
  APPLIED_KNOWLEDGE,
  APPLIED_SKILLS,
  EXAMS_TO_QUALIFY,
  STRATEGIC_ESSENTIALS,
  STRATEGIC_OPTIONS,
  epsm,
  examSessionById,
  formatAccaDate,
  formatGBP,
  papersCleared,
  paperName,
  per,
  perObjectives,
  type PaperCode,
  type PaperStatus,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Stepper, type StepState } from "@/components/ui/stepper";
import { Segmented } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Select, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { Fact, PaperCodeChip, SectionLabel, TextLink, useStudentRecord } from "./bits";
import { courseForCode, relativeDays, semesterFor } from "./derive";

const STEP_STATE: Record<PaperStatus, StepState> = {
  exempt: "exempt",
  passed: "done",
  current: "current",
  "in-progress": "current",
  "results-pending": "current",
  failed: "failed",
  upcoming: "upcoming",
  "not-started": "locked",
};

export function JourneyPage() {
  const s = useStudentRecord();
  return <Journey key={s.id} s={s} />;
}

function Journey({ s }: { s: Student }) {
  const [view, setView] = useState("all");
  const [perMonths, setPerMonths] = useState(s.per.months);
  const [perDone, setPerDone] = useState<string[]>(s.per.objectives);
  const [recording, setRecording] = useState(false);

  const undergrad = s.type === "undergraduate";
  const cleared = papersCleared(s);
  const code = s.currentPaper;
  const current = code ? s.papers[code] : undefined;
  const booking = code ? s.examBookings.find((b) => b.paper === code && (b.status === "booked" || b.status === "planned")) : undefined;
  const session = booking?.sessionId ? examSessionById(booking.sessionId) : undefined;
  const readiness = code ? (s.readiness.byPaper[code] ?? s.readiness.overall) : s.readiness.overall;
  const course = code ? courseForCode(code) : undefined;

  const essentialDone = perDone.filter((id) => perObjectives.find((o) => o.id === id)?.kind === "essential").length;
  const technicalDone = perDone.length - essentialDone;
  const counted = Math.min(essentialDone, per.essentialRequired) + Math.min(technicalDone, per.technicalRequired);

  const levelSteps = (codes: PaperCode[]) =>
    codes
      .filter((c) => view === "all" || !["passed", "exempt"].includes(s.papers[c].status))
      .map((c) => {
        const p = s.papers[c];
        const last = p.attempts[p.attempts.length - 1];
        const sem = semesterFor(s, c);
        const bk = s.examBookings.find((b) => b.paper === c && (b.status === "booked" || b.status === "planned"));
        let sub: string;
        switch (p.status) {
          case "exempt": {
            const ex = s.exemptions.find((e) => e.paper === c);
            sub = ex?.decidedOn ? `Exempt · ACCA-approved ${formatAccaDate(ex.decidedOn)}` : "Exempt";
            break;
          }
          case "passed":
            sub = last ? `Passed ${last.label} · ${last.score}%` : "Passed";
            break;
          case "failed":
            sub = `Failed ${last?.label} · ${last?.score}% · reattempt ${p.plannedLabel ?? "to plan"}${bk?.status === "planned" ? ", booking planned" : ""}`;
            break;
          case "current":
          case "in-progress":
            sub = `${p.status === "current" ? "Current paper" : "In progress"} · ${p.progress}% studied${
              bk ? ` · exam ${bk.status} ${bk.entryWindow === "on-demand" ? formatAccaDate(bk.date) : bk.label}` : p.plannedLabel ? ` · exam ${p.plannedLabel}` : ""
            }${s.readiness.byPaper[c] != null ? ` · readiness ${s.readiness.byPaper[c]}` : ""}`;
            break;
          case "upcoming":
            sub = `Planned ${p.plannedLabel ?? ""}`.trim();
            break;
          default:
            sub = STRATEGIC_OPTIONS.includes(c) ? "Option paper · choose two of four" : "Unlocks after Applied Skills";
        }
        return {
          id: c,
          state: STEP_STATE[p.status],
          label: (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {c} · {paperName(c)}
              </span>
              {sem ? (
                <StatusPill status="Semester" tone="info" dot={false} size="sm">
                  {sem}
                </StatusPill>
              ) : null}
            </span>
          ),
          sub,
        };
      });

  const dated: (TimelineItem & { date: string })[] = [];
  if (s.registration.date) {
    dated.push({ id: "reg", date: s.registration.date, title: "Registered with ACCA", meta: `${formatAccaDate(s.registration.date)} · ACCA ID ${s.accaId}`, tone: "neutral", icon: <IdCard /> });
  }
  const decided = s.exemptions.find((e) => e.decidedOn);
  if (decided?.decidedOn) {
    dated.push({
      id: "ex",
      date: decided.decidedOn,
      title: `Exemptions approved by ACCA · ${s.exemptions.filter((e) => e.state === "approved").map((e) => e.paper).join(", ")}`,
      meta: formatAccaDate(decided.decidedOn),
      body: `Estimated ${formatAccaDate(decided.estimatedOn)} by ZSkillup. Exemption fees paid to ACCA.`,
      tone: "jade",
      icon: <ShieldCheck />,
    });
  }
  if (s.epsm.completedOn) {
    dated.push({ id: "epsm", date: s.epsm.completedOn, title: "EPSM completed", meta: formatAccaDate(s.epsm.completedOn), tone: "jade", icon: <BadgeCheck /> });
  }
  for (const p of Object.values(s.papers) as Student["papers"][PaperCode][]) {
    for (const a of p.attempts) {
      dated.push({
        id: `${p.code}-${a.date}`,
        date: a.date,
        title: `${p.code} ${a.result === "passed" ? "passed" : a.result === "failed" ? "failed" : "sat"}${a.score != null ? ` · ${a.score}%` : ""}`,
        meta: a.label,
        tone: a.result === "passed" ? "jade" : a.result === "failed" ? "rose" : "amber",
      });
    }
  }
  if (booking?.status === "booked" && booking.bookedOn) {
    dated.push({
      id: "bk",
      date: booking.bookedOn,
      title: `${booking.paper} exam booked`,
      meta: `${formatAccaDate(booking.bookedOn)} · ${booking.entryWindow === "on-demand" ? `on-demand CBE on ${formatAccaDate(booking.date)}` : `${booking.label} session`}`,
      tone: "info",
      icon: <CalendarCheck />,
    });
  }
  const milestones: TimelineItem[] = dated.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Learn"
        title="ACCA journey"
        sub="Your route to ACCA membership: registration, exemptions, the current paper, every exam, and the EPSM and PER requirements."
        badge={
          <StatusPill status="type" tone={undergrad ? "info" : "cta"} dot={false}>
            {undergrad ? "University-integrated undergraduate" : "Graduate ACCA learner"}
          </StatusPill>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast({ title: `Report queued: acca-journey-${s.accaId ?? s.id}.pdf`, body: "Your journey summary will be ready in your downloads shortly.", tone: "info" })}
            >
              <Download className="size-4" />
              Download summary
            </Button>
            <LinkButton href="/exams">
              <CalendarCheck className="size-4" />
              Book an exam
            </LinkButton>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Papers cleared" value={`${cleared} of ${EXAMS_TO_QUALIFY}`} sub={undergrad ? "Passed through the integrated route" : "Exempt or passed"} />
        <KpiTile label="Exams still to pass" value={EXAMS_TO_QUALIFY - cleared} tone="info" sub="Including two Strategic Professional options" />
        <KpiTile label="EPSM" value={s.epsm.status === "complete" ? "Complete" : `${s.epsm.progress}%`} tone={s.epsm.status === "complete" ? "jade" : "amber"} sub={epsm.name} />
        <KpiTile label="PER" value={`${perMonths} of ${per.monthsRequired} months`} tone={perMonths ? "amber" : "neutral"} sub={`${counted} of ${per.objectivesRequired} performance objectives`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex min-w-0 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionLabel>ACCA registration status</SectionLabel>
            <StatusPill status={s.registration.status} />
          </div>
          <p className="mt-3 font-mono text-[26px] leading-none font-bold tracking-[0.04em] text-ink">{s.accaId ?? "Not issued"}</p>
          <p className="mt-1 text-[12px] text-ink-3">ACCA student ID</p>
          <dl className="mt-3 divide-y divide-line border-t border-line">
            <Fact label="Registered">{s.registration.date ? formatAccaDate(s.registration.date) : "Pending"}</Fact>
            <Fact label="Annual subscription">
              <StatusPill status={s.subscription.status} size="sm" />
            </Fact>
            <Fact label="Next subscription due">
              {s.subscription.dueDate ? `${formatAccaDate(s.subscription.dueDate)} · ${formatGBP(s.subscription.amountGBP)}` : "Not applicable"}
            </Fact>
          </dl>
          <p className="mt-auto pt-3 text-[12px] text-ink-3">Subscription is paid to ACCA and recorded here for tracking.</p>
        </Card>

        <Card className="flex min-w-0 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionLabel>Exemption status</SectionLabel>
            <StatusPill
              status={s.exemptionClaim.status === "none" ? "None claimed" : s.exemptionClaim.status === "decided" ? "Approved" : s.exemptionClaim.status}
              tone={s.exemptionClaim.status === "none" ? "neutral" : undefined}
            >
              {s.exemptionClaim.status === "decided" ? "ACCA decision received" : undefined}
            </StatusPill>
          </div>
          {s.exemptions.length ? (
            <>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {s.exemptions.map((e) => (
                  <li key={e.paper} className="flex min-w-0 items-center gap-2 rounded-[12px] border border-line bg-surface-2 px-2.5 py-2">
                    <PaperCodeChip code={e.paper} />
                    <span className="min-w-0">
                      <StatusPill status={e.state} size="sm" />
                      <span className="mt-0.5 block truncate text-[11px] text-ink-3">Fee {e.fee.status} · {formatGBP(e.fee.amountGBP)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12.5px] text-ink-2">{s.exemptionClaim.note}</p>
              <TextLink href="/exemptions" className="mt-auto pt-3">
                Exemption evaluation
              </TextLink>
            </>
          ) : (
            <>
              <p className="mt-3 text-[14px] font-semibold text-ink">No exemptions claimed</p>
              <p className="mt-1 text-[13px] text-ink-2">{s.exemptionClaim.note}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {APPLIED_KNOWLEDGE.map((c) => (
                  <li key={c}>
                    <StatusPill status={s.papers[c].status} size="sm">
                      {c} {s.papers[c].status === "passed" ? "passed" : "to sit"}
                    </StatusPill>
                  </li>
                ))}
              </ul>
              <TextLink href="/roadmap" className="mt-auto pt-3">
                Semester roadmap
              </TextLink>
            </>
          )}
        </Card>

        <Card className="flex min-w-0 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionLabel>Current paper</SectionLabel>
            {booking ? <StatusPill status={booking.status}>{booking.status === "booked" ? "Exam booked" : "Exam planned"}</StatusPill> : null}
          </div>
          {code && current ? (
            <>
              <div className="mt-3 flex items-center gap-4">
                <ScoreRing value={readiness} size={72} label={`${code} readiness score`} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <PaperCodeChip code={code} />
                    <span className="truncate font-display text-[18px] font-bold tracking-[-0.02em] text-ink">{paperName(code)}</span>
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-3">Readiness score {readiness} · target 70</p>
                </div>
              </div>
              <dl className="mt-3 divide-y divide-line border-t border-line">
                <Fact label="Exam">
                  {booking
                    ? booking.entryWindow === "on-demand"
                      ? `On-demand CBE · ${formatAccaDate(booking.date)}`
                      : `${session?.label} session · ${formatAccaDate(session?.examStart ?? booking.date)}`
                    : current.plannedLabel ?? "Not booked"}
                </Fact>
                <Fact label="Countdown">{booking ? relativeDays(booking.date) : "Book to start the countdown"}</Fact>
                <Fact label="Studied">{current.progress}%</Fact>
              </dl>
              <Progress value={current.progress} height={5} className="mt-2" />
              {course ? (
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <LinkButton href={`/learn/${course.slug}`} size="sm">
                    Resume {code}
                  </LinkButton>
                  <LinkButton href={`/courses/${course.slug}`} size="sm" variant="outline">
                    Paper overview
                  </LinkButton>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-[13px] text-ink-2">No current paper.</p>
          )}
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader
          className="flex-wrap"
          title="Paper by paper"
          sub={
            undergrad
              ? "Every ACCA paper by level, with the university semester in which you study it."
              : "Every ACCA paper by level: exempt, passed, current, reattempts and what comes next."
          }
          action={
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              items={[
                { id: "all", label: "All papers" },
                { id: "remaining", label: "Still to pass" },
              ]}
            />
          }
        />
        <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-3">
          {[
            { id: "ak", title: "Applied Knowledge", codes: APPLIED_KNOWLEDGE, note: "On-demand CBEs · 2 hours" },
            { id: "as", title: "Applied Skills", codes: APPLIED_SKILLS, note: "LW on demand · others in session CBEs" },
            { id: "sp", title: "Strategic Professional", codes: [...STRATEGIC_ESSENTIALS, ...STRATEGIC_OPTIONS], note: "SBL and SBR, plus two options" },
          ].map((level) => {
            const steps = levelSteps(level.codes);
            return (
              <section key={level.id} className="min-w-0">
                <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-line pb-2">
                  <h3 className="font-display text-[16px] font-bold tracking-[-0.02em] text-ink">{level.title}</h3>
                  <span className="text-[11.5px] text-ink-3">{level.note}</span>
                </div>
                {steps.length ? (
                  <Stepper orientation="vertical" steps={steps} aria-label={`${level.title} papers`} />
                ) : (
                  <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-3">
                    Every {level.title} paper is cleared.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionLabel>EPSM progress</SectionLabel>
              <p className="mt-1 font-display text-[18px] font-bold tracking-[-0.02em] text-ink">{epsm.name}</p>
            </div>
            <StatusPill status={s.epsm.status} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={s.epsm.progress} tone={s.epsm.status === "complete" ? "jade" : "cta"} className="flex-1" />
            <span className="text-[12.5px] font-semibold text-ink tnum">{s.epsm.progress}%</span>
          </div>
          <ul className="mt-4 space-y-1.5">
            {epsm.units.map((u, i) => {
              const done = s.epsm.progress >= Math.round(((i + 1) / epsm.units.length) * 100);
              return (
                <li key={u.id} className="flex items-center gap-2 text-[13px]">
                  <span className={done ? "grid size-4.5 place-items-center rounded-full bg-jade text-on-accent" : "grid size-4.5 place-items-center rounded-full border border-line-strong"}>
                    {done ? <BadgeCheck className="size-3" /> : null}
                  </span>
                  <span className={done ? "text-ink" : "text-ink-3"}>{u.title}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[12px] text-ink-3">
            {s.epsm.completedOn ? `Completed ${formatAccaDate(s.epsm.completedOn)}.` : epsm.recommendation}
          </p>
          <LinkButton href="/learn/ethics-and-professional-skills" size="sm" variant="outline" className="mt-3">
            {s.epsm.status === "complete" ? "Review EPSM" : "Start EPSM"}
          </LinkButton>
        </Card>

        <Card className="min-w-0 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionLabel>PER progress</SectionLabel>
              <p className="mt-1 font-display text-[18px] font-bold tracking-[-0.02em] text-ink">{per.name}</p>
            </div>
            <StatusPill status={perMonths ? "In progress" : "Not started"} />
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-[12.5px]">
                <span className="text-ink-2">Relevant experience</span>
                <span className="font-semibold text-ink tnum">
                  {perMonths} of {per.monthsRequired} months
                </span>
              </div>
              <Progress value={(perMonths / per.monthsRequired) * 100} tone="brand" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[12.5px]">
                <span className="text-ink-2">Performance objectives</span>
                <span className="font-semibold text-ink tnum">
                  {counted} of {per.objectivesRequired}
                </span>
              </div>
              <Progress value={(counted / per.objectivesRequired) * 100} tone="brand" />
              <p className="mt-1 text-[11.5px] text-ink-3">
                Essential {essentialDone} of {per.essentialRequired} · technical {Math.min(technicalDone, per.technicalRequired)} of {per.technicalRequired}
              </p>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {perObjectives.map((o) => (
              <li key={o.id}>
                <StatusPill status={perDone.includes(o.id) ? "Achieved" : "Open"} tone={perDone.includes(o.id) ? "jade" : "neutral"} dot={false} size="sm">
                  <span title={o.name}>{o.code}</span>
                </StatusPill>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-3">
            {s.per.employer ? `${s.per.employer} · supervisor ${s.per.supervisor}` : "Relevant work experience, including internships, can count once a supervisor signs it off."}
          </p>
          <Button size="sm" className="mt-3" onClick={() => setRecording(true)}>
            <Plus className="size-4" />
            Record PER progress
          </Button>
        </Card>

        <Card className="min-w-0 p-5">
          <SectionLabel>Milestones</SectionLabel>
          <div className="mt-4">
            <Timeline dense items={milestones} empty="Milestones appear once you register with ACCA." />
          </div>
        </Card>
      </div>

      <FormDrawer
        open={recording}
        onClose={() => setRecording(false)}
        title="Record PER progress"
        sub="Log months of relevant experience and any performance objective your supervisor has signed off."
        submitLabel="Record progress"
        footerNote="Your mentor sees the update."
        onSubmit={(data) => {
          const months = Number(data.get("months") ?? 0);
          const objective = String(data.get("objective") ?? "");
          const nextMonths = Math.min(per.monthsRequired, perMonths + months);
          setPerMonths(nextMonths);
          if (objective && !perDone.includes(objective)) setPerDone((list) => [...list, objective]);
          const o = perObjectives.find((x) => x.id === objective);
          toast({
            title: "PER progress recorded",
            body: `${nextMonths} of ${per.monthsRequired} months${o ? ` · ${o.code} ${o.name}` : ""}`,
          });
          setRecording(false);
        }}
      >
        <Field label="Months of relevant experience to add">
          <Select name="months" defaultValue="1">
            {[0, 1, 2, 3, 6].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "No new months" : `${m} ${m === 1 ? "month" : "months"}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Performance objective signed off" hint="Optional">
          <Select name="objective" defaultValue="">
            <option value="">None this time</option>
            {perObjectives
              .filter((o) => !perDone.includes(o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.name} ({o.kind})
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Supervisor and evidence">
          <Textarea name="note" rows={3} placeholder="e.g. Month-end close for the Tidewater UK entity, signed off by Kiran Desai" />
        </Field>
        <p className="text-[12px] text-ink-3">As of {formatAccaDate(ACCA_TODAY)}. Objectives are confirmed in MyExperience by your practical experience supervisor.</p>
      </FormDrawer>
    </div>
  );
}
