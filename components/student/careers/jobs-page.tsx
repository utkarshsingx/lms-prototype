"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Check,
  ChevronDown,
  GraduationCap,
  MapPin,
  Search,
  Send,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  applicationsForStudent,
  companyReadinessFor,
  formatAccaDate,
  opportunityById,
  papersCleared,
  resumeForStudent,
  type Application,
  type Opportunity,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { DEMO_TODAY, useStudentRecord } from "@/components/student/help/shared";
import { PIPELINE, eligibilityFor, openOpportunities, stageLabel } from "./career-data";

type TabId = "job" | "internship" | "applications";

function rulesFor(s: Student, opp: Opportunity) {
  const e = opp.eligibility;
  const cleared = papersCleared(s);
  const crs = s.career.companyReadiness ?? 0;
  const ats = s.career.atsScore ?? 0;
  const isCleared = (p: string) => ["passed", "exempt"].includes(s.papers[p as keyof Student["papers"]]?.status ?? "");
  return [
    { label: `Open to ${e.studentTypes.map((t) => (t === "graduate" ? "graduates" : "undergraduates")).join(" and ")}`, met: e.studentTypes.includes(s.type), you: s.type === "graduate" ? "You are a graduate learner" : "You are an undergraduate" },
    ...(e.placementEligibleOnly ? [{ label: "Placement-eligible learners only", met: s.career.placementEligible, you: s.career.placementEligible ? "You are placement-eligible" : "Not yet placement-eligible" }] : []),
    { label: `At least ${e.minPapersCleared} papers passed or exempt`, met: cleared >= e.minPapersCleared, you: `You have ${cleared}` },
    ...e.requiredPapers.map((p) => ({ label: `${p} passed or exempt`, met: isCleared(p), you: isCleared(p) ? `${p} cleared` : `${p} not cleared yet` })),
    { label: `Company Readiness Score ${e.minCompanyReadiness} or above`, met: crs >= e.minCompanyReadiness, you: `Yours is ${crs}` },
    { label: `ATS score ${e.minAts} or above`, met: ats >= e.minAts, you: `Yours is ${ats}` },
  ];
}

export function JobsPage() {
  const s = useStudentRecord();
  return <JobsView key={s.id} s={s} />;
}

function JobsView({ s }: { s: Student }) {
  const undergrad = s.type === "undergraduate";
  const resume = resumeForStudent(s.id);
  const cr = companyReadinessFor(s.id);
  const [apps, setApps] = useState<Application[]>(() => applicationsForStudent(s.id));
  const [tab, setTab] = useState<TabId>(undergrad ? "internship" : "job");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [applyKey, setApplyKey] = useState(0);

  const all = useMemo(() => openOpportunities().map((o) => ({ opp: o, elig: eligibilityFor(s, o) })), [s]);
  const jobs = all.filter((x) => x.opp.kind === "job");
  const internships = all.filter((x) => x.opp.kind === "internship");
  const list = tab === "internship" ? internships : jobs;
  const visible = list
    .filter(
      ({ opp, elig }) =>
        (!location || opp.location === location) &&
        (!workMode || opp.workMode === workMode) &&
        (!eligibleOnly || elig.eligible) &&
        (!query.trim() ||
          `${opp.title} ${opp.company} ${opp.skills.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())),
    )
    .sort((a, b) => Number(b.elig.eligible) - Number(a.elig.eligible) || a.opp.closesOn.localeCompare(b.opp.closesOn));
  const applying = applyId ? opportunityById(applyId) : undefined;
  const eligibleCount = all.filter((x) => x.elig.eligible).length;
  const filtersActive = Boolean(location || workMode || eligibleOnly || query);

  function submitApplication(data: FormData) {
    if (!applying) return;
    const app: Application = {
      id: `ap-new-${apps.length + 1}`,
      opportunityId: applying.id,
      studentId: s.id,
      stage: "applied",
      appliedOn: DEMO_TODAY,
      updated: DEMO_TODAY,
      matchScore: Math.min(97, (cr?.score ?? 50) + 10),
    };
    setApps((a) => [app, ...a]);
    toast({
      title: `Application sent to ${applying.company}`,
      body: `${applying.title} · ${String(data.get("resume"))} · status Applied`,
    });
    setApplyId(null);
  }

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Career"
        title="Jobs and internships"
        sub="Roles from employers who hire ACCA learners. Each one shows whether you meet its rules today, and what you still need if you do not."
        badge={
          <ScopeChip icon={undergrad ? <GraduationCap /> : <Briefcase />}>
            {undergrad
              ? "Semester 3 · internships open to you"
              : s.career.placementEligible
                ? "Placement-eligible · jobs and internships"
                : "Internships open to you"}
          </ScopeChip>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => toast({ title: "Job alerts on", body: `New ${undergrad ? "internships" : "roles"} that match your eligibility, by email every Monday`, tone: "info" })}>
              Set job alerts
            </Button>
            <Button onClick={() => setTab("applications")}>
              <Send className="size-4" /> My applications
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label={undergrad ? "Internships open to you" : "Roles you can apply for"} value={eligibleCount} icon={<Briefcase />} sub={`of ${all.length} open`} />
        <KpiTile label="Applications" value={apps.length} tone="info" icon={<Send />} sub={apps.length ? stageLabel(apps[0]) : "None yet"} />
        <KpiTile label="Company Readiness Score" value={cr?.score ?? "Not scored"} tone={(cr?.score ?? 0) >= 55 ? "jade" : "amber"} sub={cr?.band} href="/careers" />
        <KpiTile label="ATS score" value={resume?.atsScore ?? "Not scored"} tone={(resume?.atsScore ?? 0) >= 60 ? "jade" : "amber"} sub={resume ? `Resume ${resume.version}` : undefined} href="/careers/resume" />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        items={[
          { id: "job", label: "Jobs", count: jobs.length },
          { id: "internship", label: "Internships", count: internships.length },
          { id: "applications", label: "My applications", count: apps.length },
        ]}
      />

      {tab !== "applications" ? (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full min-w-0 lg:w-72">
              <Input icon={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search role, company or skill" aria-label="Search roles" />
            </div>
            <FilterBar
              active={filtersActive}
              onClear={() => {
                setLocation("");
                setWorkMode("");
                setEligibleOnly("");
                setQuery("");
              }}
            >
              <FilterSelect label="Location" allLabel="Any" value={location} onChange={setLocation} options={Array.from(new Set(list.map((x) => x.opp.location))).sort()} />
              <FilterSelect label="Work mode" allLabel="Any" value={workMode} onChange={setWorkMode} options={Array.from(new Set(list.map((x) => x.opp.workMode))).sort()} />
              <FilterSelect label="Eligibility" allLabel="All roles" value={eligibleOnly} onChange={setEligibleOnly} options={[{ value: "yes", label: "Eligible only" }]} />
            </FilterBar>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={<Briefcase />} title="No roles match" sub="Try another location or show all roles, including ones you are not yet eligible for." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map(({ opp, elig }) => {
                const applied = apps.find((a) => a.opportunityId === opp.id);
                const open = expanded === opp.id;
                return (
                  <Card key={opp.id} className={cn("flex min-w-0 flex-col p-4 sm:p-5", applied && "border-line-strong")}>
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-inv font-display text-[14px] font-bold text-cta">
                        {opp.company.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15.5px] leading-snug font-bold text-ink">{opp.title}</h3>
                        <p className="truncate text-[13px] text-ink-2">{opp.company}</p>
                      </div>
                      <span className="flex max-w-[45%] min-w-0 justify-end">
                        {applied ? (
                          <StatusPill status={applied.stage}>{stageLabel(applied)}</StatusPill>
                        ) : (
                          <StatusPill status={elig.eligible ? "eligible" : "pending"} tone={elig.eligible ? "jade" : "amber"}>
                            {elig.label}
                          </StatusPill>
                        )}
                      </span>
                    </div>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" /> {opp.location} · {opp.workMode}
                      </span>
                      <span className="inline-flex items-center gap-1 tnum">
                        <Wallet className="size-3.5" /> {opp.compensation}
                      </span>
                      <span className="inline-flex items-center gap-1 tnum">
                        <Users className="size-3.5" /> {opp.openings} openings
                      </span>
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{opp.description}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {opp.skills.map((sk) => (
                        <span key={sk} className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
                          {sk}
                        </span>
                      ))}
                    </div>

                    {open ? (
                      <div className="mt-3.5 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
                        <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Eligibility rules</p>
                        <ul className="mt-2 space-y-1.5">
                          {rulesFor(s, opp).map((r) => (
                            <li key={r.label} className="flex items-start gap-2 text-[12.5px]">
                              {r.met ? <Check className="mt-0.5 size-3.5 shrink-0 text-jade" /> : <X className="mt-0.5 size-3.5 shrink-0 text-rose" />}
                              <span className="min-w-0">
                                <span className="font-semibold text-ink">{r.label}</span>
                                <span className="text-ink-3"> · {r.you}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                        {opp.eligibility.note ? <p className="mt-2 text-[12px] text-ink-3">Employer note: {opp.eligibility.note}</p> : null}
                      </div>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                      <p className="text-[12px] text-ink-3 tnum">Closes {formatAccaDate(opp.closesOn)}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setExpanded(open ? null : opp.id)}>
                          Eligibility <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                        </Button>
                        {applied ? (
                          <Button size="sm" variant="outline" onClick={() => setTab("applications")}>
                            Track application
                          </Button>
                        ) : (
                          <span title={elig.eligible ? undefined : `Not eligible yet: ${elig.reasons.join(", ")}`} className="inline-flex">
                            <Button
                              size="sm"
                              disabled={!elig.eligible}
                              onClick={() => {
                                setApplyKey((k) => k + 1);
                                setApplyId(opp.id);
                              }}
                            >
                              Apply
                            </Button>
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <Card className="min-w-0">
          <CardHeader title="Application status" sub="Updated by the placement team as employers respond" />
          {apps.length === 0 ? (
            <div className="border-t border-line p-5">
              <EmptyState icon={<Send />} title="No applications yet" sub="Apply to a role you are eligible for and track it here." />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {apps.map((a) => {
                const opp = opportunityById(a.opportunityId);
                const reached = PIPELINE.findIndex((st) => st.id === a.stage);
                return (
                  <li key={a.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-bold text-ink">{opp?.title}</p>
                        <p className="text-[12.5px] text-ink-3">
                          {opp?.company} · {opp?.location} · applied {formatAccaDate(a.appliedOn)}
                        </p>
                      </div>
                      <StatusPill status={a.stage}>{stageLabel(a)}</StatusPill>
                    </div>
                    <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Placement stages">
                      {PIPELINE.map((st, i) => (
                        <li key={st.id} className="min-w-0">
                          <span className={cn("block h-1.5 rounded-full", a.stage === "rejected" ? "bg-rose-soft" : i <= reached ? "bg-cta" : "bg-surface-3")} />
                          <span className={cn("mt-1 block truncate text-[11px]", i === reached ? "font-bold text-ink" : "text-ink-3")}>{st.label}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12.5px] text-ink-2">
                        {a.stage === "applied"
                          ? "The placement team reviews new applications within five working days."
                          : a.interview
                            ? `${a.interview.round} · ${a.interview.mode} · ${a.interview.panel}`
                            : a.recruiterFeedback ?? "The employer has your profile."}
                      </p>
                      {a.stage === "applied" ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setApps((list) => list.filter((x) => x.id !== a.id));
                            toast({ title: "Application withdrawn", body: `${opp?.title} · ${opp?.company}`, tone: "neutral" });
                          }}
                        >
                          Withdraw
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-line px-5 py-3 text-[12px] text-ink-3">
            Interviews scheduled by employers also appear in{" "}
            <Link href="/notifications" className="font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
              Notifications
            </Link>
            .
          </p>
        </Card>
      )}

      <FormDrawer
        open={applying !== undefined}
        onClose={() => setApplyId(null)}
        title={applying ? `Apply: ${applying.title}` : "Apply"}
        sub={applying ? `${applying.company} · ${applying.location} · closes ${formatAccaDate(applying.closesOn)}` : undefined}
        submitLabel="Send application"
        footerNote="The placement team forwards it to the employer"
        onSubmit={submitApplication}
      >
        <Field label="Resume version">
          <Select name="resume" key={`resume-${applyKey}`} defaultValue={`Resume ${resume?.version ?? "v1"}`}>
            <option value={`Resume ${resume?.version ?? "v1"}`}>
              Resume {resume?.version ?? "v1"} · ATS {resume?.atsScore ?? "not scored"} · updated {formatAccaDate(resume?.updated ?? DEMO_TODAY)}
            </option>
            <option value="Latest draft from the resume builder">Latest draft from the resume builder</option>
          </Select>
        </Field>
        <Field label="Note to the employer" hint="Optional">
          <Textarea
            name="note"
            rows={4}
            key={`note-${applyKey}`}
            placeholder={undergrad ? "Why this internship, and the dates you are available" : "Why this role, and where you are on your ACCA journey"}
          />
        </Field>
        <Field label={applying?.kind === "internship" ? "Availability" : "Notice period"}>
          <Select name="availability" key={`avail-${applyKey}`} defaultValue={applying?.kind === "internship" ? "As listed" : "30 days"}>
            {applying?.kind === "internship" ? (
              <>
                <option>As listed</option>
                <option>After university examinations end on 12 Dec</option>
                <option>May to June 2027</option>
              </>
            ) : (
              <>
                <option>Immediate</option>
                <option>30 days</option>
                <option>60 days</option>
              </>
            )}
          </Select>
        </Field>
        <Checkbox name="shareScore" defaultChecked key={`share-${applyKey}`} label={`Share my Company Readiness Score (${cr?.score ?? "not scored"}) and ACCA progress with the employer`} />
        <FileDrop key={`files-${applyKey}`} label="Attach a cover letter" accept=".pdf,.docx" hint="Optional. PDF or Word, up to 5 MB." />
      </FormDrawer>
    </div>
  );
}
