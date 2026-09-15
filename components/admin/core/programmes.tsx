"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers,
  ListTree,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import {
  accaPapers,
  cohorts as seedCohorts,
  COHORT_TYPE_LABELS,
  examSessionById,
  faculty as facultyStaff,
  feePlanById,
  formatAccaDate,
  intakes as seedIntakes,
  mentors as mentorStaff,
  paperByCode,
  programmes as seedProgrammes,
  roadmapForUniversity,
  staffName,
  students as allStudents,
  universities,
  universityById,
  type Cohort,
  type CohortSection,
  type CohortType,
  type ExamSessionId,
  type Intake,
  type PaperCode,
  type Programme,
  type ProgrammeKind,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/status";
import { Badge } from "@/components/ui/badge";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MiniLabel, SectionHead, slugify } from "./shared";

/* ------------------------------------------------------------------ constants */

const KIND_LABELS: Record<ProgrammeKind, string> = {
  graduate: "Graduate pathway",
  "fast-track": "Fast track",
  strategic: "Strategic Professional",
  university: "University-linked",
};

const LEVEL_GROUPS: { id: string; label: string; papers: PaperCode[] }[] = [
  { id: "ak", label: "Applied Knowledge", papers: ["BT", "MA", "FA"] },
  { id: "as", label: "Applied Skills", papers: ["LW", "PM", "TX", "FR", "AA", "FM"] },
  { id: "sp", label: "Strategic Professional · Essentials", papers: ["SBL", "SBR"] },
  { id: "opt", label: "Strategic Professional · Options", papers: ["AFM", "APM", "ATX", "AAA"] },
];
const OPTIONS: PaperCode[] = ["AFM", "APM", "ATX", "AAA"];
const EXEMPTION_ELIGIBLE: PaperCode[] = ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"];

const SESSION_SEQUENCE = ["Dec 2026", "Mar 2027", "Jun 2027", "Sep 2027", "Dec 2027", "Mar 2028", "Jun 2028", "Sep 2028", "Dec 2028"];
const BOOKABLE_SESSIONS: { id: ExamSessionId; label: string }[] = [
  { id: "es-2026-dec", label: "Dec 2026" },
  { id: "es-2027-mar", label: "Mar 2027" },
  { id: "es-2027-jun", label: "Jun 2027" },
];

const EXEMPTION = "Exemption on entry";
const ON_DEMAND = "On demand, any date";

type PaperPlan = { session: string; entry: boolean };
type Stage = { id: string; label: string; papers: PaperCode[]; detail: string };
type ProgrammeStructure = { stages: Stage[]; plan: Partial<Record<PaperCode, PaperPlan>>; optionsOffered: PaperCode[] };

/* ------------------------------------------------------------------ defaults */

function sessionChoices(p: Programme) {
  if (p.kind === "university") {
    const semesters = Array.from({ length: 6 }, (_, i) => `Semester ${i + 1}`);
    return [...semesters, "After graduation", EXEMPTION];
  }
  return [EXEMPTION, ON_DEMAND, ...SESSION_SEQUENCE];
}

function defaultStructure(p: Programme): ProgrammeStructure {
  const plan: Partial<Record<PaperCode, PaperPlan>> = {};
  if (p.kind === "university" && p.universityId) {
    const roadmap = roadmapForUniversity(p.universityId);
    for (const code of [...p.papers, "SBL", "SBR"] as PaperCode[]) {
      const exam = roadmap.find((r) => r.examWindowPapers.includes(code));
      const study = roadmap.find((r) => r.papers.includes(code));
      const stage = exam ?? study;
      plan[code] = {
        session: stage ? (stage.semester == null ? "After graduation" : `Semester ${stage.semester}`) : "After graduation",
        entry: false,
      };
    }
  } else {
    const perSession = p.kind === "fast-track" ? 2 : 1;
    const entry: PaperCode[] = p.kind === "strategic" ? EXEMPTION_ELIGIBLE : ["BT", "MA", "FA", "LW"];
    let slot = 0;
    const ordered = accaPapers.map((x) => x.code).filter((c) => !OPTIONS.includes(c));
    for (const code of ordered) {
      const paper = paperByCode(code);
      if (entry.includes(code)) {
        plan[code] = { session: EXEMPTION, entry: true };
      } else if (paper?.examFormat === "on-demand") {
        plan[code] = { session: ON_DEMAND, entry: false };
      } else {
        plan[code] = { session: SESSION_SEQUENCE[Math.min(SESSION_SEQUENCE.length - 1, Math.floor(slot / perSession))], entry: false };
        slot += 1;
      }
    }
  }
  const lastSlot = p.kind === "university" ? "After graduation" : SESSION_SEQUENCE[Math.min(SESSION_SEQUENCE.length - 1, p.kind === "strategic" ? 2 : 7)];
  for (const code of OPTIONS) plan[code] = { session: lastSlot, entry: false };
  return {
    stages: p.structure.map((s) => ({ ...s, papers: [...s.papers] })),
    plan,
    optionsOffered: p.kind === "university" ? ["AFM", "APM", "AAA"] : [...OPTIONS],
  };
}

/** Graduate cohorts are formed per exam session; place each under the intake most of its learners came from. */
function intakeForCohort(c: Cohort) {
  if (c.intakeId) return c.intakeId;
  const counts = new Map<string, number>();
  for (const s of allStudents) if (s.cohortIds.includes(c.id)) counts.set(s.intakeId, (counts.get(s.intakeId) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "in-2026-sep";
}

function intakeMix(c: Cohort) {
  if (c.intakeId) return null;
  const counts = new Map<string, number>();
  for (const s of allStudents) if (s.cohortIds.includes(c.id)) counts.set(s.intakeId, (counts.get(s.intakeId) ?? 0) + 1);
  if (counts.size < 2) return null;
  return [...counts.entries()].map(([id, n]) => `${seedIntakes.find((i) => i.id === id)?.label.replace(" intake", "")} (${n})`).join(", ");
}

type TreeCohort = Cohort & { treeIntakeId: string; mix: string | null };

const SEED_TREE: TreeCohort[] = seedCohorts.map((c) => ({ ...c, sections: [...c.sections], treeIntakeId: intakeForCohort(c), mix: intakeMix(c) }));

/* ------------------------------------------------------------------ page */

const PROGRAMME_TABS = ["programmes", "structure", "intakes"];

export function AdminProgrammes({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab && PROGRAMME_TABS.includes(initialTab) ? initialTab : "programmes");
  const [programmes, setProgrammes] = useState<Programme[]>(seedProgrammes);
  const [structures, setStructures] = useState<Record<string, ProgrammeStructure>>(() =>
    Object.fromEntries(seedProgrammes.map((p) => [p.id, defaultStructure(p)])),
  );
  const [selected, setSelected] = useState(seedProgrammes[0].id);
  const [intakes, setIntakes] = useState<Intake[]>(seedIntakes);
  const [tree, setTree] = useState<TreeCohort[]>(SEED_TREE);
  const [creatingProgramme, setCreatingProgramme] = useState(false);

  const openMarket = programmes.filter((p) => p.market === "Open market").length;
  const sectionCount = tree.reduce((n, c) => n + c.sections.length, 0);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Network"
        title="Programmes"
        sub="Create graduate and open-market programmes, define their paper structures, and set up intakes, cohorts and batches."
        actions={
          <>
            <Button variant="outline" onClick={() => setTab("intakes")}>
              <ListTree className="size-4" />
              Intakes and cohorts
            </Button>
            <Button onClick={() => setCreatingProgramme(true)}>
              <Plus className="size-4" />
              Create programme
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile label="Programmes" value={programmes.length} sub={`${openMarket} open market · ${programmes.length - openMarket} university-linked`} icon={<Layers />} />
        <KpiTile label="Learners" value={programmes.reduce((n, p) => n + p.learners, 0)} tone="info" icon={<Users />} />
        <KpiTile label="Intakes" value={intakes.length} sub={`${intakes.filter((i) => i.status === "enrolling").length} enrolling`} tone="amber" />
        <KpiTile label="Cohorts" value={tree.length} sub={`${sectionCount} batches and sections`} tone="jade" icon={<GitBranch />} />
      </KpiRow>

      <Tabs
        items={[
          { id: "programmes", label: "Programmes", count: programmes.length },
          { id: "structure", label: "Programme structures" },
          { id: "intakes", label: "Intakes, cohorts and batches", count: intakes.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "programmes" ? (
        <ProgrammeList
          programmes={programmes}
          intakes={intakes}
          onCreate={() => setCreatingProgramme(true)}
          onStructure={(id) => {
            setSelected(id);
            setTab("structure");
          }}
        />
      ) : null}

      {tab === "structure" ? (
        <StructureBuilder
          programmes={programmes}
          selected={selected}
          onSelect={setSelected}
          structure={structures[selected]}
          onChange={(next) => setStructures((s) => ({ ...s, [selected]: next }))}
        />
      ) : null}

      {tab === "intakes" ? (
        <IntakeTree programmes={programmes} intakes={intakes} setIntakes={setIntakes} tree={tree} setTree={setTree} />
      ) : null}

      <CreateProgrammeDrawer
        open={creatingProgramme}
        onClose={() => setCreatingProgramme(false)}
        intakes={intakes}
        onCreate={(created) => {
          const p = { ...created, id: `${created.id}-${programmes.length + 1}` };
          setProgrammes((list) => [...list, p]);
          setStructures((s) => ({ ...s, [p.id]: defaultStructure(p) }));
          setSelected(p.id);
          setCreatingProgramme(false);
          toast({ title: "Programme created", body: `${p.name} · ${p.market} · Draft. Build its structure next.` });
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ programme list */

function ProgrammeList({
  programmes,
  intakes,
  onCreate,
  onStructure,
}: {
  programmes: Programme[];
  intakes: Intake[];
  onCreate: () => void;
  onStructure: (id: string) => void;
}) {
  const [market, setMarket] = useState("all");
  const visible = programmes.filter((p) => market === "all" || (market === "open" ? p.market === "Open market" : p.market === "University partnership"));

  return (
    <section className="space-y-4">
      <SectionHead
        title="Create graduate/open-market programmes"
        sub="Open-market programmes are sold and delivered by ZSkillup directly. University-linked programmes run inside a partner university's degree."
        action={
          <Button variant="secondary" size="sm" onClick={onCreate}>
            <Plus className="size-4" />
            New programme
          </Button>
        }
      />
      <Segmented
        size="sm"
        items={[
          { id: "all", label: `All (${programmes.length})` },
          { id: "open", label: "Graduate and open market" },
          { id: "university", label: "University-linked" },
        ]}
        value={market}
        onChange={setMarket}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((p) => {
          const uni = universityById(p.universityId);
          return (
            <Card key={p.id} className="flex min-w-0 flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={p.market === "Open market" ? "dark" : "info"}>{p.market === "Open market" ? "Open market" : (uni?.shortName ?? "University")}</Badge>
                <Badge>{KIND_LABELS[p.kind]}</Badge>
                <StatusPill status={p.status} size="sm" className="ml-auto" />
              </div>
              <h3 className="mt-3 font-display text-[18px] leading-tight font-bold tracking-[-0.02em] text-ink">{p.name}</h3>
              <p className="mt-1 text-[12.5px] text-ink-3">{p.deliveredBy}</p>
              <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{p.description}</p>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
                <div className="min-w-0">
                  <dt className="text-[11.5px] text-ink-3">Learners</dt>
                  <dd className="font-display text-[20px] font-bold text-ink tnum">{p.learners}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11.5px] text-ink-3">Duration</dt>
                  <dd className="font-display text-[20px] font-bold text-ink tnum">{p.durationMonths} mo</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11.5px] text-ink-3">Intakes</dt>
                  <dd className="font-display text-[20px] font-bold text-ink tnum">
                    {intakes.filter((i) => i.programmeIds.includes(p.id) || p.intakeIds.includes(i.id)).length}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.papers.map((code) => (
                  <span key={code} className="rounded-[6px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2">
                    {code}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-ink-3">
                Fee plans: {p.feePlanIds.map((id) => feePlanById(id)?.name ?? id).join(" · ") || "Not set"}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button size="sm" variant="outline" onClick={() => onStructure(p.id)}>
                  <GitBranch className="size-4" />
                  Edit structure
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ structure builder */

function StructureBuilder({
  programmes,
  selected,
  onSelect,
  structure,
  onChange,
}: {
  programmes: Programme[];
  selected: string;
  onSelect: (id: string) => void;
  structure: ProgrammeStructure;
  onChange: (next: ProgrammeStructure) => void;
}) {
  const programme = programmes.find((p) => p.id === selected) ?? programmes[0];
  const [addingStage, setAddingStage] = useState(false);
  const choices = sessionChoices(programme);
  const included = new Set(structure.stages.flatMap((s) => s.papers));
  const optionsOk = structure.optionsOffered.length >= 2;

  const move = (index: number, dir: -1 | 1) => {
    const next = [...structure.stages];
    const [item] = next.splice(index, 1);
    next.splice(index + dir, 0, item);
    onChange({ ...structure, stages: next });
  };

  const setPlan = (code: PaperCode, patch: Partial<PaperPlan>) =>
    onChange({ ...structure, plan: { ...structure.plan, [code]: { ...(structure.plan[code] ?? { session: choices[0], entry: false }), ...patch } } });

  const entryPoints = EXEMPTION_ELIGIBLE.filter((c) => structure.plan[c]?.entry);

  return (
    <section className="space-y-4">
      <SectionHead
        title="Create programme structures"
        sub="Order the stages, set the recommended exam session for each paper, mark exemption entry points and choose which options are offered."
        action={
          <Button
            onClick={() => {
              if (!optionsOk) {
                toast({ title: "Offer at least two options", body: "ACCA learners choose two of AFM, APM, ATX and AAA.", tone: "warning" });
                return;
              }
              toast({
                title: "Programme structure saved",
                body: `${programme.name} · ${structure.stages.length} stages · ${entryPoints.length ? `exemption entry up to ${entryPoints[entryPoints.length - 1]}` : "no exemption entry"}`,
              });
            }}
          >
            <Save className="size-4" />
            Save structure
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Programme" className="w-full sm:w-96">
          <Select value={programme.id} onChange={(e) => onSelect(e.target.value)}>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap gap-2 pb-2">
          <Badge tone={programme.market === "Open market" ? "dark" : "info"}>{programme.market}</Badge>
          <StatusPill status={programme.status} size="sm" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Stages"
            sub="The order learners move through"
            action={
              <Button size="sm" variant="secondary" onClick={() => setAddingStage(true)}>
                <Plus className="size-4" />
                Add stage
              </Button>
            }
          />
          <ol className="space-y-2 px-5 pb-5">
            {structure.stages.map((stage, i) => (
              <li key={stage.id} className="flex min-w-0 gap-3 rounded-[14px] border border-line p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-inv font-mono text-[12px] font-bold text-cta">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">{stage.label}</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">{stage.detail}</p>
                  {stage.papers.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {stage.papers.map((c) => (
                        <span key={c} className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-2">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <IconButton label={`Move ${stage.label} up`} size="xs" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </IconButton>
                  <IconButton label={`Move ${stage.label} down`} size="xs" disabled={i === structure.stages.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${stage.label}`}
                    size="xs"
                    onClick={() => {
                      onChange({ ...structure, stages: structure.stages.filter((s) => s.id !== stage.id) });
                      toast({ title: `Stage removed: ${stage.label}`, tone: "neutral" });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Papers by level"
            sub={programme.kind === "university" ? "Recommended semester for each exam, from the university's semester-to-ACCA roadmap" : "Recommended exam session for each paper"}
          />
          <div className="space-y-5 px-5 pb-5">
            {LEVEL_GROUPS.map((group) => (
              <div key={group.id} className="min-w-0">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <MiniLabel>{group.label}</MiniLabel>
                  {group.id === "opt" ? (
                    <span className={cn("text-[12px] font-semibold", optionsOk ? "text-ink-2" : "text-rose")}>
                      Learners choose two · {structure.optionsOffered.length} offered
                    </span>
                  ) : null}
                </div>
                <div className="scrollbar-slim overflow-x-auto rounded-[12px] border border-line">
                  <table className="w-full min-w-[34rem] text-[13px]">
                    <thead>
                      <tr className="bg-surface-2 text-left text-[11.5px] font-semibold text-ink-3">
                        <th className="px-3 py-2">Paper</th>
                        <th className="px-3 py-2">Exam</th>
                        <th className="px-3 py-2">{programme.kind === "university" ? "Recommended semester" : "Recommended session"}</th>
                        <th className="px-3 py-2 text-center">{group.id === "opt" ? "Offered" : "Exemption entry point"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.papers.map((code) => {
                        const paper = paperByCode(code);
                        const plan = structure.plan[code];
                        const inProgramme = included.has(code) || programme.papers.includes(code);
                        return (
                          <tr key={code} className="border-t border-line">
                            <td className="px-3 py-2">
                              <span className="font-mono font-bold text-ink">{code}</span>
                              <span className={cn("ml-2", inProgramme ? "text-ink-2" : "text-ink-3")}>{paper?.name}</span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-ink-3">
                              {paper?.examFormat === "on-demand" ? "On-demand CBE" : "Session CBE"} · {paper?.durationLabel}
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                aria-label={`Recommended session for ${code}`}
                                value={plan?.session ?? choices[0]}
                                onChange={(e) => setPlan(code, { session: e.target.value, entry: e.target.value === EXEMPTION })}
                                className="min-w-40 text-[13px]"
                              >
                                {choices.map((c) => (
                                  <option key={c}>{c}</option>
                                ))}
                              </Select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {group.id === "opt" ? (
                                <span className="inline-flex">
                                  <Checkbox
                                    aria-label={`Offer ${code}`}
                                    checked={structure.optionsOffered.includes(code)}
                                    onChange={(e) =>
                                      onChange({
                                        ...structure,
                                        optionsOffered: e.target.checked
                                          ? OPTIONS.filter((o) => o === code || structure.optionsOffered.includes(o))
                                          : structure.optionsOffered.filter((o) => o !== code),
                                      })
                                    }
                                  />
                                </span>
                              ) : EXEMPTION_ELIGIBLE.includes(code) ? (
                                <span className="inline-flex">
                                  <Checkbox
                                    aria-label={`${code} is an exemption entry point`}
                                    checked={Boolean(plan?.entry)}
                                    onChange={(e) =>
                                      setPlan(code, {
                                        entry: e.target.checked,
                                        session: e.target.checked
                                          ? EXEMPTION
                                          : programme.kind === "university"
                                            ? "Semester 1"
                                            : paper?.examFormat === "on-demand"
                                              ? ON_DEMAND
                                              : SESSION_SEQUENCE[0],
                                      })
                                    }
                                  />
                                </span>
                              ) : (
                                <span className="text-[12px] text-ink-3">Not exemptible</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="text-[12px] text-ink-3">
              Exemptions are estimated by the programme team and confirmed by ACCA. Strategic Professional papers cannot be exempt. Pass mark 50% for every exam.
            </p>
          </div>
        </Card>
      </div>

      <FormDrawer
        open={addingStage}
        onClose={() => setAddingStage(false)}
        title="Add stage"
        sub={programme.name}
        submitLabel="Add stage"
        onSubmit={(data) => {
          const label = String(data.get("label")).trim();
          const papers = data.getAll("papers").map(String) as PaperCode[];
          onChange({
            ...structure,
            stages: [...structure.stages, { id: `ps-${slugify(label)}-${structure.stages.length + 1}`, label, papers, detail: String(data.get("detail")).trim() }],
          });
          toast({ title: "Stage added", body: `${label}${papers.length ? ` · ${papers.join(", ")}` : ""}` });
          setAddingStage(false);
        }}
      >
        <Field label="Stage name">
          <Input name="label" required placeholder="e.g. Revision and reattempt window" />
        </Field>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Papers in this stage</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {accaPapers.map((p) => (
              <Checkbox key={p.code} name="papers" value={p.code} label={<span><span className="font-mono font-semibold">{p.code}</span> {p.name}</span>} />
            ))}
          </div>
        </fieldset>
        <Field label="What happens in this stage">
          <Textarea name="detail" rows={3} required placeholder="e.g. Learners who fail a paper join a revision cohort for the next session." />
        </Field>
      </FormDrawer>
    </section>
  );
}

/* ------------------------------------------------------------------ intake tree */

type TreeDrawer = { kind: "intake" } | { kind: "cohort"; intakeId?: string } | { kind: "section"; cohortId?: string };

function IntakeTree({
  programmes,
  intakes,
  setIntakes,
  tree,
  setTree,
}: {
  programmes: Programme[];
  intakes: Intake[];
  setIntakes: React.Dispatch<React.SetStateAction<Intake[]>>;
  tree: TreeCohort[];
  setTree: React.Dispatch<React.SetStateAction<TreeCohort[]>>;
}) {
  const [openIntakes, setOpenIntakes] = useState<string[]>(["in-2025-jul", "in-2026-jan"]);
  const [openCohorts, setOpenCohorts] = useState<string[]>(() => seedCohorts.filter((c) => ["in-2025-jul", "in-2026-jan"].includes(intakeForCohort(c))).map((c) => c.id));
  const [drawer, setDrawer] = useState<TreeDrawer | null>(null);
  const [drawerKey, setDrawerKey] = useState(0);

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const open = (d: TreeDrawer) => {
    setDrawer(d);
    setDrawerKey((k) => k + 1);
  };

  const ordered = useMemo(() => [...intakes].sort((a, b) => a.start.localeCompare(b.start)), [intakes]);

  return (
    <section className="space-y-4">
      <SectionHead
        title="Create intakes, cohorts and batches"
        sub="Intake, then cohort, then batch or section. University cohorts belong to their intake; graduate cohorts form per exam session and sit under the intake most of their learners joined in."
        action={
          <>
            <Button size="sm" variant="outline" onClick={() => open({ kind: "section" })}>
              <Plus className="size-4" />
              Batch or section
            </Button>
            <Button size="sm" variant="outline" onClick={() => open({ kind: "cohort" })}>
              <Plus className="size-4" />
              Cohort
            </Button>
            <Button size="sm" onClick={() => open({ kind: "intake" })}>
              <Plus className="size-4" />
              Create intake
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button size="xs" variant="ghost" onClick={() => { setOpenIntakes(intakes.map((i) => i.id)); setOpenCohorts(tree.map((c) => c.id)); }}>
          Expand all
        </Button>
        <Button size="xs" variant="ghost" onClick={() => { setOpenIntakes([]); setOpenCohorts([]); }}>
          Collapse all
        </Button>
      </div>

      <ul className="space-y-3">
        {ordered.map((intake) => {
          const children = tree.filter((c) => c.treeIntakeId === intake.id);
          const isOpen = openIntakes.includes(intake.id);
          return (
            <li key={intake.id}>
              <Card className="min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5">
                  <button
                    type="button"
                    onClick={() => setOpenIntakes((l) => toggle(l, intake.id))}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 basis-64 items-center gap-2.5 text-left"
                  >
                    {isOpen ? <ChevronDown className="size-4 shrink-0 text-ink-3" /> : <ChevronRight className="size-4 shrink-0 text-ink-3" />}
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[16px] font-bold text-ink">{intake.label}</span>
                      <span className="block truncate text-[12px] text-ink-3">
                        Starts {formatAccaDate(intake.start)} · {intake.programmeIds.map((id) => programmes.find((p) => p.id === id)?.name ?? id).join(", ")}
                      </span>
                    </span>
                  </button>
                  <Badge tone={intake.kind === "university" ? "info" : "dark"}>{intake.kind === "university" ? "University" : "Graduate"}</Badge>
                  <span className="text-[12.5px] text-ink-2 tnum">{intake.students} learners</span>
                  <span className="text-[12.5px] text-ink-3 tnum">{children.length} cohorts</span>
                  <StatusPill status={intake.status} size="sm" />
                  <Button size="xs" variant="secondary" onClick={() => open({ kind: "cohort", intakeId: intake.id })}>
                    <Plus className="size-3.5" />
                    Add cohort
                  </Button>
                </div>
                {isOpen ? (
                  <div className="border-t border-line bg-surface-2/60 px-4 py-3 sm:px-5">
                    {children.length === 0 ? (
                      <p className="py-3 text-[13px] text-ink-3">
                        No cohorts yet. Learners from this intake are allocated once their exemptions are estimated.
                      </p>
                    ) : (
                      <ul className="space-y-2 border-l-2 border-line-strong pl-3 sm:pl-4">
                        {children.map((c) => {
                          const cOpen = openCohorts.includes(c.id);
                          const seated = c.sections.reduce((n, s) => n + s.size, 0);
                          return (
                            <li key={c.id} className="rounded-[14px] border border-line bg-surface">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => setOpenCohorts((l) => toggle(l, c.id))}
                                  aria-expanded={cOpen}
                                  className="flex min-w-0 flex-1 basis-56 items-center gap-2 text-left"
                                >
                                  {cOpen ? <ChevronDown className="size-4 shrink-0 text-ink-3" /> : <ChevronRight className="size-4 shrink-0 text-ink-3" />}
                                  <span className="min-w-0">
                                    <span className="block truncate text-[13.5px] font-semibold text-ink">{c.name}</span>
                                    <span className="block truncate text-[12px] text-ink-3">
                                      {c.papers.join(", ")} · {c.mode === "weekend" ? "Weekend" : "Weekday"} ·{" "}
                                      {c.examSessionId ? `${examSessionById(c.examSessionId)?.label} exams` : c.semester ? `Semester ${c.semester}` : c.delivery}
                                      {c.mix ? ` · learners from ${c.mix}` : ""}
                                    </span>
                                  </span>
                                </button>
                                <Badge>{COHORT_TYPE_LABELS[c.type]}</Badge>
                                <span className="text-[12.5px] text-ink-2 tnum">
                                  {c.size} of {c.capacity}
                                </span>
                                <StatusPill status={c.status} size="sm" />
                                <Button size="xs" variant="ghost" onClick={() => open({ kind: "section", cohortId: c.id })}>
                                  <Plus className="size-3.5" />
                                  {c.type === "university" ? "Add section" : "Add batch"}
                                </Button>
                              </div>
                              {cOpen ? (
                                <div className="border-t border-line px-3.5 py-2.5">
                                  <p className="mb-2 text-[12px] text-ink-3">
                                    Faculty {c.facultyIds.map((id) => staffName(id)).join(", ")} · mentor {staffName(c.mentorId)} · {seated} seated in {c.sections.length}{" "}
                                    {c.sections.length === 1 ? "group" : "groups"}
                                  </p>
                                  {c.sections.length === 0 ? (
                                    <p className="text-[12.5px] text-ink-3">No batches or sections yet.</p>
                                  ) : (
                                    <ul className="space-y-1.5 border-l-2 border-cta pl-3">
                                      {c.sections.map((s) => (
                                        <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                                          <span className="min-w-0 font-semibold text-ink">{s.name}</span>
                                          <Badge tone={s.kind === "section" ? "info" : "neutral"}>{s.kind === "section" ? "Section" : "Batch"}</Badge>
                                          <span className="text-ink-2 tnum">{s.size} learners</span>
                                          <span className="min-w-0 text-ink-3">{s.schedule}</span>
                                          <span className="min-w-0 text-ink-3">
                                            {staffName(s.facultyId)}
                                            {s.room ? ` · ${s.room}` : s.onlineLink ? " · online" : ""}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>

      {/* intake */}
      <FormDrawer
        open={drawer?.kind === "intake"}
        onClose={() => setDrawer(null)}
        title="Create intake"
        sub="An intake is an enrolment window. Cohorts and batches are added under it."
        submitLabel="Create intake"
        onSubmit={(data) => {
          const label = String(data.get("label")).trim();
          const programmeIds = data.getAll("programmes").map(String);
          if (programmeIds.length === 0) {
            toast({ title: "Choose at least one programme", tone: "warning" });
            return;
          }
          const id = `in-${slugify(label)}-${intakes.length + 1}`;
          setIntakes((list) => [
            ...list,
            { id, label, kind: String(data.get("kind")) as Intake["kind"], start: String(data.get("start")), programmeIds, students: Number(data.get("students")) || 0, status: "enrolling" },
          ]);
          setOpenIntakes((l) => [...l, id]);
          toast({ title: "Intake created", body: `${label} · starts ${formatAccaDate(String(data.get("start")))} · Enrolling` });
          setDrawer(null);
        }}
      >
        {drawer?.kind === "intake" ? <IntakeFields key={drawerKey} programmes={programmes} /> : null}
      </FormDrawer>

      {/* cohort */}
      <FormDrawer
        open={drawer?.kind === "cohort"}
        onClose={() => setDrawer(null)}
        title="Create cohort"
        sub="A cohort studies one or more papers together towards an exam session or semester."
        submitLabel="Create cohort"
        onSubmit={(data) => {
          const name = String(data.get("name")).trim();
          const intakeId = String(data.get("intake"));
          const programmeId = String(data.get("programme"));
          const papers = data.getAll("papers").map(String) as PaperCode[];
          if (papers.length === 0) {
            toast({ title: "Choose at least one paper", tone: "warning" });
            return;
          }
          const programme = programmes.find((p) => p.id === programmeId);
          const session = String(data.get("session") ?? "");
          const semester = Number(data.get("semester")) || undefined;
          const id = `co-${slugify(name)}-${tree.length + 1}`;
          const cohort: TreeCohort = {
            id,
            name,
            type: String(data.get("type")) as CohortType,
            mode: String(data.get("mode")) as Cohort["mode"],
            papers,
            programmeId,
            universityId: programme?.universityId,
            intakeId: programme?.kind === "university" ? intakeId : undefined,
            semester: programme?.kind === "university" ? semester : undefined,
            examSessionId: programme?.kind === "university" ? undefined : ((session || "es-2026-dec") as ExamSessionId),
            facultyIds: [String(data.get("faculty"))],
            mentorId: String(data.get("mentor")),
            size: 0,
            capacity: Number(data.get("capacity")) || 40,
            studentIds: [],
            sections: [],
            schedule: "To be scheduled",
            delivery: programme?.kind === "university" ? "Hybrid" : "Online live",
            startDate: "2026-10-05",
            endDate: "2026-12-06",
            status: "enrolling",
            selectable: programme?.kind !== "university",
            treeIntakeId: intakeId,
            mix: null,
          };
          setTree((list) => [...list, cohort]);
          setOpenIntakes((l) => (l.includes(intakeId) ? l : [...l, intakeId]));
          setOpenCohorts((l) => [...l, id]);
          toast({ title: "Cohort created", body: `${name} · ${intakes.find((i) => i.id === intakeId)?.label} · capacity ${cohort.capacity}` });
          setDrawer(null);
        }}
      >
        {drawer?.kind === "cohort" ? (
          <CohortFields key={drawerKey} intakes={intakes} programmes={programmes} initialIntake={drawer.intakeId ?? intakes[intakes.length - 1].id} />
        ) : null}
      </FormDrawer>

      {/* batch or section */}
      <FormDrawer
        open={drawer?.kind === "section"}
        onClose={() => setDrawer(null)}
        title="Create batch or section"
        sub="Batches split graduate cohorts by day and time. Sections split university cohorts by class group."
        submitLabel="Add to cohort"
        onSubmit={(data) => {
          const cohortId = String(data.get("cohort"));
          const cohort = tree.find((c) => c.id === cohortId);
          if (!cohort) return;
          const size = Number(data.get("size")) || 0;
          const seated = cohort.sections.reduce((n, s) => n + s.size, 0);
          if (seated + size > cohort.capacity) {
            toast({ title: "Over cohort capacity", body: `${cohort.name} seats ${seated} of ${cohort.capacity}. Reduce the size or raise capacity.`, tone: "warning" });
            return;
          }
          const name = String(data.get("name")).trim();
          const section: CohortSection = {
            id: `sec-${slugify(`${cohortId}-${name}`)}-${cohort.sections.length + 1}`,
            cohortId,
            kind: String(data.get("kind")) as CohortSection["kind"],
            name,
            size,
            schedule: String(data.get("schedule")).trim(),
            facultyId: String(data.get("faculty")),
            onlineLink: `https://live.zskillup.com/${slugify(name)}`,
          };
          setTree((list) => list.map((c) => (c.id === cohortId ? { ...c, sections: [...c.sections, section], size: Math.max(c.size, seated + size) } : c)));
          setOpenIntakes((l) => (l.includes(cohort.treeIntakeId) ? l : [...l, cohort.treeIntakeId]));
          setOpenCohorts((l) => (l.includes(cohortId) ? l : [...l, cohortId]));
          toast({ title: `${section.kind === "section" ? "Section" : "Batch"} added`, body: `${name} · ${cohort.name} · ${size} learners` });
          setDrawer(null);
        }}
      >
        {drawer?.kind === "section" ? <SectionFields key={drawerKey} tree={tree} initialCohort={drawer.cohortId ?? tree[0].id} /> : null}
      </FormDrawer>
    </section>
  );
}

/* ------------------------------------------------------------------ drawer field sets */

export function IntakeFields({ programmes }: { programmes: Programme[] }) {
  const [kind, setKind] = useState<Intake["kind"]>("graduate");
  const options = programmes.filter((p) => (kind === "university" ? p.kind === "university" : p.kind !== "university"));
  return (
    <>
      <Field label="Intake name">
        <Input name="label" required defaultValue="January 2027 intake" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Intake type">
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as Intake["kind"])}>
            <option value="graduate">Graduate (open market)</option>
            <option value="university">University</option>
          </Select>
        </Field>
        <Field label="Start date">
          <Input name="start" type="date" required defaultValue="2027-01-11" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Programmes enrolling in this intake</legend>
        <div className="space-y-2" key={kind}>
          {options.map((p) => (
            <Checkbox key={p.id} name="programmes" value={p.id} defaultChecked={kind === "graduate" ? p.kind === "graduate" : false} label={p.name} />
          ))}
        </div>
      </fieldset>
      <Field label="Expected learners">
        <Input name="students" type="number" min={0} defaultValue={60} />
      </Field>
    </>
  );
}

export function CohortFields({ intakes, programmes, initialIntake }: { intakes: Intake[]; programmes: Programme[]; initialIntake: string }) {
  const [intakeId, setIntakeId] = useState(initialIntake);
  const intake = intakes.find((i) => i.id === intakeId);
  const options = programmes.filter((p) => intake?.programmeIds.includes(p.id));
  const [programmeId, setProgrammeId] = useState(options[0]?.id ?? programmes[0].id);
  const programme = programmes.find((p) => p.id === programmeId) ?? options[0] ?? programmes[0];
  const university = programme.kind === "university";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Intake">
          <Select
            name="intake"
            value={intakeId}
            onChange={(e) => {
              setIntakeId(e.target.value);
              const next = programmes.find((p) => intakes.find((i) => i.id === e.target.value)?.programmeIds.includes(p.id));
              if (next) setProgrammeId(next.id);
            }}
          >
            {intakes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Programme">
          <Select name="programme" value={programme.id} onChange={(e) => setProgrammeId(e.target.value)}>
            {(options.length ? options : programmes).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Cohort name">
        <Input
          name="name"
          required
          key={programme.id}
          defaultValue={university ? `${universityById(programme.universityId)?.shortName} · ${intake?.label.replace(" intake", "")} · Semester 1` : "TX · Mar 2027 · Weekend"}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Cohort type">
          <Select name="type" key={`type-${programme.id}`} defaultValue={university ? "university" : "regular"}>
            {(Object.keys(COHORT_TYPE_LABELS) as CohortType[]).map((t) => (
              <option key={t} value={t}>
                {COHORT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mode">
          <Select name="mode" key={`mode-${programme.id}`} defaultValue={university ? "weekday" : "weekend"}>
            <option value="weekday">Weekday</option>
            <option value="weekend">Weekend</option>
          </Select>
        </Field>
        <Field label="Capacity">
          <Input name="capacity" type="number" min={1} defaultValue={university ? 72 : 40} />
        </Field>
      </div>
      {university ? (
        <Field label="Semester">
          <Select name="semester" defaultValue="1">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Exam session">
          <Select name="session" defaultValue="es-2027-mar">
            {BOOKABLE_SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Papers</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" key={`papers-${programme.id}`}>
          {programme.papers.map((code, i) => (
            <Checkbox
              key={code}
              name="papers"
              value={code}
              defaultChecked={university ? i === 0 : code === (programme.papers.includes("TX") ? "TX" : programme.papers[0])}
              label={<span className="font-mono font-semibold">{code}</span>}
            />
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Faculty">
          <Select name="faculty" defaultValue={facultyStaff[0].id}>
            {facultyStaff.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.focusPapers.join(", ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mentor">
          <Select name="mentor" defaultValue={mentorStaff[0].id}>
            {mentorStaff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
}

export function SectionFields({ tree, initialCohort }: { tree: TreeCohort[]; initialCohort: string }) {
  const [cohortId, setCohortId] = useState(initialCohort);
  const cohort = tree.find((c) => c.id === cohortId) ?? tree[0];
  const seated = cohort.sections.reduce((n, s) => n + s.size, 0);
  const university = cohort.type === "university";
  return (
    <>
      <Field label="Cohort">
        <Select name="cohort" value={cohort.id} onChange={(e) => setCohortId(e.target.value)}>
          {tree.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
        {cohort.sections.length} existing {cohort.sections.length === 1 ? "group" : "groups"} · {seated} of {cohort.capacity} seats used ·{" "}
        {universities.find((u) => u.id === cohort.universityId)?.name ?? "Open market"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select name="kind" key={`kind-${cohort.id}`} defaultValue={university ? "section" : "batch"}>
            <option value="batch">Batch</option>
            <option value="section">Section</option>
          </Select>
        </Field>
        <Field label="Size">
          <Input name="size" type="number" min={1} required key={`size-${cohort.id}`} defaultValue={Math.max(1, Math.min(20, cohort.capacity - seated))} />
        </Field>
      </div>
      <Field label="Name">
        <Input name="name" required key={`name-${cohort.id}`} defaultValue={university ? `Section ${String.fromCharCode(65 + cohort.sections.length)}` : "Wednesday evening batch"} />
      </Field>
      <Field label="Schedule">
        <Input name="schedule" required key={`schedule-${cohort.id}`} defaultValue={university ? "Mon and Thu 10:00 to 12:00" : "Wed 19:30 to 21:30"} />
      </Field>
      <Field label="Faculty">
        <Select name="faculty" key={`faculty-${cohort.id}`} defaultValue={cohort.facultyIds[0]}>
          {facultyStaff.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · {f.focusPapers.join(", ")}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ create programme */

function CreateProgrammeDrawer({
  open,
  onClose,
  intakes,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  intakes: Intake[];
  onCreate: (p: Programme) => void;
}) {
  const [kind, setKind] = useState<ProgrammeKind>("graduate");
  const university = kind === "university";
  const defaults: Record<ProgrammeKind, PaperCode[]> = {
    graduate: ["LW", "PM", "TX", "FR", "AA", "FM", "SBL", "SBR"],
    "fast-track": ["PM", "TX", "FR", "AA", "FM"],
    strategic: ["SBL", "SBR", "AFM", "APM", "ATX", "AAA"],
    university: ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"],
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Create programme"
      sub="Graduate and open-market programmes are delivered by ZSkillup. Link a university for an integrated degree route."
      submitLabel="Create programme"
      footerNote="Created as a draft"
      onSubmit={(data) => {
        const name = String(data.get("name")).trim();
        const papers = data.getAll("papers").map(String) as PaperCode[];
        if (papers.length === 0) {
          toast({ title: "Choose at least one paper", tone: "warning" });
          return;
        }
        const universityId = university ? String(data.get("university")) : undefined;
        const uni = universityById(universityId);
        const levels = LEVEL_GROUPS.map((g) => ({ ...g, papers: g.papers.filter((c) => papers.includes(c)) })).filter((g) => g.papers.length);
        onCreate({
          id: `pr-${slugify(name)}`,
          name,
          kind,
          market: university ? "University partnership" : "Open market",
          deliveredBy: university ? `ZSkillup with ${uni?.name}` : "ZSkillup direct",
          universityId,
          learners: 0,
          papers,
          durationMonths: Number(data.get("duration")) || 12,
          structure: levels.map((g, i) => ({ id: `ps-new-${i + 1}`, label: g.label, papers: g.papers, detail: "Recommended order set in the structure builder." })),
          feePlanIds: [],
          intakeIds: data.getAll("intakes").map(String),
          leadId: "st-priya",
          status: "draft",
          description: String(data.get("description")).trim(),
        });
      }}
    >
      <Field label="Programme name">
        <Input name="name" required placeholder="e.g. ACCA Weekend Pathway for working professionals" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Programme type">
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as ProgrammeKind)}>
            {(Object.keys(KIND_LABELS) as ProgrammeKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duration (months)">
          <Input name="duration" type="number" min={3} defaultValue={university ? 36 : 24} key={kind} />
        </Field>
      </div>
      {university ? (
        <Field label="Partner university">
          <Select name="university" defaultValue={universities[0].id}>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
          Open market: learners enrol directly with ZSkillup and choose weekend or weekday cohorts.
        </p>
      )}
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Papers taught</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" key={kind}>
          {accaPapers.map((p) => (
            <Checkbox key={p.code} name="papers" value={p.code} defaultChecked={defaults[kind].includes(p.code)} label={<span className="font-mono font-semibold">{p.code}</span>} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Intakes</legend>
        <div className="space-y-2" key={`in-${kind}`}>
          {intakes
            .filter((i) => (university ? i.kind === "university" : i.kind === "graduate") && i.status !== "closed")
            .map((i) => (
              <Checkbox key={i.id} name="intakes" value={i.id} label={`${i.label} · starts ${formatAccaDate(i.start)}`} />
            ))}
        </div>
      </fieldset>
      <Field label="Description">
        <Textarea name="description" rows={3} required placeholder="Who the programme is for and how it is delivered." />
      </Field>
    </FormDrawer>
  );
}
