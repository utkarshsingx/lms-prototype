"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Download,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  MessageSquareText,
} from "lucide-react";
import { useRole } from "@/lib/role";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { DataRow } from "@/components/ui/misc";
import { HeroBand } from "@/components/ui/hero-band";
import { toast } from "@/components/ui/toast";

type Achievement = { title: string; detail: string; tone: Tone };
type Exemption = { code: string; paper: string; state: string; detail: string };

type Profile = {
  subtitle: string;
  location: string;
  file: string;
  stats: { label: string; value: string; hint?: string }[];
  achievements: Achievement[];
  exemptions: Exemption[];
  exemptionNote: string;
  cohort: [label: string, value: string][];
  mentor: { name: string; title: string; note: string };
  record: [label: string, value: string, mono?: boolean][];
  privacy: string[];
};

/* Facts from the demo world (bible section 6). Both demo students are fixed
   records, so the profile reads the same wherever the page is opened. */
const PROFILES: Record<"graduate" | "undergraduate", Profile> = {
  graduate: {
    subtitle: "Graduate ACCA learner · ACCA Graduate Pathway",
    location: "Bengaluru",
    file: "anaya-rao-acca-record.pdf",
    stats: [
      { label: "Papers passed or exempt", value: "5 of 13", hint: "TX passed · 4 exemptions" },
      { label: "Current paper", value: "FR", hint: "Booked for Dec 2026" },
      { label: "FR readiness score", value: "64", hint: "PM 58" },
      { label: "PER months", value: "14 of 36", hint: "3 of 9 objectives" },
    ],
    achievements: [
      { title: "Taxation (TX-UK) passed", detail: "58% · March 2026 exam session", tone: "jade" },
      { title: "Ethics and Professional Skills Module completed", detail: "Final assessment 93%", tone: "jade" },
      { title: "Four exemptions confirmed by ACCA", detail: "BT, MA, FA and LW · March 2025", tone: "violet" },
      { title: "Budgeting and standard costing check", detail: "94% · PM revision cohort", tone: "amber" },
    ],
    exemptions: [
      { code: "BT", paper: "Business and Technology", state: "Approved", detail: "Estimated Jan 2025 · confirmed Mar 2025 · fee paid" },
      { code: "MA", paper: "Management Accounting", state: "Approved", detail: "Estimated Jan 2025 · confirmed Mar 2025 · fee paid" },
      { code: "FA", paper: "Financial Accounting", state: "Approved", detail: "Estimated Jan 2025 · confirmed Mar 2025 · fee paid" },
      { code: "LW", paper: "Corporate and Business Law", state: "Approved", detail: "Estimated Jan 2025 · confirmed Mar 2025 · fee paid" },
    ],
    exemptionNote: "Evaluated from your B.Com (2024). Further exemptions need a new qualification document.",
    cohort: [
      ["Programme", "ACCA Graduate Pathway"],
      ["Current cohort", "FR · Dec 2026 · Weekend"],
      ["Reattempt cohort", "PM Revision and Reattempt · Dec 2026"],
      ["Batch", "Weekend"],
      ["Attendance in ACCA sessions", "88%"],
    ],
    mentor: {
      name: "Aisha Khan",
      title: "Academic Mentor",
      note: "Working with you on the PM reattempt plan",
    },
    record: [
      ["ACCA student ID", "4382917", true],
      ["Registered with ACCA", "12 Feb 2025"],
      ["Annual subscription", "Paid · next due 1 Jan 2027"],
      ["EPSM", "Complete"],
      ["PER", "14 of 36 months"],
      ["Career goal", "Accounts executive to audit associate"],
    ],
    privacy: [
      "Faculty see your progress, attendance and marks on the papers they teach.",
      "Your mentor and the academic team see your full ACCA record so they can support you.",
      "Nobody in your cohort sees your marks, and your AI tutor conversations stay private unless you raise a doubt from one.",
    ],
  },
  undergraduate: {
    subtitle: "B.Com (Hons) with ACCA · Brightwater University · Semester 3",
    location: "Pune",
    file: "rohan-iyer-acca-record.pdf",
    stats: [
      { label: "Papers passed", value: "2 of 13", hint: "BT and MA" },
      { label: "Current paper", value: "FA", hint: "Exam 18 Nov 2026" },
      { label: "FA readiness score", value: "72" },
      { label: "Cohort leaderboard", value: "4 of 71", hint: "Semester 3 cohort" },
    ],
    achievements: [
      { title: "Business and Technology (BT) passed", detail: "71% · March 2026", tone: "jade" },
      { title: "Management Accounting (MA) passed", detail: "64% · June 2026", tone: "jade" },
      { title: "Top 5 in the Semester 3 leaderboard", detail: "Rank 4 of 71", tone: "amber" },
      { title: "Joint certificate on track", detail: "Needs FA and LW", tone: "violet" },
    ],
    exemptions: [],
    exemptionNote:
      "No exemptions claimed. On the B.Com (Hons) with ACCA route you sit every paper yourself, starting with BT in Semester 1. Your university subjects overlap with FA, MA and LW, and that overlap is mapped on your semester roadmap.",
    cohort: [
      ["University", "Brightwater University"],
      ["Programme", "B.Com (Hons) with ACCA"],
      ["Cohort", "Brightwater · 2025 intake · Semester 3"],
      ["Section", "A"],
      ["Attendance in ACCA sessions", "92%"],
    ],
    mentor: {
      name: "Nikhil Bose",
      title: "Academic Mentor",
      note: "Mentor for the Brightwater Semester 3 cohort",
    },
    record: [
      ["ACCA student ID", "5129044", true],
      ["Registered with ACCA", "18 Aug 2025"],
      ["Annual subscription", "Paid · next due 1 Jan 2027"],
      ["LW", "In progress · exam Jan 2027"],
      ["Joint certificate", "On track"],
      ["Internship", "Planned for summer 2027"],
    ],
    privacy: [
      "Faculty see your progress, attendance and marks on the papers they teach.",
      "Your mentor and the academic team see your full ACCA record so they can support you.",
      "Brightwater University sees your ACCA attendance, progress and results, never your AI tutor conversations.",
      "Your cohort sees your leaderboard rank, not your marks.",
    ],
  },
};

export function ProfileView() {
  const { persona, studentType } = useRole();
  const type = studentType === "undergraduate" ? "undergraduate" : "graduate";
  const p = PROFILES[type];

  return (
    <div className="mx-auto max-w-[86rem] space-y-6">
      <HeroBand
        eyebrow="Account · Profile"
        title={
          <span className="flex min-w-0 items-center gap-4">
            <Avatar name={persona.name} size="lg" className="shrink-0 ring-2 ring-cta" />
            <span className="min-w-0">{persona.name}</span>
          </span>
        }
        sub={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="size-3.5 text-cta" /> {p.subtitle}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-cta" /> {p.location}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0 text-cta" />
              <span className="truncate">{persona.email}</span>
            </span>
          </span>
        }
        stats={p.stats}
        actions={
          <>
            <Button
              onClick={() =>
                toast({ title: `Report queued: ${p.file}`, body: "Your ACCA record, ready to download in a minute." })
              }
            >
              <Download className="size-4" /> Download ACCA record
            </Button>
            <LinkButton href="/journey" variant="inverse">
              ACCA journey <ArrowRight className="size-4" />
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="ACCA achievements"
              sub="Results and milestones recorded by the academic team"
              action={
                <Link
                  href="/certificates"
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink underline decoration-cta decoration-2 underline-offset-4"
                >
                  Certificates <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {p.achievements.map((a) => (
                <li key={a.title} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)]"
                    style={{ backgroundColor: `var(--${a.tone}-soft)`, color: `var(--${a.tone})` }}
                  >
                    <Award className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">{a.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3 tnum">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Exemptions"
              sub={p.exemptions.length ? `${p.exemptions.length} papers exempt` : "None claimed"}
            />
            {p.exemptions.length ? (
              <ul className="divide-y divide-[var(--line)] border-t border-line">
                {p.exemptions.map((e) => (
                  <li key={e.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                    <span className="w-10 shrink-0 font-mono text-[13px] font-semibold text-ink">
                      {e.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-ink">{e.paper}</p>
                      <p className="mt-0.5 text-[12px] text-ink-3">{e.detail}</p>
                    </div>
                    <Badge tone="jade" dot>
                      {e.state}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="border-t border-line px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-3">
              {p.exemptionNote}
            </p>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={type === "graduate" ? "Cohort and batch" : "University and cohort"} />
            <dl className="border-t border-line px-5 py-1">
              {p.cohort.map(([label, value]) => (
                <DataRow key={label} label={label}>
                  {value}
                </DataRow>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Your mentor" />
            <div className="border-t border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={p.mentor.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{p.mentor.name}</p>
                  <p className="truncate text-[12px] text-ink-3">{p.mentor.title}</p>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{p.mentor.note}</p>
              <LinkButton href="/my-mentor" variant="secondary" size="sm" className="mt-4 w-full">
                <MessageSquareText className="size-3.5" /> Message your mentor
              </LinkButton>
            </div>
          </Card>

          <Card>
            <CardHeader title="ACCA record" action={<BadgeCheck className="size-4 text-jade" />} />
            <dl className="border-t border-line px-5 py-1">
              {p.record.map(([label, value, mono]) => (
                <DataRow key={label} label={label}>
                  <span className={mono ? "font-mono tnum" : undefined}>{value}</span>
                </DataRow>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
              <Lock className="size-3.5" /> Who can see your record
            </p>
            <ul className="mt-3 space-y-2.5">
              {p.privacy.map((line) => (
                <li key={line} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
