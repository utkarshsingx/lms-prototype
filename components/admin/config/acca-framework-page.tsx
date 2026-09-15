"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  Download,
  FlaskConical,
  GitBranch,
  Layers,
  Pencil,
  Plus,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  EXAMS_TO_QUALIFY,
  accaPapers,
  bankQuestions,
  curriculumMappingFramework,
  exemptionFeeGBP,
  exemptionRules as seedRules,
  formatAccaDate,
  formatGBP,
  paperByCode,
  staff,
  staffName,
  universities,
  universitySubjects,
  type AccaPaper,
  type ExemptionRule,
  type PaperCode,
  type PaperGroup,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { AdminConfigFrame, BlockHeading, CodeChip, MiniLabel, queueExport } from "./shared";

/* ------------------------------------------------------------ constants */

const DURATIONS: { label: string; mins: number }[] = [
  { label: "2h", mins: 120 },
  { label: "3h", mins: 180 },
  { label: "3h 15m", mins: 195 },
  { label: "4h", mins: 240 },
];

const SESSION_MONTHS = ["March", "June", "September", "December"];

const GROUPS: { group: PaperGroup; note: string }[] = [
  { group: "Applied Knowledge", note: "On-demand CBEs, bookable on any date. 2 hours each." },
  { group: "Applied Skills", note: "LW is an on-demand CBE. PM, TX, FR, AA and FM are session CBEs in March, June, September and December." },
  { group: "Essentials", note: "Strategic Professional Essentials. Both papers are compulsory session CBEs." },
  { group: "Options", note: "Strategic Professional Options. Learners choose two of the four." },
];

const EVIDENCE_OPTIONS = [
  "Degree certificate",
  "All semester mark sheets",
  "Law subject syllabus (for LW)",
  "Course syllabus",
  "Professional body mark sheets",
  "Membership certificate",
  "Photo ID",
];

const SEED_EVIDENCE: Record<string, string[]> = {
  "ex-bcom-in": ["Degree certificate", "All semester mark sheets", "Law subject syllabus (for LW)"],
  "ex-mcom-in": ["Degree certificate", "All semester mark sheets", "Law subject syllabus (for LW)"],
  "ex-bba-fin": ["Degree certificate", "All semester mark sheets", "Course syllabus"],
  "ex-ca-inter": ["Professional body mark sheets"],
  "ex-ca-final": ["Membership certificate", "Professional body mark sheets"],
  "ex-cma-inter": ["Professional body mark sheets"],
  "ex-bsc-other": ["Degree certificate"],
};

const EXEMPTIBLE: PaperCode[] = ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"];
const PAPER_ORDER: PaperCode[] = accaPapers.map((p) => p.code);

type RuleRow = ExemptionRule & { evidence: string[] };

type CoverageLevel = (typeof curriculumMappingFramework.coverageLevels)[number];

const COVERAGE_TONE: Record<string, "jade" | "amber" | "neutral"> = {
  full: "jade",
  partial: "amber",
  "conceptual-only": "neutral",
};

/* ------------------------------------------------------------ page */

export function AccaFrameworkPage() {
  const [tab, setTab] = useState("structure");
  const [papers, setPapers] = useState<AccaPaper[]>(accaPapers);
  const [rules, setRules] = useState<RuleRow[]>(() => seedRules.map((r) => ({ ...r, evidence: SEED_EVIDENCE[r.id] ?? [] })));
  const [frameworkVersion, setFrameworkVersion] = useState(curriculumMappingFramework.version);

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Academic framework"
        title="ACCA framework"
        sub="Manage ACCA paper structure, configure exemption rules and configure the curriculum-mapping framework that every programme and university workspace builds on."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("acca-framework.csv")}>
              <Download className="size-4" />
              Export framework
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: "ACCA framework published",
                  body: "15 papers, 7 exemption rules and the mapping framework are live in every workspace.",
                })
              }
            >
              <UploadCloud className="size-4" />
              Publish to workspaces
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="ACCA papers" value={papers.length} sub={`${EXAMS_TO_QUALIFY} exams to qualify`} icon={<BookOpenCheck />} />
        <KpiTile label="Pass mark" value="50%" sub="Every exam, set by ACCA" tone="jade" icon={<Check />} />
        <KpiTile
          label="Exemption rules"
          value={rules.length}
          sub={`${rules.filter((r) => r.status === "under-review").length} under review`}
          tone="amber"
          icon={<ShieldCheck />}
        />
        <KpiTile label="Mapping framework" value={frameworkVersion} sub={`Updated ${formatAccaDate(curriculumMappingFramework.updated)}`} tone="info" icon={<GitBranch />} />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "structure", label: "ACCA paper structure", count: papers.length },
          { id: "exemptions", label: "Exemption rules", count: rules.length },
          { id: "mapping", label: "Curriculum-mapping framework" },
        ]}
      />

      {tab === "structure" ? <PaperStructure papers={papers} setPapers={setPapers} /> : null}
      {tab === "exemptions" ? <ExemptionRules rules={rules} setRules={setRules} /> : null}
      {tab === "mapping" ? (
        <MappingFramework version={frameworkVersion} onPublish={(v) => setFrameworkVersion(v)} />
      ) : null}
    </AdminConfigFrame>
  );
}

/* ------------------------------------------------------------ paper structure */

function PaperStructure({
  papers,
  setPapers,
}: {
  papers: AccaPaper[];
  setPapers: React.Dispatch<React.SetStateAction<AccaPaper[]>>;
}) {
  const [open, setOpen] = useState<string[]>(["FR"]);
  const [editing, setEditing] = useState<AccaPaper | null>(null);
  const [sessions, setSessions] = useState<Record<string, string[]>>({});
  const [optionsRequired, setOptionsRequired] = useState("2");
  const [confirmOptions, setConfirmOptions] = useState(true);

  const toggle = (code: string) =>
    setOpen((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Manage ACCA paper structure"
        sub="Codes, names, exam format, duration, pass mark and syllabus areas for every paper. Open a paper to see its syllabus areas; edit to change them."
      />

      {GROUPS.map(({ group, note }) => {
        const list = papers.filter((p) => p.group === group);
        return (
          <Card key={group}>
            <CardHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {group}
                  <Badge tone="dark">{list.length} papers</Badge>
                </span>
              }
              sub={note}
            />
            {group === "Options" ? (
              <div className="mx-5 mb-2 grid gap-4 rounded-[16px] border border-cta bg-cta-soft p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">Pick-two rule for options</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-2">
                    Learners must pass {optionsRequired} of the 4 options to complete Strategic Professional.
                  </p>
                  <div className="mt-3 max-w-md">
                    <Switch
                      checked={confirmOptions}
                      onChange={(v) => {
                        setConfirmOptions(v);
                        toast({ title: v ? "Options must be confirmed before booking" : "Options can change after booking", tone: "info" });
                      }}
                      label="Confirm options before the first option exam booking"
                    />
                  </div>
                </div>
                <Field label="Options required" className="w-full md:w-44">
                  <Select
                    value={optionsRequired}
                    onChange={(e) => {
                      setOptionsRequired(e.target.value);
                      toast({ title: `Options rule set to ${e.target.value} of 4` });
                    }}
                  >
                    <option value="2">2 of 4</option>
                    <option value="3">3 of 4</option>
                  </Select>
                </Field>
              </div>
            ) : null}
            <ul className="divide-y divide-line border-t border-line px-5">
              {list.map((p) => {
                const isOpen = open.includes(p.code);
                const months = sessions[p.code] ?? SESSION_MONTHS;
                return (
                  <li key={p.code} className="py-3.5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                      <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
                        <CodeChip>{p.code}</CodeChip>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-ink">{p.name}</p>
                          <p className="mt-0.5 truncate text-[12.5px] text-ink-3">Lead faculty: {staffName(p.leadFacultyId)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill status={p.examFormat} tone={p.examFormat === "on-demand" ? "info" : "violet"} dot={false}>
                          {p.examFormat === "on-demand" ? "On-demand CBE" : "Session CBE"}
                        </StatusPill>
                        <Badge>{p.durationLabel}</Badge>
                        <Badge tone="jade">Pass mark {p.passMark}%</Badge>
                        {p.option ? <Badge tone="cta">Option</Badge> : null}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="xs" variant="ghost" aria-expanded={isOpen} onClick={() => toggle(p.code)}>
                          {p.syllabusAreas.length} syllabus areas
                          <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => setEditing(p)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 space-y-3 rounded-[16px] border border-line bg-surface-2 p-4">
                        <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          {p.syllabusAreas.map((a) => (
                            <li key={a.code} className="flex min-w-0 gap-2.5 text-[13px]">
                              <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line-strong bg-surface font-mono text-[11.5px] font-bold text-ink">
                                {a.code}
                              </span>
                              <span className="min-w-0 pt-0.5 text-ink-2">{a.title}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="grid gap-3 border-t border-line pt-3 text-[12.5px] sm:grid-cols-2">
                          <p className="min-w-0 text-ink-2">
                            <span className="font-semibold text-ink">Exam structure: </span>
                            {p.examStructure}
                          </p>
                          <p className="min-w-0 text-ink-2">
                            <span className="font-semibold text-ink">Exam dates: </span>
                            {p.examFormat === "on-demand" ? "Any date at an ACCA CBE centre" : `Sessions in ${months.join(", ")}`}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <FormDrawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.code} · ${editing.name}` : "Edit paper"}
        sub="Changes apply to every programme structure, roadmap and exam booking form."
        submitLabel="Save paper"
        footerNote="Published to workspaces with the next framework release."
        onSubmit={(data) => {
          if (!editing) return;
          const duration = DURATIONS.find((d) => d.label === String(data.get("duration"))) ?? DURATIONS[0];
          const lines = String(data.get("areas") ?? "")
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          const parsed = lines
            .map((l) => l.match(/^([A-Z])[\s.:·-]+(.+)$/))
            .filter((m): m is RegExpMatchArray => m !== null)
            .map((m) => ({ code: m[1], title: m[2].trim() }));
          const format = String(data.get("format")) === "on-demand" ? "on-demand" : "session";
          const next: AccaPaper = {
            ...editing,
            name: String(data.get("name") ?? editing.name).trim() || editing.name,
            examFormat: format,
            durationLabel: duration.label,
            durationMins: duration.mins,
            leadFacultyId: String(data.get("lead") ?? editing.leadFacultyId),
            examStructure: String(data.get("structure") ?? editing.examStructure).trim() || editing.examStructure,
            syllabusAreas: parsed.length ? parsed : editing.syllabusAreas,
          };
          setPapers((list) => list.map((p) => (p.code === editing.code ? next : p)));
          if (format === "session") {
            const months = data.getAll("months").map(String);
            setSessions((s) => ({ ...s, [editing.code]: months.length ? months : SESSION_MONTHS }));
          }
          setOpen((cur) => (cur.includes(editing.code) ? cur : [...cur, editing.code]));
          toast({
            title: `${editing.code} paper structure saved`,
            body: `${next.syllabusAreas.length} syllabus areas · ${next.durationLabel} · ${format === "on-demand" ? "On-demand CBE" : "Session CBE"}`,
          });
          setEditing(null);
        }}
      >
        {editing ? (
          <div key={editing.code} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
              <Field label="Code">
                <Input value={editing.code} disabled readOnly className="font-mono" />
              </Field>
              <Field label="Paper name">
                <Input name="name" defaultValue={editing.name} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Exam format">
                <Select name="format" defaultValue={editing.examFormat}>
                  <option value="on-demand">On-demand CBE</option>
                  <option value="session">Session CBE</option>
                </Select>
              </Field>
              <Field label="Duration">
                <Select name="duration" defaultValue={editing.durationLabel}>
                  {DURATIONS.map((d) => (
                    <option key={d.label} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pass mark" hint="Set by ACCA">
                <Input value="50%" disabled readOnly />
              </Field>
              <Field label="Lead faculty">
                <Select name="lead" defaultValue={editing.leadFacultyId}>
                  {staff
                    .filter((s) => s.kind === "faculty")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Session months (session CBEs)</legend>
              <div className="grid grid-cols-2 gap-2.5">
                {SESSION_MONTHS.map((m) => (
                  <Checkbox
                    key={m}
                    name="months"
                    value={m}
                    label={m}
                    defaultChecked={(sessions[editing.code] ?? SESSION_MONTHS).includes(m)}
                  />
                ))}
              </div>
            </fieldset>
            <Field label="Exam structure">
              <Textarea name="structure" rows={3} defaultValue={editing.examStructure} />
            </Field>
            <Field label="Syllabus areas" hint="One per line: letter then title">
              <Textarea
                name="areas"
                rows={Math.min(10, editing.syllabusAreas.length + 2)}
                defaultValue={editing.syllabusAreas.map((a) => `${a.code} ${a.title}`).join("\n")}
                className="font-mono text-[13px]"
              />
            </Field>
            <p className="text-[12px] text-ink-3">
              Syllabus area letters are used by the question bank, content tags and university mappings. Renaming an area keeps existing tags.
            </p>
          </div>
        ) : null}
      </FormDrawer>
    </section>
  );
}

/* ------------------------------------------------------------ exemption rules */

function ExemptionRules({
  rules,
  setRules,
}: {
  rules: RuleRow[];
  setRules: React.Dispatch<React.SetStateAction<RuleRow[]>>;
}) {
  const [status, setStatus] = useState("");
  const [body, setBody] = useState("");
  const [drawer, setDrawer] = useState<{ mode: "add" } | { mode: "edit"; rule: RuleRow } | null>(null);

  const bodies = useMemo(() => Array.from(new Set(rules.map((r) => r.body))), [rules]);
  const visible = rules.filter((r) => (!status || r.status === status) && (!body || r.body === body));

  const columns: DataTableColumn<RuleRow>[] = [
    {
      key: "qualification",
      header: "Qualification",
      sortable: true,
      render: (r) => (
        <span className="block min-w-48">
          <span className="block font-semibold text-ink">{r.qualification}</span>
          <span className="block text-[12px] text-ink-3">{r.body}</span>
        </span>
      ),
    },
    {
      key: "papers",
      header: "Estimated exemptions",
      sortValue: (r) => r.exemptPapers.length,
      sortable: true,
      render: (r) =>
        r.exemptPapers.length ? (
          <span className="flex max-w-56 flex-wrap gap-1">
            {r.exemptPapers.map((p) => (
              <span key={p} className="rounded-md border border-line bg-surface-2 px-1.5 py-px font-mono text-[11.5px] font-semibold text-ink">
                {p}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-ink-3">None</span>
        ),
    },
    { key: "conditions", header: "Conditions", wrap: true, className: "min-w-64 text-ink-2" },
    {
      key: "evidence",
      header: "Evidence required",
      wrap: true,
      render: (r) => <span className="block min-w-44 text-[12.5px] text-ink-2">{r.evidence.join(" · ") || "None"}</span>,
    },
    { key: "claimsThisYear", header: "Claims 2026", align: "right", mono: true, sortable: true },
    { key: "lastReviewed", header: "Last reviewed", sortable: true, render: (r) => formatAccaDate(r.lastReviewed) },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} /> },
  ];

  const editing = drawer?.mode === "edit" ? drawer.rule : null;

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Configure exemption rules"
        sub="Rules the exemption team uses to record estimated exemptions from a learner's qualification. ACCA confirms every case and charges an exemption fee per exempt paper."
        action={
          <Button onClick={() => setDrawer({ mode: "add" })}>
            <Plus className="size-4" />
            Add rule
          </Button>
        }
      />

      <DataTable
        caption="Exemption rules"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={(r) => setDrawer({ mode: "edit", rule: r })}
        rowLabel={(r) => `Edit rule for ${r.qualification}`}
        search={{
          placeholder: "Search qualifications",
          match: (r, q) => r.qualification.toLowerCase().includes(q) || r.body.toLowerCase().includes(q),
        }}
        filters={
          <FilterBar
            active={Boolean(status || body)}
            onClear={() => {
              setStatus("");
              setBody("");
            }}
          >
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              allLabel="All"
              options={[
                { value: "active", label: "Active" },
                { value: "under-review", label: "Under review" },
              ]}
            />
            <FilterSelect label="Awarding body" value={body} onChange={setBody} allLabel="All" options={bodies} />
          </FilterBar>
        }
      />

      <RuleTester rules={rules} />

      <FormDrawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        title={editing ? `Edit rule · ${editing.qualification}` : "Add exemption rule"}
        sub="Estimated exemptions only. ACCA's decision is final."
        submitLabel={editing ? "Save rule" : "Add rule"}
        onSubmit={(data) => {
          const papers = data.getAll("papers").map(String) as PaperCode[];
          const row: RuleRow = {
            id: editing?.id ?? `ex-new-${rules.length + 1}`,
            qualification: String(data.get("qualification") ?? "").trim(),
            body: String(data.get("body") ?? "").trim() || "Indian universities",
            exemptPapers: PAPER_ORDER.filter((c) => papers.includes(c)),
            conditions: String(data.get("conditions") ?? "").trim() || "Estimated from the documents. ACCA confirms each case.",
            status: String(data.get("status")) === "under-review" ? "under-review" : "active",
            lastReviewed: "2026-09-14",
            claimsThisYear: editing?.claimsThisYear ?? 0,
            evidence: data.getAll("evidence").map(String),
          };
          if (editing) {
            setRules((list) => list.map((r) => (r.id === editing.id ? row : r)));
            toast({ title: "Exemption rule saved", body: `${row.qualification} · ${row.exemptPapers.join(", ") || "no exemptions"}` });
          } else {
            setRules((list) => [row, ...list]);
            toast({ title: "Exemption rule added", body: `${row.qualification} · ${row.exemptPapers.join(", ") || "no exemptions"}` });
          }
          setDrawer(null);
        }}
      >
        <div key={editing?.id ?? "new"} className="space-y-4">
          <Field label="Qualification">
            <Input name="qualification" required defaultValue={editing?.qualification} placeholder="e.g. B.Com (Hons) from a recognised Indian university" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Awarding body">
              <Input name="body" defaultValue={editing?.body} placeholder="e.g. ICAI" />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={editing?.status ?? "under-review"}>
                <option value="active">Active</option>
                <option value="under-review">Under review</option>
              </Select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Papers estimated exempt</legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {EXEMPTIBLE.map((c) => (
                <Checkbox
                  key={c}
                  name="papers"
                  value={c}
                  defaultChecked={editing ? editing.exemptPapers.includes(c) : ["BT", "MA", "FA"].includes(c)}
                  label={`${c} · ${paperByCode(c)?.name}`}
                />
              ))}
            </div>
          </fieldset>
          <Field label="Conditions">
            <Textarea name="conditions" rows={3} defaultValue={editing?.conditions} placeholder="e.g. LW only when law subjects appear on the mark sheets." />
          </Field>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Evidence required</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {EVIDENCE_OPTIONS.map((e) => (
                <Checkbox
                  key={e}
                  name="evidence"
                  value={e}
                  defaultChecked={editing ? editing.evidence.includes(e) : e === "Degree certificate" || e === "All semester mark sheets"}
                  label={e}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </FormDrawer>
    </section>
  );
}

function RuleTester({ rules }: { rules: RuleRow[] }) {
  const [ruleId, setRuleId] = useState(rules[0]?.id ?? "");
  const [lawSubjects, setLawSubjects] = useState(true);
  const [docsComplete, setDocsComplete] = useState(true);
  const rule = rules.find((r) => r.id === ruleId) ?? rules[0];

  const lawConditional = rule ? /\bLW\b/.test(rule.conditions) && rule.exemptPapers.includes("LW") : false;
  const papers = rule ? rule.exemptPapers.filter((p) => !(p === "LW" && lawConditional && !lawSubjects)) : [];
  const fees = papers.reduce((sum, p) => sum + exemptionFeeGBP(p), 0);
  const startsAt = PAPER_ORDER.filter((c) => !papers.includes(c) && !paperByCode(c)?.option).slice(0, 3);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FlaskConical className="size-4 text-ink-3" />
            Rule tester
          </span>
        }
        sub="Try a qualification against the rules above before an evaluator records an estimate."
      />
      <div className="grid gap-5 border-t border-line p-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Field label="Qualification">
            <Select value={rule?.id ?? ""} onChange={(e) => setRuleId(e.target.value)}>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.qualification}
                </option>
              ))}
            </Select>
          </Field>
          <Switch
            checked={lawSubjects}
            onChange={setLawSubjects}
            label="Law subjects in the syllabus"
            sub="Needed for an LW estimate on degree routes"
          />
          <Switch checked={docsComplete} onChange={setDocsComplete} label="Evidence complete" sub={rule?.evidence.join(", ")} />
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: docsComplete ? "Rule test recorded" : "Rule test: documents pending",
                body: docsComplete
                  ? `${rule?.qualification} → ${papers.join(", ") || "no exemptions"} · fees ${formatGBP(fees)} to ACCA`
                  : "The estimate cannot be recorded until the evidence is complete.",
                tone: docsComplete ? "success" : "warning",
              })
            }
          >
            <FlaskConical className="size-4" />
            Run test
          </Button>
        </div>

        <div className="min-w-0 rounded-[16px] border border-line bg-surface-2 p-4 sm:p-5">
          {!docsComplete ? (
            <div className="space-y-2">
              <StatusPill status="Documents pending" />
              <p className="text-[13.5px] text-ink-2">
                No estimate until the evidence is complete. The learner is asked for: {rule?.evidence.join(", ") || "documents"}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status="Estimated" />
                {rule?.status === "under-review" ? <StatusPill status="Under review">Rule under review: reviewer check needed</StatusPill> : null}
              </div>
              <div>
                <MiniLabel>Estimated exemptions</MiniLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {papers.length ? (
                    papers.map((p) => (
                      <Badge key={p} tone="jade">
                        {p} · {formatGBP(exemptionFeeGBP(p))}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[13px] text-ink-3">No exemptions. The learner starts at Applied Knowledge.</span>
                  )}
                </div>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-[12px] text-ink-3">Exemption fees to ACCA</dt>
                  <dd className="mt-0.5 font-display text-[22px] font-bold text-ink tnum">{formatGBP(fees)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-ink-3">Exams left to qualify</dt>
                  <dd className="mt-0.5 font-display text-[22px] font-bold text-ink tnum">{EXAMS_TO_QUALIFY - papers.length}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-ink-3">Starts with</dt>
                  <dd className="mt-1 font-mono text-[14px] font-semibold text-ink">{startsAt.join(", ")}</dd>
                </div>
              </dl>
              {lawConditional && !lawSubjects ? (
                <p className="text-[12.5px] text-amber">LW removed: the rule needs law subjects in the syllabus.</p>
              ) : null}
              <p className="text-[12px] text-ink-3">Estimate only. ACCA confirms each exemption and the fee is paid to ACCA, recorded here for tracking.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ mapping framework */

function MappingFramework({ version, onPublish }: { version: string; onPublish: (v: string) => void }) {
  const [levels, setLevels] = useState<CoverageLevel[]>(curriculumMappingFramework.coverageLevels);
  const [editingLevel, setEditingLevel] = useState<CoverageLevel | null>(null);
  const [paper, setPaper] = useState<PaperCode>("FA");
  const [addTopic, setAddTopic] = useState(false);
  const [extraTopics, setExtraTopics] = useState<Record<string, string[]>>({});
  const [settings, setSettings] = useState({
    facultyReview: true,
    leadApproval: true,
    universityReview: true,
    reReview: true,
    paperLevelConceptual: true,
  });
  const [reviewDays, setReviewDays] = useState("10");

  const coverageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of universitySubjects) for (const map of s.mappings) m[map.coverage] = (m[map.coverage] ?? 0) + 1;
    return m;
  }, []);

  const paperInfo = paperByCode(paper)!;
  const topicsFor = (area: string) => {
    const base = Array.from(new Set(bankQuestions.filter((q) => q.paper === paper && q.syllabusArea === area).map((q) => q.topic)));
    return [...base, ...(extraTopics[`${paper}-${area}`] ?? [])];
  };
  const subjectsFor = (area: string) =>
    universitySubjects.filter((s) => s.mappings.some((m) => m.paper === paper && (m.areas.includes(area) || m.coverage === "conceptual-only")));

  const bumpVersion = () => {
    const [major, minor] = version.replace("v", "").split(".").map(Number);
    return `v${major}.${(minor ?? 0) + 1}`;
  };

  const SETTINGS: { key: keyof typeof settings; label: string; sub: string }[] = [
    { key: "facultyReview", label: "Faculty review before a mapping reaches a roadmap", sub: "The paper's faculty checks every proposed mapping." },
    { key: "leadApproval", label: "ACCA Programme Lead approves mappings", sub: "Approver: Priya Menon" },
    { key: "universityReview", label: "University Admin reviews the semester-to-ACCA roadmap", sub: "Editor access required to approve" },
    { key: "reReview", label: "Re-review when ACCA publishes a new syllabus", sub: "Affected mappings move back to In review" },
    { key: "paperLevelConceptual", label: "Allow paper-level mapping for conceptual-only coverage", sub: "All other mappings are made at syllabus area level" },
  ];

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Configure curriculum-mapping framework"
        sub="Coverage levels, the mapping taxonomy and the approval workflow that Programme Admins and University Admins follow when mapping university subjects to ACCA."
        action={
          <Button
            onClick={() => {
              const next = bumpVersion();
              onPublish(next);
              toast({ title: `Mapping framework ${next} published`, body: "Mappings in review pick up the new definitions." });
            }}
          >
            <UploadCloud className="size-4" />
            Publish new version
          </Button>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">{version}</Badge>
            <span className="text-[13px] text-ink-2">
              Owner {staffName(curriculumMappingFramework.ownerId)} · last updated {formatAccaDate(curriculumMappingFramework.updated)}
            </span>
          </div>
          <MiniLabel>Approval workflow</MiniLabel>
        </div>
        <Stepper
          className="mt-4"
          aria-label="Mapping approval workflow"
          steps={curriculumMappingFramework.approvalFlow.map((label, i) => ({ id: `step-${i}`, label, state: "upcoming" as const }))}
        />
      </Card>

      <div>
        <MiniLabel className="mb-3">Coverage levels</MiniLabel>
        <div className="grid gap-4 md:grid-cols-3">
          {levels.map((l) => (
            <Card key={l.id} className="flex min-w-0 flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <StatusPill status={l.label} tone={COVERAGE_TONE[l.id]} />
                <span className="font-mono text-[12px] text-ink-3">weight {l.weight}</span>
              </div>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ink-2">{l.definition}</p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-[12.5px] text-ink-3">{coverageCounts[l.id] ?? 0} mappings use this level</span>
                <Button size="xs" variant="outline" onClick={() => setEditingLevel(l)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Layers className="size-4 text-ink-3" />
                Mapping taxonomy
              </span>
            }
            sub="Paper, then syllabus area, then topic. University subjects map to areas; content and questions carry topic tags."
            action={
              <Button size="sm" variant="secondary" onClick={() => setAddTopic(true)}>
                <Plus className="size-4" />
                Add topic
              </Button>
            }
          />
          <div className="border-t border-line px-5 py-4">
            <FilterSelect
              label="Paper"
              value={paper}
              onChange={(v) => setPaper(v as PaperCode)}
              options={accaPapers.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))}
            />
            <ol className="mt-4 space-y-2.5">
              {paperInfo.syllabusAreas.map((a) => {
                const topics = topicsFor(a.code);
                const subjects = subjectsFor(a.code);
                return (
                  <li key={a.code} className="rounded-[14px] border border-line p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 basis-56 text-[13.5px] font-semibold text-ink">
                        <span className="mr-2 font-mono text-ink-3">
                          {paper} {a.code}
                        </span>
                        {a.title}
                      </p>
                      <Badge tone={subjects.length ? "info" : "neutral"}>
                        {subjects.length} university {subjects.length === 1 ? "subject" : "subjects"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {topics.length ? (
                        topics.map((t) => (
                          <span key={t} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] text-ink-2">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12.5px] text-ink-3">No topics tagged yet</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Approval workflow settings" sub="Who must sign off before a mapping appears on a student roadmap." />
            <div className="space-y-4 border-t border-line p-5">
              {SETTINGS.map((s) => (
                <Switch
                  key={s.key}
                  checked={settings[s.key]}
                  onChange={(v) => setSettings((cur) => ({ ...cur, [s.key]: v }))}
                  label={s.label}
                  sub={s.sub}
                />
              ))}
              <Field label="Review due within">
                <Select value={reviewDays} onChange={(e) => setReviewDays(e.target.value)}>
                  {["5", "10", "15"].map((d) => (
                    <option key={d} value={d}>
                      {d} working days
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                className="w-full"
                onClick={() =>
                  toast({
                    title: "Approval workflow saved",
                    body: `${Object.values(settings).filter(Boolean).length} of 5 checks on · reviews due in ${reviewDays} working days`,
                  })
                }
              >
                Save workflow settings
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Mapping rules" sub="Shown to everyone who maps a curriculum." />
            <ul className="space-y-2.5 border-t border-line p-5">
              {curriculumMappingFramework.rules.map((r) => (
                <li key={r} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-jade" strokeWidth={2.6} />
                  <span className="min-w-0">{r}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Mapping status by university" sub="University subjects in the sample curriculum uploads." />
            <ul className="divide-y divide-line border-t border-line px-5">
              {universities.map((u) => {
                const list = universitySubjects.filter((s) => s.universityId === u.id);
                const count = (st: string) => list.filter((s) => s.mappingStatus === st).length;
                return (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="min-w-0 text-[13.5px] font-semibold text-ink">{u.name}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <StatusPill status="mapped" size="sm">
                        {count("mapped")} mapped
                      </StatusPill>
                      <StatusPill status="in-review" size="sm">
                        {count("in-review")} in review
                      </StatusPill>
                      <StatusPill status="not-mapped" tone="neutral" size="sm">
                        {count("not-mapped")} not mapped
                      </StatusPill>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      <FormDrawer
        open={editingLevel !== null}
        onClose={() => setEditingLevel(null)}
        title={editingLevel ? `Coverage level · ${editingLevel.label}` : "Coverage level"}
        sub="The weight is how much roadmap credit a mapping at this level gives."
        submitLabel="Save level"
        onSubmit={(data) => {
          if (!editingLevel) return;
          const definition = String(data.get("definition") ?? "").trim() || editingLevel.definition;
          const weight = Number(data.get("weight"));
          setLevels((list) => list.map((l) => (l.id === editingLevel.id ? { ...l, definition, weight } : l)));
          toast({ title: `${editingLevel.label} coverage updated`, body: `Weight ${weight}` });
          setEditingLevel(null);
        }}
      >
        {editingLevel ? (
          <div key={editingLevel.id} className="space-y-4">
            <Field label="Definition">
              <Textarea name="definition" rows={4} defaultValue={editingLevel.definition} required />
            </Field>
            <Field label="Roadmap credit weight">
              <Select name="weight" defaultValue={String(editingLevel.weight)}>
                {["1", "0.75", "0.5", "0.25", "0.2", "0"].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={addTopic}
        onClose={() => setAddTopic(false)}
        title="Add topic to the taxonomy"
        sub={`${paper} · ${paperInfo.name}`}
        submitLabel="Add topic"
        onSubmit={(data) => {
          const area = String(data.get("area"));
          const topic = String(data.get("topic") ?? "").trim();
          if (!topic) return;
          setExtraTopics((cur) => ({ ...cur, [`${paper}-${area}`]: [...(cur[`${paper}-${area}`] ?? []), topic] }));
          toast({ title: "Topic added", body: `${paper} ${area} · ${topic}` });
          setAddTopic(false);
        }}
      >
        <Field label="Syllabus area">
          <Select name="area" defaultValue={paperInfo.syllabusAreas[0]?.code}>
            {paperInfo.syllabusAreas.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} · {a.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Topic">
          <Input name="topic" required placeholder="e.g. Bank reconciliations" />
        </Field>
      </FormDrawer>
    </section>
  );
}
