"use client";

import { useMemo, useState } from "react";
import { Award, BadgeCheck, Bell, Check, Clock, Copy, Download, Eye, Lock, ShieldCheck, Stamp } from "lucide-react";
import {
  EXAMS_TO_QUALIFY,
  certificateTemplates,
  epsm,
  formatAccaDate,
  jointCertificateRule,
  paperByCode,
  papersCleared,
  programmeById,
  universityById,
  type PaperCode,
  type Student,
  type University,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { Checkbox, Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, UniversityMark, useStudentRecord } from "./shared";

type Earned = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  issuedOn: string;
  issuer: string;
  signatory: string;
  note?: string;
};

type InProgress = { id: string; title: string; progress: number; items: { label: string; met: boolean }[] };

const VERIFY_HOST = "verify.zskillup.com/c/";

function paperTemplate() {
  return certificateTemplates.find((t) => t.id === "cert-paper")!;
}

/** Paper completion: course completed and a full mock at 50% or above (an ACCA pass also counts). */
function paperCertificates(s: Student) {
  const earned: Earned[] = [];
  const pending: InProgress[] = [];
  const tpl = paperTemplate();
  const codes = (Object.keys(s.papers) as PaperCode[]).filter((c) => {
    const st = s.papers[c].status;
    return st === "passed" || st === "current" || st === "in-progress" || st === "failed";
  });
  for (const code of codes) {
    const p = s.papers[code];
    const paper = paperByCode(code)!;
    const mock = s.mocks
      .filter((m) => m.paper === code && m.status === "completed" && (m.score ?? 0) >= 50 && /mock exam/i.test(m.title))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const pass = p.attempts.find((a) => a.result === "passed");
    const courseDone = p.progress >= 100;
    if (courseDone && (mock || pass)) {
      earned.push({
        id: `ZSK-PC-${code}-${s.accaId ?? s.id.slice(2).toUpperCase()}`,
        kind: "Paper completion",
        title: `${code} · ${paper.name}`,
        detail: pass ? `ACCA result: passed ${pass.label} with ${pass.score}%` : `Mock exam: ${mock!.score}%`,
        issuedOn: mock?.date ?? pass!.date,
        issuer: tpl.issuers.join(" and "),
        signatory: tpl.signatories[0],
      });
    } else {
      const items = [
        { label: courseDone ? "Course completed" : `Complete the ${code} course (${p.progress}% done)`, met: courseDone },
        { label: mock ? `Full mock at 50% or above (${mock.score}%)` : "Score 50% or above in a full mock exam", met: Boolean(mock) },
      ];
      pending.push({
        id: `pc-${code}`,
        title: `Paper completion · ${code} ${paper.name}`,
        progress: Math.round((courseDone ? 50 : p.progress / 2) + (mock ? 50 : 0)),
        items,
      });
    }
  }
  return { earned, pending };
}

function certificatesFor(s: Student) {
  const { earned, pending } = paperCertificates(s);
  if (s.epsm.status === "complete" && s.epsm.completedOn) {
    earned.unshift({
      id: `ZSK-EPSM-${s.accaId ?? s.id.slice(2).toUpperCase()}`,
      kind: "EPSM completion",
      title: epsm.name,
      detail: `All ${epsm.units.length} units completed`,
      issuedOn: s.epsm.completedOn,
      issuer: "ZSkillup",
      signatory: "Priya Menon, ACCA Programme Lead",
      note: "ACCA confirms EPSM completion separately on your ACCA record.",
    });
  } else if (s.epsm.status === "in-progress") {
    pending.push({
      id: "epsm",
      title: `EPSM completion · ${epsm.name}`,
      progress: s.epsm.progress,
      items: [{ label: `Complete all ${epsm.units.length} units (${s.epsm.progress}% done)`, met: false }],
    });
  }
  if (s.type === "graduate") {
    const prog = programmeById(s.programmeId);
    const cleared = papersCleared(s);
    const paidAll = s.fees.instalments.every((i) => i.status === "paid");
    pending.push({
      id: "programme",
      title: `${prog?.name ?? "Programme"} · programme completion`,
      progress: Math.round((cleared / EXAMS_TO_QUALIFY) * 100),
      items: [
        { label: `All planned papers passed or exempt (${cleared} of ${EXAMS_TO_QUALIFY})`, met: cleared >= EXAMS_TO_QUALIFY },
        {
          label: paidAll ? "Fees cleared" : `Fees cleared (${s.fees.instalments.filter((i) => i.status === "paid").length} of ${s.fees.instalments.length} instalments paid)`,
          met: paidAll,
        },
      ],
    });
  }
  return { earned, pending };
}

/* ---------------------------------------------------------------- joint certificate */

type JcItem = { id: string; group: string; label: string; detail: string; state: "met" | "pending" | "not-met" };

function jointItems(s: Student): JcItem[] {
  const paperItem = (code: PaperCode, group: string): JcItem => {
    const p = s.papers[code];
    const pass = p.attempts.find((a) => a.result === "passed");
    const booking = s.examBookings.find((b) => b.paper === code && (b.status === "booked" || b.status === "planned"));
    if (p.status === "passed" || p.status === "exempt") {
      return { id: code, group, label: `${code} ${p.status === "exempt" ? "exempt" : "passed"}`, detail: pass ? `${pass.score}% · ${pass.label}` : "Exempt", state: "met" };
    }
    if (p.status === "failed") return { id: code, group, label: `${code} not yet passed`, detail: "Reattempt needed", state: "not-met" };
    return {
      id: code,
      group,
      label: `${code} pending`,
      detail: booking
        ? `${booking.status === "booked" ? "Exam booked" : "Exam planned"} ${booking.label}${p.status === "in-progress" ? " · studying this semester" : ""}`
        : p.status === "in-progress"
          ? "Studying this semester"
          : "Not started",
      state: "pending",
    };
  };
  const att = s.attendance;
  const attendanceMet = att.total === 0 || att.pct >= 75;
  return [
    paperItem("BT", "applied-knowledge"),
    paperItem("MA", "applied-knowledge"),
    paperItem("FA", "applied-knowledge"),
    paperItem("LW", "lw-passed"),
    {
      id: "attendance",
      group: "attendance",
      label: "Attendance in ACCA sessions",
      detail: att.total === 0 ? "Classes not started" : `${att.pct}% · ${att.attended} of ${att.total} sessions`,
      state: attendanceMet ? "met" : "not-met",
    },
    {
      id: "fees",
      group: "no-overdue-fees",
      label: "No overdue fees",
      detail: s.fees.status === "overdue" ? "An instalment is overdue" : "All instalments up to date",
      state: s.fees.status === "overdue" ? "not-met" : "met",
    },
  ];
}

function JointEligibility({ student, university }: { student: Student; university: University }) {
  const items = useMemo(() => jointItems(student), [student]);
  const [assume, setAssume] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [preview, setPreview] = useState(false);
  const jc = student.jointCertificate;
  const tpl = certificateTemplates.find((t) => t.kind === "joint" && t.universityId === university.id);

  const effective = items.map((i) => (i.state === "pending" && assume.includes(i.id) ? { ...i, state: "met" as const, projected: true } : { ...i, projected: false }));
  const met = effective.filter((i) => i.state === "met").length;
  const pct = Math.round((met / items.length) * 100);
  const allMet = met === items.length;
  const actualMet = items.filter((i) => i.state === "met").length;
  const pendingItems = items.filter((i) => i.state === "pending");
  const lastPending = pendingItems
    .map((i) => student.examBookings.find((b) => b.paper === i.id))
    .filter(Boolean)
    .sort((a, b) => a!.date.localeCompare(b!.date))
    .pop();

  return (
    <section aria-labelledby="jc-title" className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative isolate bg-surface-inv px-5 py-5 text-ink-inv sm:px-6">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-cta" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <UniversityMark university={university} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.12em] text-cta uppercase">Joint-certificate eligibility</p>
                <h2 id="jc-title" className="mt-1.5 font-display text-[clamp(1.2rem,1rem+0.8vw,1.6rem)] leading-tight font-bold tracking-[-0.02em] text-ink-inv">
                  {jointCertificateRule.title}
                </h2>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-inv/70">{jointCertificateRule.summary}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="inverse" size="sm" onClick={() => setPreview(true)}>
                <Eye aria-hidden className="size-4" />
                Preview certificate
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 border-t border-ink-inv/15 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] text-ink-inv/70">
                  {met} of {items.length} checks met{assume.length ? " (with projected results)" : ""}
                </span>
                <span className="font-display text-[26px] leading-none font-bold text-cta tnum">{pct}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-inv/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Joint-certificate eligibility">
                <div className="h-full rounded-full bg-cta transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={allMet ? "eligible" : (jc?.status ?? "on-track")}>
                {allMet ? (assume.length ? "Eligible once these results are in" : "Eligible") : jc?.status === "at-risk" ? "At risk" : "On track"}
              </StatusPill>
              <StatusPill status={jc?.universityVerification ?? "not-started"}>
                University verification: {jc?.universityVerification === "verified" ? "verified" : jc?.universityVerification === "pending" ? "pending" : "not started"}
              </StatusPill>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            {jointCertificateRule.criteria.map((c) => {
              const group = effective.filter((i) => i.group === c.id);
              const groupMet = group.every((i) => i.state === "met");
              return (
                <div key={c.id} className="rounded-[var(--radius-md)] border border-line">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
                    <p className="min-w-0 text-[13px] font-bold text-ink">{c.label}</p>
                    <StatusPill status={groupMet ? "met" : "pending"} tone={groupMet ? "jade" : "amber"} size="sm">
                      {groupMet ? "Met" : "Not yet"}
                    </StatusPill>
                  </div>
                  <ul className="divide-y divide-line">
                    {group.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full",
                            i.state === "met" && !i.projected && "bg-jade text-on-accent",
                            i.state === "met" && i.projected && "border-2 border-dashed border-jade bg-jade-soft text-jade",
                            i.state === "pending" && "bg-amber-soft text-amber",
                            i.state === "not-met" && "bg-rose-soft text-rose",
                          )}
                        >
                          {i.state === "met" ? <Check className="size-3.5" strokeWidth={3} /> : i.state === "pending" ? <Clock className="size-3.5" strokeWidth={2.4} /> : <Lock className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-semibold text-ink">{i.label}</span>
                          <span className="block text-[12.5px] text-ink-3">
                            {i.detail}
                            {i.projected ? " · projected as passed" : ""}
                          </span>
                        </span>
                        <span className="sr-only">{i.state === "met" ? "Met" : i.state === "pending" ? "Pending" : "Not met"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-[var(--radius-md)] border border-cta bg-cta-soft p-4">
              <MicroLabel>Where you stand</MicroLabel>
              <p className="mt-2 text-[14px] leading-snug font-semibold text-ink">
                {actualMet === items.length
                  ? "You meet every check. Brightwater verifies eligibility before the certificate is issued."
                  : `${pendingItems.length} ${pendingItems.length === 1 ? "check depends" : "checks depend"} on exams still to sit${lastPending ? `, the last on ${formatAccaDate(lastPending.date)}` : ""}.`}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                The first eligibility check for the {student.intakeId === "in-2025-jul" ? "2025 intake" : "intake"} runs after Semester 3 results, with {university.shortName} verifying each learner.
              </p>
            </div>
            {pendingItems.length ? (
              <fieldset className="rounded-[var(--radius-md)] border border-line p-4">
                <legend className="px-1 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Project my eligibility</legend>
                <p className="mb-3 text-[12.5px] text-ink-3">Tick the results you expect to see how the checklist changes.</p>
                <div className="space-y-2.5">
                  {pendingItems.map((i) => (
                    <Checkbox
                      key={i.id}
                      checked={assume.includes(i.id)}
                      onChange={(e) => setAssume((a) => (e.target.checked ? [...a, i.id] : a.filter((x) => x !== i.id)))}
                      label={`${i.id} passed (${i.detail.charAt(0).toLowerCase()}${i.detail.slice(1)})`}
                    />
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div className="rounded-[var(--radius-md)] border border-line p-4">
              <Switch
                checked={notify}
                onChange={(v) => {
                  setNotify(v);
                  toast({ title: v ? "We will notify you when you become eligible" : "Eligibility alerts turned off", tone: v ? "success" : "neutral" });
                }}
                label="Notify me when I become eligible"
                sub="In-app and email, when every check is met."
              />
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Joint certificate preview"
        sub="Issued once every check is met and the university verifies eligibility."
        width="max-w-2xl"
        footer={
          <Button variant="ghost" onClick={() => setPreview(false)}>
            Close
          </Button>
        }
      >
        <CertificateFace
          recipient={student.name}
          kicker="Joint certificate of completion"
          title={university.programmeName}
          body={`awarded jointly by ${university.name} and ZSkillup on meeting ${jointCertificateRule.summary.replace(/\.$/, "").toLowerCase()}`}
          signatories={tpl?.signatories ?? ["Dr Suresh Nair, Programme Director", "Neha Kapoor, Platform Director"]}
          certificateId={`BU-JC-2025-${student.accaId ?? "0000"}`}
          dateLabel="Date of issue shown once issued"
          university={university}
          sample
        />
      </Modal>
    </section>
  );
}

/* ---------------------------------------------------------------- certificate face */

function CertificateFace({
  recipient,
  kicker,
  title,
  body,
  signatories,
  certificateId,
  dateLabel,
  university,
  sample,
}: {
  recipient: string;
  kicker: string;
  title: string;
  body: string;
  signatories: string[];
  certificateId: string;
  dateLabel: string;
  university?: University;
  sample?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border-4 border-double border-line-strong bg-surface p-5 text-center sm:p-8">
      <div className="flex items-center justify-center gap-3">
        {university ? <UniversityMark university={university} size="sm" /> : null}
        <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-surface-inv text-cta">
          <Award aria-hidden className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 text-[11px] font-bold tracking-[0.16em] text-ink-3 uppercase">
        {university ? `${university.name} · ZSkillup` : "ZSkillup · ACCA LMS"}
      </p>
      <p className="mt-4 text-[12px] font-bold tracking-[0.12em] text-ink-2 uppercase">{kicker}</p>
      <p className="mt-3 text-[13px] text-ink-3">This certifies that</p>
      <p className="mt-1 font-display text-[clamp(1.6rem,1.2rem+1.5vw,2.3rem)] leading-tight font-bold tracking-[-0.03em] text-ink">{recipient}</p>
      <p className="mx-auto mt-1 h-1 w-24 rounded-full bg-cta" aria-hidden />
      <p className="mt-3 text-[16px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {signatories.map((sig) => (
          <div key={sig} className="min-w-0 border-t border-line-strong pt-2">
            <p className="truncate text-[12.5px] font-semibold text-ink">{sig.split(",")[0]}</p>
            <p className="truncate text-[11.5px] text-ink-3">{sig.split(",").slice(1).join(",").trim()}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
        <span className="font-mono">{certificateId}</span>
        <span>{dateLabel}</span>
        <span className="font-mono">{VERIFY_HOST}{certificateId}</span>
      </div>
      {sample ? <p className="mt-3 text-[11.5px] font-semibold text-amber">Preview: not yet issued</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export function CertificatesPage() {
  const student = useStudentRecord();
  return <CertificatesView key={student.id} student={student} />;
}

export function CertificatesView({ student }: { student: Student }) {
  const university = universityById(student.universityId);
  const { earned, pending } = useMemo(() => certificatesFor(student), [student]);
  const [viewing, setViewing] = useState<Earned | null>(null);
  const [shared, setShared] = useState<string[]>([]);

  const copyLink = (c: Earned) => {
    const url = `https://${VERIFY_HOST}${c.id}`;
    try {
      void navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard blocked: the toast still shows the link */
    }
    setShared((s) => (s.includes(c.id) ? s : [...s, c.id]));
    toast({ title: "Verification link copied", body: url, tone: "info" });
  };

  const download = (c: Earned) => toast({ title: `Certificate downloaded: ${c.id}.pdf`, body: c.title, tone: "info" });

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Certificates"
        sub={
          student.type === "undergraduate"
            ? "Certificates you have earned, and your joint-certificate eligibility checklist against the university rule."
            : "Certificates you have earned on the platform, each with a public verification link, and the ones you are working towards."
        }
        actions={
          earned.length ? (
            <Button variant="outline" onClick={() => toast({ title: `${earned.length} certificates downloaded as a zip`, body: earned.map((e) => e.id).join(", "), tone: "info" })}>
              <Download aria-hidden className="size-4" />
              Download all
            </Button>
          ) : null
        }
      />

      <KpiRow cols={3}>
        <KpiTile hero label="Certificates earned" value={earned.length} icon={<Award />} sub={earned.map((e) => e.kind === "EPSM completion" ? "EPSM" : e.title.split(" · ")[0]).join(", ")} />
        <KpiTile label="In progress" value={pending.length} tone="amber" icon={<Clock />} sub="See what is left for each" />
        {student.type === "undergraduate" && student.jointCertificate ? (
          <KpiTile
            label="Joint certificate"
            value={student.jointCertificate.status === "eligible" ? "Eligible" : student.jointCertificate.status === "at-risk" ? "At risk" : "On track"}
            tone={student.jointCertificate.status === "at-risk" ? "rose" : "jade"}
            icon={<Stamp />}
            sub={student.jointCertificate.missing.length ? `Needs ${student.jointCertificate.missing.join(" and ")}` : "All checks met"}
          />
        ) : (
          <KpiTile label="Exams cleared" value={`${papersCleared(student)} of ${EXAMS_TO_QUALIFY}`} tone="info" icon={<BadgeCheck />} sub="Passed or exempt" />
        )}
      </KpiRow>

      {student.type === "undergraduate" && university ? <JointEligibility student={student} university={university} /> : null}

      <section aria-labelledby="earned-title" className="space-y-3.5">
        <h2 id="earned-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
          Earned certificates
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {earned.map((c) => (
            <Card key={c.id} className="flex min-w-0 flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3 bg-surface-inv px-4 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cta text-cta-ink">
                    <Award aria-hidden className="size-4" />
                  </span>
                  <span className="truncate text-[12px] font-bold tracking-[0.1em] text-ink-inv uppercase">{c.kind}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-ink-inv/80">
                  <ShieldCheck aria-hidden className="size-3.5 text-cta" />
                  Verified
                </span>
              </div>
              <div className="flex-1 space-y-2 px-4 py-4">
                <h3 className="text-[15.5px] leading-snug font-bold text-ink">{c.title}</h3>
                <p className="text-[12.5px] text-ink-2">{c.detail}</p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 pt-1 text-[12.5px]">
                  <dt className="text-ink-3">Issued</dt>
                  <dd className="text-ink">{formatAccaDate(c.issuedOn)}</dd>
                  <dt className="text-ink-3">Issuer</dt>
                  <dd className="truncate text-ink">{c.issuer}</dd>
                  <dt className="text-ink-3">ID</dt>
                  <dd className="truncate font-mono text-ink">{c.id}</dd>
                </dl>
                <p className="truncate font-mono text-[11.5px] text-ink-3" title={`${VERIFY_HOST}${c.id}`}>
                  {VERIFY_HOST}
                  {c.id}
                </p>
                {c.note ? <p className="text-[12px] leading-relaxed text-ink-3">{c.note}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                <Button size="sm" variant="secondary" onClick={() => setViewing(c)}>
                  <Eye aria-hidden className="size-3.5" />
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => download(c)}>
                  <Download aria-hidden className="size-3.5" />
                  Download PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copyLink(c)}>
                  {shared.includes(c.id) ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
                  {shared.includes(c.id) ? "Link copied" : "Copy verify link"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader title="Certificates in progress" sub="What is left before each one is issued" />
        <ul className="divide-y divide-line border-t border-line">
          {pending.map((p) => (
            <li key={p.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_14rem] md:items-center">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{p.title}</p>
                <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {p.items.map((it) => (
                    <li key={it.label} className={cn("flex items-center gap-1.5 text-[12.5px]", it.met ? "text-jade" : "text-ink-3")}>
                      {it.met ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : <Clock aria-hidden className="size-3.5" />}
                      {it.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex justify-between text-[12px] text-ink-3">
                  <span>Progress</span>
                  <span className="font-mono font-semibold text-ink tnum">{p.progress}%</span>
                </div>
                <Progress value={p.progress} />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
            <Bell aria-hidden className="size-3.5" />
            Certificates are issued automatically when every requirement is met.
          </p>
          <LinkButton href="/papers" size="sm" variant="outline">
            Continue learning
          </LinkButton>
        </div>
      </Card>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? "Certificate"}
        sub={viewing ? `${viewing.kind} · issued ${formatAccaDate(viewing.issuedOn)}` : undefined}
        width="max-w-2xl"
        footer={
          viewing ? (
            <>
              <Button variant="ghost" onClick={() => copyLink(viewing)}>
                <Copy aria-hidden className="size-4" />
                Copy verify link
              </Button>
              <Button onClick={() => download(viewing)}>
                <Download aria-hidden className="size-4" />
                Download PDF
              </Button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <CertificateFace
            recipient={student.name}
            kicker={viewing.kind === "EPSM completion" ? "Certificate of completion" : "Paper completion certificate"}
            title={viewing.title}
            body={viewing.kind === "EPSM completion" ? "for completing the Ethics and Professional Skills Module study programme on ACCA LMS" : `for completing the ${viewing.title.split(" · ")[1]} course and assessment on ACCA LMS. ${viewing.detail}.`}
            signatories={[viewing.signatory]}
            certificateId={viewing.id}
            dateLabel={`Issued ${formatAccaDate(viewing.issuedOn)}`}
          />
        ) : null}
      </Modal>
    </div>
  );
}
