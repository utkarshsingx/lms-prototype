"use client";

import { useState } from "react";
import { ClipboardCheck, Download, FileText, PenLine, RotateCcw, Scale, ShieldAlert } from "lucide-react";
import {
  evaluationsForGrader,
  reEvaluationRequests,
  reattemptRequests,
  type EvaluationItem,
  type ReEvaluationRequest,
  type ReattemptRequest,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GradingQueue } from "@/components/grading/queue";
import { EvaluationWorkbench, PlagiarismDrawer, type EvalPatch } from "./grader";
import { ReattemptRequests, type ReattemptPatch } from "./reattempts";
import { ReEvaluation, type ReEvalPatch } from "./re-evaluation";
import { useFaculty } from "./shared";

const TAB_IDS = ["descriptive", "assignments", "reattempts", "reevaluation", "runner"] as const;

const isOpen = (e: EvaluationItem) => e.status !== "graded" && e.status !== "returned";

export function FacultyEvaluationPage({ initialTab }: { initialTab?: string }) {
  const f = useFaculty();
  return <EvaluationView key={f.staffId} initialTab={initialTab} />;
}

function EvaluationView({ initialTab }: { initialTab?: string }) {
  const { staffId, me, papers, canApprove } = useFaculty();
  const [items, setItems] = useState<EvaluationItem[]>(() => evaluationsForGrader(staffId));
  const [reattempts, setReattempts] = useState<ReattemptRequest[]>(() => reattemptRequests.filter((r) => papers.includes(r.paper)));
  const [reEvals, setReEvals] = useState<ReEvaluationRequest[]>(() => reEvaluationRequests.filter((r) => r.panelIds.includes(staffId)));
  const [flagging, setFlagging] = useState<EvaluationItem | null>(null);
  const [workbenchKey, setWorkbenchKey] = useState(0);

  const descriptive = items.filter((e) => e.kind === "descriptive");
  const assignments = items.filter((e) => e.kind !== "descriptive");
  const [tab, setTab] = useState<string>(() => {
    if (initialTab && (TAB_IDS as readonly string[]).includes(initialTab)) return initialTab;
    return descriptive.some(isOpen) || !assignments.some(isOpen) ? "descriptive" : "assignments";
  });

  const toGrade = items.filter(isOpen);
  const flagged = items.filter((e) => e.status === "flagged");
  const pendingReattempts = reattempts.filter((r) => r.status === "pending");
  const activeReEvals = reEvals.filter((r) => r.status === "open" || r.status === "under-review");

  const patchItem = (id: string, patch: EvalPatch) => setItems((all) => all.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Assessment"
        title="Evaluation"
        sub="Grade descriptive answers, grade assignments and projects and provide feedback. Flag plagiarism or academic misconduct, approve reattempts where authorised and participate in re-evaluation."
        badge={<ScopeChip icon={<ClipboardCheck />}>{`${me.name} · ${papers.join(", ")}`}</ScopeChip>}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast({ title: `Report queued: ${papers.join("-").toLowerCase()}-marks-register.csv`, tone: "info" })}
            >
              <Download className="size-4" />
              Export marks
            </Button>
            {toGrade.length ? (
              <Button
                onClick={() => {
                  const next = toGrade.find((e) => e.status !== "flagged") ?? toGrade[0];
                  setTab(next.kind === "descriptive" ? "descriptive" : "assignments");
                  setWorkbenchKey((k) => k + 1);
                }}
              >
                <PenLine className="size-4" />
                Grade next script
              </Button>
            ) : null}
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Scripts to grade"
          value={toGrade.length}
          icon={<PenLine />}
          sub={`${descriptive.filter(isOpen).length} descriptive · ${assignments.filter(isOpen).length} assignments and projects`}
        />
        <KpiTile
          label="Flagged for misconduct"
          value={flagged.length}
          tone={flagged.length ? "rose" : "jade"}
          icon={<ShieldAlert />}
          sub={flagged.length ? "Marks held until reviewed" : "No open cases"}
        />
        <KpiTile
          label="Reattempt requests"
          value={pendingReattempts.length}
          tone={pendingReattempts.length ? "amber" : "jade"}
          icon={<RotateCcw />}
          sub={canApprove ? "Awaiting your decision" : "Approval not authorised for your role"}
        />
        <KpiTile
          label="Re-evaluations"
          value={activeReEvals.length}
          tone="info"
          icon={<Scale />}
          sub={`${reEvals.length} on your panel`}
        />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "descriptive", label: "Descriptive answers", count: descriptive.filter(isOpen).length },
          { id: "assignments", label: "Assignments and projects", count: assignments.filter(isOpen).length },
          { id: "reattempts", label: "Reattempt requests", count: pendingReattempts.length },
          { id: "reevaluation", label: "Re-evaluation", count: activeReEvals.length },
          { id: "runner", label: "Online test scripts" },
        ]}
      />

      {tab === "descriptive" ? (
        <EvaluationWorkbench key={`d-${workbenchKey}`} items={descriptive} label="Descriptive answers" onUpdate={patchItem} onFlag={setFlagging} />
      ) : tab === "assignments" ? (
        <EvaluationWorkbench key={`a-${workbenchKey}`} items={assignments} label="Assignments and projects" onUpdate={patchItem} onFlag={setFlagging} />
      ) : tab === "reattempts" ? (
        <ReattemptRequests
          requests={reattempts}
          onDecide={(id, patch: ReattemptPatch) => setReattempts((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
        />
      ) : tab === "reevaluation" ? (
        <ReEvaluation
          requests={reEvals}
          onUpdate={(id, patch: ReEvalPatch) => setReEvals((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
        />
      ) : (
        <div className="space-y-4">
          <Card className="flex min-w-0 flex-wrap items-start gap-3 p-4.5">
            <FileText aria-hidden className="mt-0.5 size-4.5 shrink-0 text-ink-3" />
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">
              Scripts submitted through the online test runner: written cases, variance reports and mock Section C answers. Objective questions are marked
              automatically and never reach this queue.
            </p>
          </Card>
          <GradingQueue />
        </div>
      )}

      <PlagiarismDrawer
        key={flagging?.id ?? "none"}
        item={flagging}
        open={flagging !== null}
        onClose={() => setFlagging(null)}
        onSubmit={patchItem}
      />
    </div>
  );
}
