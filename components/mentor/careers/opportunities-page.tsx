"use client";

import { useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  GraduationCap,
  ListChecks,
  MapPin,
  Plus,
  Send,
  UserPlus,
} from "lucide-react";
import {
  PAPER_CODES,
  addDays,
  formatAccaDate,
  papersCleared,
  staffName,
  type PaperCode,
  type Student,
  type StudentType,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ScoreBar } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { checkEligibility, matchScore, type EligibilityResult } from "./eligibility";
import { CareerBadges, Guard, READ_ONLY_REASON, ReadOnlyNotice, useCareerScope, type CareerScope } from "./scope";
import { CITIES, Fact, MiniLabel, SECTION, SKILL_OPTIONS, StudentCell, stageLabel, typeLabel } from "./shared";
import { TODAY, updateCareers, useCareers, type CareerApplication, type CareerOpportunity, type CareersState } from "./store";

type Kind = CareerOpportunity["kind"];

type MatchRow = {
  id: string;
  student: Student;
  result: EligibilityResult;
  score: number;
  crs: number | null;
  ats: number | null;
  application?: CareerApplication;
};

const STAGE_RANK: Record<string, number> = { applied: 0, shortlisted: 1, interview: 2, offer: 3, joined: 4, rejected: 5 };

function matchRows(opp: CareerOpportunity, scope: CareerScope, store: CareersState): MatchRow[] {
  return scope.students.map((s) => {
    const profile = store.profiles.find((p) => p.studentId === s.id);
    const crs = store.readiness.find((c) => c.studentId === s.id)?.score ?? s.career.companyReadiness;
    const ats = store.resumes.find((r) => r.studentId === s.id)?.atsScore ?? s.career.atsScore;
    const ctx = { crs, ats, profile };
    const application = store.applications.find((a) => a.opportunityId === opp.id && a.studentId === s.id);
    return {
      id: s.id,
      student: s,
      result: checkEligibility(s, opp, ctx),
      score: application?.matchScore ?? matchScore(s, opp, ctx),
      crs,
      ats,
      application,
    };
  });
}

/* Eligibility form fields are shared by the publish drawer and the Define eligibility tab. */
function readRules(form: FormData, base: CareerOpportunity): CareerOpportunity {
  const types = form.getAll("types").map(String) as StudentType[];
  return {
    ...base,
    minReadiness: Number(form.get("minReadiness") ?? 0),
    locationRule: form.get("locationRule") === "preferred" ? "preferred" : "any",
    eligibility: {
      studentTypes: types.length ? types : base.eligibility.studentTypes,
      minPapersCleared: Number(form.get("minPapers") ?? 0),
      requiredPapers: form.getAll("required").map(String) as PaperCode[],
      minCompanyReadiness: Number(form.get("minCrs") ?? 0),
      minAts: Number(form.get("minAts") ?? 0),
      placementEligibleOnly: form.get("placementOnly") === "on",
      note: String(form.get("note") ?? "").trim() || base.eligibility.note,
    },
  };
}

function countEligible(opp: CareerOpportunity, scope: CareerScope, store: CareersState) {
  return matchRows(opp, scope, store).filter((r) => r.result.eligible).length;
}

function EligibilityFields({ opp, disabled }: { opp: CareerOpportunity; disabled: boolean }) {
  const e = opp.eligibility;
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Student type</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Checkbox name="types" value="graduate" defaultChecked={e.studentTypes.includes("graduate")} label="Graduate ACCA learners" />
          <Checkbox name="types" value="undergraduate" defaultChecked={e.studentTypes.includes("undergraduate")} label="University undergraduates" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Papers passed or exempt, at least">
          <Select name="minPapers" defaultValue={String(e.minPapersCleared)}>
            {Array.from({ length: 14 }, (_, n) => (
              <option key={n} value={n}>
                {n === 0 ? "No minimum" : `${n} of 13`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Readiness score, at least">
          <Select name="minReadiness" defaultValue={String(opp.minReadiness)}>
            {[0, 45, 50, 55, 60, 65, 70].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "No minimum" : n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Company Readiness Score, at least">
          <Select name="minCrs" defaultValue={String(e.minCompanyReadiness)}>
            {[0, 40, 45, 50, 55, 60, 65, 70, 75].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "No minimum" : n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ATS score, at least">
          <Select name="minAts" defaultValue={String(e.minAts)}>
            {[0, 45, 50, 55, 58, 60, 62, 65, 70].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "No minimum" : n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location" hint={`Job location: ${opp.location || "set above"}`}>
          <Select name="locationRule" defaultValue={opp.locationRule}>
            <option value="any">Any location</option>
            <option value="preferred">Learner prefers the job location</option>
          </Select>
        </Field>
        <Field label="Eligibility note" hint="Shown to students">
          <Input name="note" defaultValue={e.note} placeholder="e.g. FR passed or current" />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Required papers (passed or exempt)</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PAPER_CODES.map((code) => (
            <Checkbox key={code} name="required" value={code} defaultChecked={e.requiredPapers.includes(code)} label={code} />
          ))}
        </div>
      </div>
      <Checkbox name="placementOnly" defaultChecked={e.placementEligibleOnly} label="Placement-eligible learners only" />
    </fieldset>
  );
}

function rulesSummary(opp: CareerOpportunity) {
  const e = opp.eligibility;
  return [
    e.studentTypes.map((t) => (t === "graduate" ? "Graduate" : "Undergraduate")).join(" or "),
    e.minPapersCleared ? `${e.minPapersCleared}+ papers passed` : null,
    e.requiredPapers.length ? `${e.requiredPapers.join(", ")} required` : null,
    opp.minReadiness ? `Readiness ${opp.minReadiness}+` : null,
    e.minCompanyReadiness ? `Company Readiness ${e.minCompanyReadiness}+` : null,
    e.minAts ? `ATS ${e.minAts}+` : null,
    opp.locationRule === "preferred" ? `Prefers ${opp.location}` : "Any location",
    e.placementEligibleOnly ? "Placement-eligible only" : null,
  ].filter(Boolean) as string[];
}

export function OpportunitiesPage() {
  const scope = useCareerScope();
  const store = useCareers();
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("op-01");
  const [detailTab, setDetailTab] = useState("match");
  const [publish, setPublish] = useState<Kind | null>(null);

  const list = store.opportunities
    .filter((o) => (kind === "all" || o.kind === kind) && (!status || o.status === status))
    .sort((a, b) => (a.status === b.status ? b.postedOn.localeCompare(a.postedOn) : a.status === "open" ? -1 : b.status === "open" ? 1 : a.status === "draft" ? -1 : 1));
  const selected = store.opportunities.find((o) => o.id === selectedId) ?? list[0];

  const scopedApps = store.applications.filter((a) => scope.ids.has(a.studentId));
  const openJobs = store.opportunities.filter((o) => o.kind === "job" && o.status === "open");
  const openInternships = store.opportunities.filter((o) => o.kind === "internship" && o.status === "open");
  const shortlisted = scopedApps.filter((a) => a.shortlistedBy && a.stage !== "applied").length;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow={SECTION}
        title="Jobs & internships"
        sub="Publish internships and jobs with eligibility rules, match eligible students from your scope and shortlist them into the placement pipeline."
        badge={<CareerBadges scope={scope} />}
        actions={
          <Button variant="secondary" onClick={() => toast({ title: "Report queued: jobs-and-internships.csv", tone: "info" })}>
            <Download className="size-4" />
            Export
          </Button>
        }
      />

      <ReadOnlyNotice scope={scope} what="Jobs, internships and shortlists" />

      <KpiRow cols={4}>
        <KpiTile hero label="Open jobs" value={openJobs.length} icon={<BriefcaseBusiness />} sub={`${openJobs.reduce((n, o) => n + o.openings, 0)} openings`} />
        <KpiTile label="Open internships" value={openInternships.length} tone="info" icon={<GraduationCap />} sub={`${openInternships.reduce((n, o) => n + o.openings, 0)} places`} />
        <KpiTile label="Applications from your scope" value={scopedApps.length} tone="neutral" icon={<Send />} sub={`${scopedApps.filter((a) => a.stage === "applied").length} awaiting shortlist`} />
        <KpiTile label="Shortlisted by the career team" value={shortlisted} tone="jade" icon={<ListChecks />} sub="Shortlisted or further in the pipeline" />
      </KpiRow>

      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            { id: "job", title: "Publish jobs", sub: "Full-time roles for placement-eligible learners, with eligibility rules and a closing date.", button: "Publish job", icon: BriefcaseBusiness },
            { id: "internship", title: "Publish internships", sub: "Winter and summer internships. Open to undergraduates when the eligibility rules allow.", button: "Publish internship", icon: GraduationCap },
          ] as const
        ).map((p) => (
          <Card key={p.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-inv text-cta">
                <p.icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-[17px] leading-tight font-bold text-ink">{p.title}</h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{p.sub}</p>
              </div>
            </div>
            <Guard allowed={scope.canEdit}>
              <Button variant={p.id === "job" ? "primary" : "secondary"} disabled={!scope.canEdit} onClick={() => setPublish(p.id)}>
                <Plus className="size-4" />
                {p.button}
              </Button>
            </Guard>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <div className="space-y-3 px-4 pt-4 pb-3">
            <Segmented
              size="sm"
              value={kind}
              onChange={(v) => setKind(v as "all" | Kind)}
              items={[
                { id: "all", label: "All" },
                { id: "job", label: "Jobs" },
                { id: "internship", label: "Internships" },
              ]}
            />
            <FilterSelect
              label="Status"
              allLabel="Any status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "open", label: "Open" },
                { value: "draft", label: "Draft" },
                { value: "closed", label: "Closed" },
              ]}
            />
          </div>
          <ul className="scrollbar-slim max-h-[44rem] space-y-1.5 overflow-y-auto px-3 pb-3">
            {list.length === 0 ? (
              <li className="rounded-[12px] border border-dashed border-line-strong px-3 py-6 text-center text-[12.5px] text-ink-3">No opportunities with these filters</li>
            ) : (
              list.map((o) => {
                const on = o.id === selected?.id;
                const apps = store.applications.filter((a) => a.opportunityId === o.id && scope.ids.has(a.studentId)).length;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelectedId(o.id)}
                      className={cn(
                        "w-full min-w-0 rounded-[12px] border px-3 py-2.5 text-left transition-colors",
                        on ? "border-cta bg-cta-soft" : "border-transparent hover:bg-surface-2",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">{o.title}</span>
                          <span className="block truncate text-[12px] text-ink-3">{o.company}</span>
                        </span>
                        <StatusPill status={o.status} size="sm" dot={false} />
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-3">
                        <Badge tone={o.kind === "job" ? "dark" : "info"}>{o.kind === "job" ? "Job" : "Internship"}</Badge>
                        <span>{o.location}</span>
                        <span>·</span>
                        <span className="tnum">Closes {formatAccaDate(o.closesOn)}</span>
                        <span>·</span>
                        <span className="tnum">{apps} from your scope</span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </Card>

        {selected ? (
          <OpportunityDetail key={selected.id} opp={selected} scope={scope} store={store} tab={detailTab} onTab={setDetailTab} />
        ) : (
          <EmptyState title="No opportunity selected" sub="Publish a job or an internship to start matching students." />
        )}
      </div>

      <PublishDrawer
        kind={publish}
        scope={scope}
        store={store}
        onClose={() => setPublish(null)}
        onPublished={(id) => {
          setSelectedId(id);
          setDetailTab("match");
          setStatus("");
          setKind("all");
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ detail */

function OpportunityDetail({
  opp,
  scope,
  store,
  tab,
  onTab,
}: {
  opp: CareerOpportunity;
  scope: CareerScope;
  store: CareersState;
  tab: string;
  onTab: (id: string) => void;
}) {
  const rows = useMemo(() => matchRows(opp, scope, store), [opp, scope, store]);
  const eligible = rows.filter((r) => r.result.eligible);
  const pipeline = rows.filter((r) => r.application);

  const setStatus = (status: CareerOpportunity["status"]) => {
    updateCareers((st) => ({ opportunities: st.opportunities.map((o) => (o.id === opp.id ? { ...o, status, postedOn: status === "open" && o.status === "draft" ? TODAY : o.postedOn } : o)) }));
    toast({
      title: status === "open" ? (opp.status === "draft" ? `${opp.kind === "job" ? "Job" : "Internship"} published` : "Opportunity reopened") : "Opportunity closed",
      body: `${opp.title} · ${opp.company}${status === "open" ? ` · visible to ${eligible.length} eligible learners in your scope` : ""}`,
      tone: status === "closed" ? "neutral" : "success",
    });
  };

  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4.5 pb-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={opp.kind === "job" ? "dark" : "info"}>{opp.kind === "job" ? "Job" : "Internship"}</Badge>
            <StatusPill status={opp.status} size="sm" />
          </div>
          <h2 className="mt-2 font-display text-[22px] leading-tight tracking-[var(--display-tracking)] text-ink">{opp.title}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
            <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-3" />
            <span className="min-w-0 truncate">
              {opp.company} · {opp.location} · {opp.workMode}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {opp.status === "draft" ? (
            <Guard allowed={scope.canEdit}>
              <Button size="sm" disabled={!scope.canEdit} onClick={() => setStatus("open")}>
                <Send className="size-3.5" />
                {opp.kind === "job" ? "Publish job" : "Publish internship"}
              </Button>
            </Guard>
          ) : opp.status === "open" ? (
            <Guard allowed={scope.canEdit}>
              <Button size="sm" variant="outline" disabled={!scope.canEdit} onClick={() => setStatus("closed")}>
                Close opportunity
              </Button>
            </Guard>
          ) : (
            <Guard allowed={scope.canEdit}>
              <Button size="sm" variant="outline" disabled={!scope.canEdit} onClick={() => setStatus("open")}>
                Reopen
              </Button>
            </Guard>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line px-5 py-4 sm:grid-cols-3 xl:grid-cols-6">
        <Fact label="Compensation">{opp.compensation}</Fact>
        <Fact label="Openings">{opp.openings}</Fact>
        <Fact label="Posted">{formatAccaDate(opp.postedOn)}</Fact>
        <Fact label="Closes">{formatAccaDate(opp.closesOn)}</Fact>
        <Fact label="Posted by">{staffName(opp.postedBy)}</Fact>
        <Fact label="Eligible in scope">{`${eligible.length} of ${rows.length}`}</Fact>
      </dl>
      <div className="border-t border-line px-5 py-4">
        <p className="text-[13.5px] leading-relaxed text-ink-2">{opp.description}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {opp.skills.map((k) => (
            <Badge key={k}>{k}</Badge>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-5 pt-3">
        <Tabs
          value={tab}
          onChange={onTab}
          items={[
            { id: "match", label: "Match eligible students", count: eligible.length },
            { id: "rules", label: "Define eligibility" },
            { id: "shortlist", label: "Shortlist students", count: pipeline.filter((r) => r.application!.stage !== "applied").length },
          ]}
        />
      </div>
      <div className="p-5">
        {tab === "match" ? <MatchTab opp={opp} rows={rows} scope={scope} /> : null}
        {tab === "rules" ? <RulesTab opp={opp} scope={scope} store={store} /> : null}
        {tab === "shortlist" ? <ShortlistTab opp={opp} rows={pipeline} scope={scope} /> : null}
      </div>
    </Card>
  );
}

function shortlist(opp: CareerOpportunity, rows: MatchRow[], ids: string[], scope: CareerScope) {
  const picked = rows.filter((r) => ids.includes(r.id));
  const eligible = picked.filter((r) => r.result.eligible);
  const skipped = picked.length - eligible.length;
  const fresh = eligible.filter((r) => !r.application || r.application.stage === "applied");
  if (fresh.length === 0) {
    toast({
      title: "Nobody new to shortlist",
      body: skipped ? `${skipped} selected ${skipped === 1 ? "learner does" : "learners do"} not meet the eligibility rules.` : "The selected learners are already shortlisted or further along.",
      tone: "warning",
    });
    return;
  }
  updateCareers((st) => {
    let n = st.applications.length;
    const next = st.applications.map((a) =>
      a.opportunityId === opp.id && fresh.some((r) => r.id === a.studentId) && a.stage === "applied"
        ? { ...a, stage: "shortlisted" as const, shortlistedBy: scope.staffId, updated: TODAY }
        : a,
    );
    for (const r of fresh) {
      if (r.application) continue;
      n += 1;
      next.push({
        id: `ap-${String(n).padStart(3, "0")}`,
        opportunityId: opp.id,
        studentId: r.id,
        stage: "shortlisted",
        appliedOn: TODAY,
        updated: TODAY,
        matchScore: r.score,
        shortlistedBy: scope.staffId,
      });
    }
    return { applications: next };
  });
  toast({
    title: `${fresh.length} ${fresh.length === 1 ? "student" : "students"} shortlisted`,
    body: `${opp.title} · ${opp.company}. Added to the Placement pipeline in Shortlisted.${skipped ? ` ${skipped} not eligible, skipped.` : ""}`,
  });
}

function MatchTab({ opp, rows, scope }: { opp: CareerOpportunity; rows: MatchRow[]; scope: CareerScope }) {
  const [view, setView] = useState("eligible");
  const visible = view === "eligible" ? rows.filter((r) => r.result.eligible) : rows;
  const open = opp.status === "open";
  const canShortlist = scope.canEdit && open;
  const reason = !scope.canEdit ? READ_ONLY_REASON : "Publish or reopen the opportunity before shortlisting.";

  const columns: DataTableColumn<MatchRow>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => <StudentCell student={r.student} sub={`${typeLabel(r.student.type)} · ${r.student.city}`} />,
    },
    {
      key: "score",
      header: "Match score",
      sortable: true,
      sortValue: (r) => r.score,
      render: (r) => <ScoreBar value={r.score} className="w-24" height={6} />,
    },
    {
      key: "eligibility",
      header: "Eligibility",
      sortable: true,
      sortValue: (r) => (r.result.eligible ? 1 : 0),
      render: (r) =>
        r.result.eligible ? (
          <StatusPill status="Eligible" tone="jade" size="sm" />
        ) : (
          <span className="flex items-center gap-1" title={r.result.reasons.join(" · ")}>
            <StatusPill status="Not eligible" tone="rose" size="sm">
              {r.result.reasons[0]}
            </StatusPill>
            {r.result.reasons.length > 1 ? <span className="text-[11.5px] text-ink-3">+{r.result.reasons.length - 1}</span> : null}
          </span>
        ),
    },
    { key: "papers", header: "Papers passed", align: "right", mono: true, sortable: true, sortValue: (r) => papersCleared(r.student), render: (r) => `${papersCleared(r.student)}/13` },
    { key: "readiness", header: "Readiness", align: "right", mono: true, sortable: true, sortValue: (r) => r.student.readiness.overall, render: (r) => r.student.readiness.overall },
    { key: "crs", header: "Company Readiness", align: "right", mono: true, sortable: true, sortValue: (r) => r.crs ?? -1, render: (r) => r.crs ?? "Not scored" },
    { key: "ats", header: "ATS", align: "right", mono: true, sortable: true, sortValue: (r) => r.ats ?? -1, render: (r) => r.ats ?? "No resume" },
    {
      key: "pipeline",
      header: "Pipeline",
      sortable: true,
      sortValue: (r) => (r.application ? STAGE_RANK[r.application.stage] : -1),
      render: (r) => (r.application ? <StatusPill status={r.application.stage} size="sm">{stageLabel(r.application.stage)}</StatusPill> : <span className="text-ink-3">Not applied</span>),
    },
    {
      key: "action",
      header: <span className="sr-only">Shortlist</span>,
      align: "right",
      render: (r) => {
        const done = r.application && r.application.stage !== "applied";
        return done ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-jade">
            <CheckCircle2 aria-hidden className="size-3.5" />
            {r.application!.stage === "rejected" ? "Closed" : "Shortlisted"}
          </span>
        ) : (
          <Guard allowed={canShortlist && r.result.eligible} reason={r.result.eligible ? reason : r.result.reasons.join(" · ")}>
            <Button size="xs" variant="outline" disabled={!canShortlist || !r.result.eligible} onClick={() => shortlist(opp, rows, [r.id], scope)}>
              <UserPlus className="size-3.5" />
              Shortlist
            </Button>
          </Guard>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-ink-3">
        Matched against {rulesSummary(opp).join(" · ")}. Match score weighs Company Readiness Score, ATS score, readiness score, papers, skills and location.
      </p>
      <DataTable
        bare
        caption={`Students matched to ${opp.title}`}
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        pageSize={8}
        initialSort={{ key: "score", dir: "desc" }}
        rowClassName={(r) => (r.result.eligible ? undefined : "opacity-70")}
        search={{ placeholder: "Search learner or city", match: (r, q) => r.student.name.toLowerCase().includes(q) || r.student.city.toLowerCase().includes(q) }}
        filters={
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            items={[
              { id: "eligible", label: `Eligible · ${rows.filter((r) => r.result.eligible).length}` },
              { id: "all", label: `All in scope · ${rows.length}` },
            ]}
          />
        }
        selectable={canShortlist}
        bulkActions={(ids, clear) => (
          <Button
            size="sm"
            onClick={() => {
              shortlist(opp, rows, ids, scope);
              clear();
            }}
          >
            <UserPlus className="size-3.5" />
            Shortlist students
          </Button>
        )}
        empty={<EmptyState title="No eligible students in your scope" sub="Loosen the rules in Define eligibility, or view everyone in scope." />}
      />
    </div>
  );
}

function RulesTab({ opp, scope, store }: { opp: CareerOpportunity; scope: CareerScope; store: CareersState }) {
  const [preview, setPreview] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const current = countEligible(opp, scope, store);

  const recompute = () => {
    if (formRef.current) setPreview(countEligible(readRules(new FormData(formRef.current), opp), scope, store));
  };

  return (
    <form
      ref={formRef}
      key={version}
      onChange={recompute}
      onSubmit={(e) => {
        e.preventDefault();
        if (!scope.canEdit) return;
        const next = readRules(new FormData(e.currentTarget), opp);
        const count = countEligible(next, scope, store);
        updateCareers((st) => ({ opportunities: st.opportunities.map((o) => (o.id === opp.id ? next : o)) }));
        toast({ title: "Eligibility saved", body: `${opp.title} · ${count} of ${scope.students.length} learners in your scope now match` });
        setPreview(null);
      }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-surface-2 px-4 py-3">
        <div className="min-w-0">
          <MiniLabel>Current rules</MiniLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {rulesSummary(opp).map((r) => (
              <Badge key={r}>{r}</Badge>
            ))}
          </div>
        </div>
        <p className="shrink-0 text-[13px] text-ink-2 tnum">
          <span className="font-display text-[22px] font-bold text-ink">{preview ?? current}</span> of {scope.students.length} match
          {preview != null && preview !== current ? <span className="text-ink-3"> (now {current})</span> : null}
        </p>
      </div>

      <EligibilityFields opp={opp} disabled={!scope.canEdit} />

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setVersion((v) => v + 1);
            setPreview(null);
          }}
        >
          Reset
        </Button>
        <Guard allowed={scope.canEdit}>
          <Button type="submit" disabled={!scope.canEdit}>
            Save eligibility
          </Button>
        </Guard>
      </div>
    </form>
  );
}

function ShortlistTab({ opp, rows, scope }: { opp: CareerOpportunity; rows: MatchRow[]; scope: CareerScope }) {
  const sorted = [...rows].sort((a, b) => STAGE_RANK[a.application!.stage] - STAGE_RANK[b.application!.stage] || b.score - a.score);
  if (sorted.length === 0) {
    return <EmptyState title="No applications yet" sub="Shortlist eligible students from the Match eligible students tab." />;
  }
  return (
    <ul className="divide-y divide-line rounded-[14px] border border-line">
      {sorted.map((r) => {
        const a = r.application!;
        return (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <StudentCell
                student={r.student}
                sub={`Match ${r.score} · ${a.stage === "applied" ? `applied ${formatAccaDate(a.appliedOn)}` : a.shortlistedBy ? `shortlisted by ${staffName(a.shortlistedBy)}` : `updated ${formatAccaDate(a.updated)}`}`}
              />
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill status={a.stage} size="sm">
                {stageLabel(a.stage)}
              </StatusPill>
              {a.stage === "applied" ? (
                <Guard allowed={scope.canEdit && r.result.eligible} reason={r.result.eligible ? READ_ONLY_REASON : r.result.reasons.join(" · ")}>
                  <Button size="xs" variant="outline" disabled={!scope.canEdit || !r.result.eligible} onClick={() => shortlist(opp, rows, [r.id], scope)}>
                    <UserPlus className="size-3.5" />
                    Shortlist
                  </Button>
                </Guard>
              ) : null}
            </span>
          </li>
        );
      })}
      <li className="px-4 py-2.5 text-[12px] text-ink-3">
        Shortlisted students move through interviews, offers and joining on the Placement pipeline.
      </li>
    </ul>
  );
}

/* ------------------------------------------------------------------ publish */

function blankOpportunity(kind: Kind, id: string, staffId: string): CareerOpportunity {
  return {
    id,
    title: "",
    company: "",
    kind,
    location: "Bengaluru",
    workMode: "Hybrid",
    compensation: "",
    openings: kind === "job" ? 2 : 6,
    postedOn: TODAY,
    closesOn: addDays(TODAY, 30),
    postedBy: staffId,
    status: "open",
    minReadiness: kind === "job" ? 55 : 0,
    locationRule: "any",
    eligibility:
      kind === "job"
        ? { studentTypes: ["graduate"], minPapersCleared: 5, requiredPapers: [], minCompanyReadiness: 55, minAts: 60, placementEligibleOnly: true, note: "Applied Skills in progress" }
        : { studentTypes: ["undergraduate", "graduate"], minPapersCleared: 2, requiredPapers: [], minCompanyReadiness: 40, minAts: 45, placementEligibleOnly: false, note: "Open to Applied Knowledge learners" },
    description: "",
    skills: [],
  };
}

function PublishDrawer({
  kind,
  scope,
  store,
  onClose,
  onPublished,
}: {
  kind: Kind | null;
  scope: CareerScope;
  store: CareersState;
  onClose: () => void;
  onPublished: (id: string) => void;
}) {
  const [preview, setPreview] = useState<{ kind: Kind; n: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const activeKind = kind ?? "job";
  const id = `op-${String(store.opportunities.length + 1).padStart(2, "0")}`;
  const base = blankOpportunity(activeKind, id, scope.staffId);
  const label = activeKind === "job" ? "job" : "internship";

  const build = (form: FormData): CareerOpportunity => {
    const withRules = readRules(form, base);
    return {
      ...withRules,
      title: String(form.get("title") ?? "").trim(),
      company: String(form.get("company") ?? "").trim(),
      location: String(form.get("location") ?? base.location),
      workMode: String(form.get("workMode") ?? base.workMode) as CareerOpportunity["workMode"],
      compensation: String(form.get("compensation") ?? "").trim() || "To be confirmed",
      openings: Math.max(1, Number(form.get("openings") ?? 1)),
      closesOn: String(form.get("closesOn") || base.closesOn),
      status: form.get("status") === "draft" ? "draft" : "open",
      description: String(form.get("description") ?? "").trim(),
      skills: form.getAll("skills").map(String),
    };
  };

  const recompute = () => {
    const form = bodyRef.current?.closest("form");
    if (form) setPreview({ kind: activeKind, n: countEligible(build(new FormData(form)), scope, store) });
  };

  const close = () => {
    setPreview(null);
    onClose();
  };

  const matched = preview && preview.kind === activeKind ? preview.n : countEligible(base, scope, store);

  return (
    <FormDrawer
      open={kind !== null}
      onClose={close}
      title={activeKind === "job" ? "Publish job" : "Publish internship"}
      sub="Define eligibility now: matching and shortlisting use these rules."
      submitLabel={activeKind === "job" ? "Publish job" : "Publish internship"}
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      footerNote={`${matched} of ${scope.students.length} learners in your scope match`}
      width="w-full max-w-xl"
      onSubmit={(data) => {
        const opp = build(data);
        const eligibleCount = countEligible(opp, scope, store);
        updateCareers((st) => ({ opportunities: [opp, ...st.opportunities] }));
        toast({
          title: opp.status === "draft" ? `${activeKind === "job" ? "Job" : "Internship"} saved as draft` : `${activeKind === "job" ? "Job" : "Internship"} published`,
          body: `${opp.title} · ${opp.company} · ${eligibleCount} eligible learners in your scope`,
        });
        onPublished(opp.id);
        close();
      }}
    >
      <div ref={bodyRef} key={activeKind} onChange={recompute} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={activeKind === "job" ? "Job title" : "Internship title"}>
            <Input name="title" required placeholder={activeKind === "job" ? "e.g. Audit associate" : "e.g. Winter audit intern"} />
          </Field>
          <Field label="Company">
            <Input name="company" required placeholder="e.g. Ashgrove Audit Partners" />
          </Field>
          <Field label="Location">
            <Select name="location" defaultValue={base.location}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Work mode">
            <Select name="workMode" defaultValue={base.workMode}>
              <option>On-site</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </Select>
          </Field>
          <Field label={activeKind === "job" ? "CTC band" : "Stipend"}>
            <Input name="compensation" placeholder={activeKind === "job" ? "₹6 to 7.5 LPA" : "₹18,000 per month"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Openings">
              <Input name="openings" type="number" min={1} defaultValue={base.openings} />
            </Field>
            <Field label="Closes on">
              <Input name="closesOn" type="date" min={TODAY} defaultValue={base.closesOn} />
            </Field>
          </div>
        </div>
        <Field label="Description">
          <Textarea name="description" rows={3} placeholder={`What the ${label} involves and who it suits`} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Skills</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SKILL_OPTIONS.slice(0, 10).map((k) => (
              <Checkbox key={k} name="skills" value={k} label={k} />
            ))}
          </div>
        </fieldset>

        <div className="rounded-[16px] border border-line p-4">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <MiniLabel>Define eligibility</MiniLabel>
            <span className="text-[12.5px] text-ink-2 tnum">
              <span className="font-semibold text-ink">{matched}</span> of {scope.students.length} learners in your scope match
            </span>
          </div>
          <EligibilityFields opp={base} disabled={!scope.canEdit} />
        </div>

        <Field label="Visibility">
          <Select name="status" defaultValue="open">
            <option value="open">Publish now to eligible students</option>
            <option value="draft">Save as draft</option>
          </Select>
        </Field>
      </div>
    </FormDrawer>
  );
}
