"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import {
  PAPER_CODES,
  formatAccaDate,
  paperName,
  resumeForStudent,
  staffById,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/misc";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { useStudentRecord } from "@/components/student/help/shared";

type SectionId = "summary" | "acca" | "education" | "experience" | "skills";
type Edu = { degree: string; institution: string; period: string };
type Role = { role: string; org: string; period: string; bullets: string };
type Draft = {
  headline: string;
  summary: string;
  education: Edu[];
  experience: Role[];
  skills: string[];
  order: SectionId[];
  showScores: boolean;
};
type Check = {
  id: string;
  label: string;
  detail: string;
  points: number;
  category: string;
  gain: number;
  passes: (d: Draft) => boolean;
  apply: (d: Draft) => Draft;
};

const SECTION_LABELS: Record<SectionId, string> = {
  summary: "Summary",
  acca: "ACCA papers",
  education: "Education",
  experience: "Experience",
  skills: "Skills",
};

function seedDraft(s: Student): Draft {
  if (s.type === "undergraduate") {
    return {
      headline: "B.Com (Hons) with ACCA student",
      summary: "Commerce student at Brightwater University taking ACCA papers alongside the degree, looking for an audit internship in summer 2027.",
      education: [{ degree: "B.Com (Hons) with ACCA", institution: "Brightwater University, Pune", period: "2025 to 2028 · Semester 3" }],
      experience: [
        {
          role: "Treasurer, Commerce Society",
          org: "Brightwater University",
          period: "2025 to present",
          bullets: "Kept the society accounts in Tally\nOrganised the budget for the annual commerce fest",
        },
      ],
      skills: ["Excel", "Tally ERP", "Bookkeeping", "Presentation skills"],
      order: ["summary", "education", "acca", "experience", "skills"],
      showScores: true,
    };
  }
  const [role, org] = (s.background.occupation ?? "Accounts executive, Tidewater Shared Services").split(", ");
  return {
    headline: `${role} · ACCA learner`,
    summary: `${role} with two years of month-end and payables experience, studying ACCA alongside work and moving into audit.`,
    education: [{ degree: "B.Com", institution: s.background.institution.replace(" (non-partner university)", ""), period: "2021 to 2024" }],
    experience: [
      {
        role,
        org: org ?? "",
        period: "2023 to present",
        bullets: "Posted journals and accruals for the India entity each month\nHandled vendor queries and weekly payment runs\nPrepared schedules for the year-end close",
      },
    ],
    skills: ["IFRS reporting", "Month-end close", "Excel (pivot tables, XLOOKUP)"],
    order: ["summary", "education", "acca", "experience", "skills"],
    showScores: true,
  };
}

function accaLines(s: Student, showScores: boolean) {
  const exempt = PAPER_CODES.filter((c) => s.papers[c].status === "exempt");
  const lines: { key: string; text: string; status: string; label: string }[] = [];
  if (exempt.length) {
    lines.push({ key: "exempt", text: `${exempt.join(", ")} · exempt`, status: "exempt", label: "ACCA-approved" });
  }
  for (const code of PAPER_CODES) {
    const p = s.papers[code];
    const last = p.attempts[p.attempts.length - 1];
    const booking = s.examBookings.find((b) => b.paper === code && (b.status === "booked" || b.status === "planned"));
    const when = booking ? (booking.entryWindow === "on-demand" ? formatAccaDate(booking.date) : booking.label) : p.plannedLabel;
    if (p.status === "passed" && last) {
      lines.push({ key: code, text: `${code} · ${paperName(code)}`, status: "passed", label: `Passed ${last.label}${showScores && last.score !== null ? `, ${last.score}%` : ""}` });
    } else if (p.status === "current" || p.status === "failed" || p.status === "in-progress") {
      lines.push({ key: code, text: `${code} · ${paperName(code)}`, status: "in progress", label: when ? `Sitting ${when}` : "In progress" });
    }
  }
  if (s.epsm.status === "complete") lines.push({ key: "epsm", text: "Ethics and Professional Skills Module", status: "complete", label: "Complete" });
  return lines;
}

const hasText = (d: Draft, word: string) =>
  [d.headline, d.summary, ...d.skills, ...d.experience.map((e) => e.bullets)].join(" ").toLowerCase().includes(word.toLowerCase());

function buildChecks(s: Student, missing: string[]): Check[] {
  const passed = PAPER_CODES.filter((c) => s.papers[c].status === "passed");
  const current = s.currentPaper ?? "FR";
  const undergrad = s.type === "undergraduate";
  const baseHeadline = undergrad ? "B.Com (Hons) with ACCA student" : (s.background.occupation ?? "Accounts executive").split(",")[0];
  const checks: Check[] = [
    {
      id: "headline",
      label: passed.length ? `Show ${passed.join(" and ")} passed and ${current} in progress in your headline` : `Show ${current} in progress in your headline`,
      detail: "Recruiters and ATS filters read the headline first.",
      points: 3,
      category: "ACCA progress shown",
      gain: 10,
      passes: (d) => d.headline.includes(current) && passed.every((c) => d.headline.includes(c)),
      apply: (d) => ({ ...d, headline: `${baseHeadline} · ACCA ${passed.join(", ")} passed · ${current} in progress` }),
    },
    {
      id: "order",
      label: "Move ACCA papers above education",
      detail: "Your ACCA progress is the strongest signal for these roles.",
      points: 2,
      category: "Format and parsing",
      gain: 6,
      passes: (d) => d.order.indexOf("acca") < d.order.indexOf("education"),
      apply: (d) => ({ ...d, order: ["summary", "acca", "education", "experience", "skills"] }),
    },
    {
      id: "audit",
      label: undergrad ? "Show audit-style work in your society role" : "Lead with audit-relevant work: reconciliations and vendor audits",
      detail: `Matches the ${s.career.targetRole.toLowerCase()} job descriptions you are applying to.`,
      points: 2,
      category: "Keywords for target role",
      gain: 6,
      passes: (d) => d.experience.some((e) => /reconcil|audit/i.test(e.bullets)),
      apply: (d) => ({
        ...d,
        experience: d.experience.map((e, i) =>
          i === 0
            ? {
                ...e,
                bullets: `${undergrad ? "Reconciled the society bank account every month and prepared records for the faculty audit" : "Ran monthly bank and vendor reconciliations and supported the statutory audit team"}\n${e.bullets}`,
              }
            : e,
        ),
      }),
    },
    {
      id: "quantified",
      label: undergrad ? "Replace duties with outcomes and numbers" : "Quantify the month-end close improvement",
      detail: "A number per role makes an achievement believable.",
      points: 4,
      category: "Quantified impact",
      gain: 14,
      passes: (d) => d.experience.some((e) => /\d/.test(e.bullets)),
      apply: (d) => ({
        ...d,
        experience: d.experience.map((e, i) =>
          i === 0
            ? {
                ...e,
                bullets: `${e.bullets}\n${undergrad ? "Managed a ₹1,20,000 fest budget and closed it 8% under plan" : "Cut the month-end close from 7 to 5 working days by standardising accrual templates"}`,
              }
            : e,
        ),
      }),
    },
    ...missing.map<Check>((kw) => ({
      id: `kw-${kw}`,
      label: `Add the keyword ${kw}`,
      detail: "Appears in most of the roles matched to you.",
      points: 2,
      category: "Keywords for target role",
      gain: 5,
      passes: (d) => hasText(d, kw),
      apply: (d) => ({ ...d, skills: d.skills.some((x) => x.toLowerCase() === kw.toLowerCase()) ? d.skills : [...d.skills, kw] }),
    })),
  ];
  return checks;
}

export function ResumeBuilder() {
  const s = useStudentRecord();
  return <ResumeBuilderView key={s.id} s={s} />;
}

function ResumeBuilderView({ s }: { s: Student }) {
  const resume = resumeForStudent(s.id);
  const reviewer = staffById(resume?.reviewerId ?? (s.type === "undergraduate" ? "st-meera" : "st-rahul"));
  const initial = useMemo(() => seedDraft(s), [s]);
  const checks = useMemo(() => buildChecks(s, resume?.missingKeywords ?? []), [s, resume]);
  const initialPass = useMemo(() => Object.fromEntries(checks.map((c) => [c.id, c.passes(initial)])), [checks, initial]);

  const [draft, setDraft] = useState<Draft>(initial);
  const [history, setHistory] = useState<Draft[]>([]);
  const [status, setStatus] = useState(resume?.status ?? "draft");
  const [skillInput, setSkillInput] = useState("");

  const base = resume?.atsScore ?? s.career.atsScore ?? 50;
  const passNow = Object.fromEntries(checks.map((c) => [c.id, c.passes(draft)]));
  const delta = (c: Check) => (passNow[c.id] ? 1 : 0) - (initialPass[c.id] ? 1 : 0);
  const score = Math.min(100, Math.max(0, base + checks.reduce((sum, c) => sum + c.points * delta(c), 0)));
  const breakdown = (resume?.breakdown ?? []).map((b) => ({
    ...b,
    score: Math.min(100, Math.max(0, b.score + checks.filter((c) => c.category === b.label).reduce((sum, c) => sum + c.gain * delta(c), 0))),
  }));
  const open = checks.filter((c) => !passNow[c.id]);
  const fixed = checks.filter((c) => passNow[c.id] && !initialPass[c.id]);
  const fileName = `${s.name.toLowerCase().replace(/\s+/g, "-")}-resume-${resume?.version ?? "v1"}.pdf`;
  const lines = accaLines(s, draft.showScores);

  function change(next: Draft) {
    setHistory((h) => [...h.slice(-19), draft]);
    setDraft(next);
  }

  function applyCheck(c: Check) {
    const before = score;
    change(c.apply(draft));
    toast({ title: "Suggestion applied", body: `${c.label} · ATS score ${before} to ${Math.min(100, before + c.points)}` });
  }

  function move(id: SectionId, dir: -1 | 1) {
    const i = draft.order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= draft.order.length) return;
    const order = [...draft.order];
    [order[i], order[j]] = [order[j], order[i]];
    change({ ...draft, order });
  }

  function addSkill() {
    const v = skillInput.trim();
    if (!v || draft.skills.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    change({ ...draft, skills: [...draft.skills, v] });
    setSkillInput("");
  }

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Career"
        title="Resume builder"
        sub="Edit each section on the left and watch the resume update on the right. Your ACCA papers fill in from your journey, and every fix below shows what it does to your ATS score."
        badge={<StatusPill status={status} />}
        actions={
          <>
            <Button
              variant="outline"
              disabled={status === "in-review"}
              onClick={() => {
                setStatus("in-review");
                toast({ title: `Sent to ${reviewer?.name} for review`, body: `ATS score ${score} · reply within two working days` });
              }}
            >
              <Send className="size-4" /> {status === "in-review" ? "In review" : "Send for review"}
            </Button>
            <Button onClick={() => toast({ title: `PDF ready: ${fileName}`, body: "A text-based PDF that ATS systems can read.", tone: "info" })}>
              <Download className="size-4" /> Download PDF
            </Button>
          </>
        }
      />

      <Card className="min-w-0">
        <div className="grid gap-6 p-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
            <ScoreRing value={score} size={112} stroke={9} showBand label="ATS score" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">ATS score</p>
              <p className="mt-1 text-[13px] text-ink-2 tnum">
                {score > base ? (
                  <span className="font-semibold text-jade">+{score - base} since you opened it</span>
                ) : (
                  `Last scored ${formatAccaDate(resume?.updated ?? "2026-09-10")}`
                )}
              </p>
              {history.length ? (
                <Button
                  size="xs"
                  variant="ghost"
                  className="mt-1.5 -ml-2.5"
                  onClick={() => {
                    setDraft(history[history.length - 1]);
                    setHistory((h) => h.slice(0, -1));
                  }}
                >
                  <Undo2 className="size-3.5" /> Undo
                </Button>
              ) : null}
            </div>
          </div>
          <div className="min-w-0 space-y-3.5">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Score breakdown</p>
            {breakdown.map((b) => (
              <ScoreBar key={b.label} label={b.label} value={b.score} height={6} />
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Fixable suggestions · {open.length} left</p>
            <ul className="mt-2.5 space-y-2">
              {open.map((c) => (
                <li key={c.id} className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-violet" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug font-semibold text-ink">{c.label}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">{c.detail}</p>
                  </div>
                  <Button size="xs" className="shrink-0" onClick={() => applyCheck(c)}>
                    Apply +{c.points}
                  </Button>
                </li>
              ))}
              {fixed.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-3 py-2">
                  <Check className="size-4 shrink-0 text-jade" />
                  <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink-3 line-through">{c.label}</p>
                  <span className="shrink-0 text-[12px] font-semibold text-jade tnum">+{c.points}</span>
                </li>
              ))}
              {open.length === 0 ? (
                <li className="text-[13px] font-semibold text-jade">Every suggestion is applied. Send it for review.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Summary" sub="Headline and a two-line profile" />
            <div className="space-y-4 border-t border-line px-5 py-4">
              <Field label="Headline">
                <Input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} />
              </Field>
              <Field label="Profile summary">
                <Textarea rows={3} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="ACCA papers"
              sub="Filled in from your ACCA journey"
              action={
                <Button size="xs" variant="outline" onClick={() => toast({ title: "ACCA papers refreshed from your journey", body: `${lines.length} entries up to date`, tone: "info" })}>
                  <RefreshCw className="size-3.5" /> Refresh
                </Button>
              }
            />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {lines.map((l) => (
                <li key={l.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5">
                  <span className="min-w-0 text-[13px] font-semibold text-ink">{l.text}</span>
                  <StatusPill status={l.status} size="sm">
                    {l.label}
                  </StatusPill>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 py-3.5">
              <Switch checked={draft.showScores} onChange={(v) => change({ ...draft, showScores: v })} label="Show exam scores" sub="Some employers ask for them; you can leave them off" />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Education"
              action={
                <Button size="xs" variant="outline" onClick={() => change({ ...draft, education: [...draft.education, { degree: "", institution: "", period: "" }] })}>
                  <Plus className="size-3.5" /> Add
                </Button>
              }
            />
            <div className="space-y-4 border-t border-line px-5 py-4">
              {draft.education.map((e, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-2">
                  <Field label="Qualification">
                    <Input value={e.degree} onChange={(ev) => setDraft({ ...draft, education: draft.education.map((x, k) => (k === i ? { ...x, degree: ev.target.value } : x)) })} />
                  </Field>
                  <Field label="Years">
                    <Input value={e.period} onChange={(ev) => setDraft({ ...draft, education: draft.education.map((x, k) => (k === i ? { ...x, period: ev.target.value } : x)) })} />
                  </Field>
                  <Field label="Institution" className="sm:col-span-2">
                    <Input value={e.institution} onChange={(ev) => setDraft({ ...draft, education: draft.education.map((x, k) => (k === i ? { ...x, institution: ev.target.value } : x)) })} />
                  </Field>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Experience"
              sub="One achievement per line"
              action={
                <Button size="xs" variant="outline" onClick={() => change({ ...draft, experience: [...draft.experience, { role: "", org: "", period: "", bullets: "" }] })}>
                  <Plus className="size-3.5" /> Add role
                </Button>
              }
            />
            <div className="space-y-5 border-t border-line px-5 py-4">
              {draft.experience.map((e, i) => {
                const set = (patch: Partial<Role>) => setDraft({ ...draft, experience: draft.experience.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                return (
                  <div key={i} className="grid gap-3 sm:grid-cols-2">
                    <Field label="Role">
                      <Input value={e.role} onChange={(ev) => set({ role: ev.target.value })} />
                    </Field>
                    <Field label="Organisation">
                      <Input value={e.org} onChange={(ev) => set({ org: ev.target.value })} />
                    </Field>
                    <Field label="Period" className="sm:col-span-2">
                      <Input value={e.period} onChange={(ev) => set({ period: ev.target.value })} />
                    </Field>
                    <Field label="Achievements" className="sm:col-span-2">
                      <Textarea rows={4} value={e.bullets} onChange={(ev) => set({ bullets: ev.target.value })} />
                    </Field>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Skills" sub="Add the words from the job descriptions you target" />
            <div className="border-t border-line px-5 py-4">
              <div className="flex flex-wrap gap-1.5">
                {draft.skills.map((sk) => (
                  <span key={sk} className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface-2 py-0.5 pr-1 pl-2.5 text-[12.5px] font-medium text-ink">
                    <span className="truncate">{sk}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${sk}`}
                      onClick={() => change({ ...draft, skills: draft.skills.filter((x) => x !== sk) })}
                      className="grid size-5 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-rose-soft hover:text-rose"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addSkill();
                }}
                className="mt-3 flex gap-2"
              >
                <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="e.g. Audit sampling" aria-label="Add a skill" className="min-w-0" />
                <Button type="submit" variant="secondary" disabled={!skillInput.trim()} className="shrink-0">
                  <Plus className="size-4" /> Add
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Section order" sub="Top to bottom, as the resume prints" />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {draft.order.map((id, i) => (
                <li key={id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[11.5px] font-bold text-ink-2 tnum">{i + 1}</span>
                  <span className="min-w-0 flex-1 text-[13px] font-semibold text-ink">{SECTION_LABELS[id]}</span>
                  <Button size="xs" variant="ghost" aria-label={`Move ${SECTION_LABELS[id]} up`} disabled={i === 0} onClick={() => move(id, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button size="xs" variant="ghost" aria-label={`Move ${SECTION_LABELS[id]} down`} disabled={i === draft.order.length - 1} onClick={() => move(id, 1)}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 xl:sticky xl:top-20">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Live preview</p>
            <p className="text-[12px] text-ink-3">{resume?.version ?? "v1"} · A4</p>
          </div>
          <article aria-label="Resume preview" className="min-w-0 rounded-[var(--radius-md)] border border-line-strong bg-surface p-6 sm:p-8">
            <header className="border-b-2 border-ink pb-4">
              <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em] text-ink">{s.name}</h2>
              <p className="mt-1 text-[13.5px] font-semibold text-ink-2 [overflow-wrap:anywhere]">{draft.headline}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Mail className="size-3 shrink-0" /> <span className="truncate">{s.email}</span>
                </span>
                <span className="inline-flex items-center gap-1 tnum">
                  <Phone className="size-3" /> {s.phone}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" /> {s.city}
                </span>
              </p>
            </header>
            {draft.order.map((id) => (
              <section key={id} className="mt-4">
                <h3 className="text-[10.5px] font-bold tracking-[0.14em] text-ink uppercase">{SECTION_LABELS[id]}</h3>
                <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                  {id === "summary" ? <p className="[overflow-wrap:anywhere]">{draft.summary}</p> : null}
                  {id === "acca" ? (
                    <ul className="space-y-0.5">
                      <li className="font-semibold text-ink">ACCA student ID {s.accaId ?? "pending"}</li>
                      {lines.map((l) => (
                        <li key={l.key} className="flex flex-wrap justify-between gap-x-3">
                          <span>{l.text}</span>
                          <span className="text-ink-3">{l.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {id === "education"
                    ? draft.education.map((e, i) => (
                        <div key={i} className="flex flex-wrap justify-between gap-x-3">
                          <span>
                            <span className="font-semibold text-ink">{e.degree}</span>
                            {e.institution ? `, ${e.institution}` : ""}
                          </span>
                          <span className="text-ink-3">{e.period}</span>
                        </div>
                      ))
                    : null}
                  {id === "experience"
                    ? draft.experience.map((e, i) => (
                        <div key={i} className="mb-2 last:mb-0">
                          <div className="flex flex-wrap justify-between gap-x-3">
                            <span className="font-semibold text-ink">
                              {e.role}
                              {e.org ? `, ${e.org}` : ""}
                            </span>
                            <span className="text-ink-3">{e.period}</span>
                          </div>
                          <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                            {e.bullets
                              .split("\n")
                              .filter((b) => b.trim())
                              .map((b, k) => (
                                <li key={k} className="[overflow-wrap:anywhere]">
                                  {b}
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))
                    : null}
                  {id === "skills" ? <p className="[overflow-wrap:anywhere]">{draft.skills.join(" · ")}</p> : null}
                </div>
              </section>
            ))}
          </article>

          <Card>
            <CardHeader title="Reviewer comments" sub={`${reviewer?.name ?? "Placement team"} · ${resume?.version ?? "v1"} · ${formatAccaDate(resume?.updated ?? "2026-09-10")}`} />
            <ul className="space-y-2.5 border-t border-line px-5 py-4">
              {(resume?.feedback ?? []).map((f) => (
                <li key={f} className={cn("flex gap-2.5 text-[13px] leading-relaxed text-ink-2")}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cta-strong" />
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
