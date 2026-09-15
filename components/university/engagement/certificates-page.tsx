"use client";

import { useState } from "react";
import { Award, BadgeCheck, Check, Download, Hourglass, PauseCircle, PlayCircle, ShieldAlert, Stamp, X } from "lucide-react";
import {
  ACCA_TODAY,
  certificateTemplates,
  formatAccaDate,
  jointCertificateRule,
  studentsForUniversity,
  type JointCertCheckId,
  type Student,
} from "@/lib/data/acca";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Drawer } from "@/components/ui/modal";
import { Field, Select, Textarea } from "@/components/ui/field";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { Gated, MiniLabel, UniversityMark, WorkspaceHeader, intakeShort, plural, queueReport, rollNumber, useWorkspace } from "./shared";

type Verification = "verified" | "pending" | "not-started" | "on-hold";

type Row = {
  student: Student;
  eligibility: "eligible" | "on-track" | "at-risk";
  verification: Verification;
  holdReason?: string;
  history: TimelineItem[];
};

const ELIGIBILITY: Record<Row["eligibility"], { label: string; tone: StatusTone }> = {
  eligible: { label: "Eligible", tone: "jade" },
  "on-track": { label: "On track", tone: "info" },
  "at-risk": { label: "At risk", tone: "rose" },
};

const VERIFICATION: Record<Verification, { label: string; tone: StatusTone }> = {
  verified: { label: "Verified by university", tone: "jade" },
  pending: { label: "Pending verification", tone: "amber" },
  "not-started": { label: "Awaiting eligibility", tone: "neutral" },
  "on-hold": { label: "On hold", tone: "rose" },
};

const HOLD_REASONS = [
  "Attendance record under review at the university",
  "Fee query with university accounts",
  "Name or date of birth mismatch on the university record",
  "Academic integrity review in progress",
  "Other",
];

const CRITERIA_SHORT: Record<JointCertCheckId, string> = {
  "applied-knowledge": "Applied Knowledge",
  "lw-passed": "LW passed",
  attendance: "Attendance 75%",
  "no-overdue-fees": "No overdue fees",
};

function CheckCell({ met, detail }: { met: boolean; detail: string }) {
  return (
    <span className="inline-flex max-w-[12rem] min-w-0 items-center gap-1.5" title={detail}>
      <span
        aria-hidden
        className={cn("grid size-5 shrink-0 place-items-center rounded-full", met ? "bg-jade-soft text-jade" : "bg-rose-soft text-rose")}
      >
        {met ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
      </span>
      <span className={cn("truncate text-[12.5px]", met ? "text-ink-2" : "text-ink")}>
        <span className="sr-only">{met ? "Met: " : "Not met: "}</span>
        {detail}
      </span>
    </span>
  );
}

export function CertificatesPage() {
  const { uni, canEdit, reason, persona } = useWorkspace();
  const template = certificateTemplates.find((t) => t.kind === "joint" && t.universityId === uni.id);

  const [rows, setRows] = useState<Row[]>(() =>
    studentsForUniversity(uni.id)
      .filter((s) => s.jointCertificate)
      .map((s) => {
        const jc = s.jointCertificate!;
        const verification: Verification = jc.universityVerification;
        const history: TimelineItem[] = [
          ...(verification === "verified"
            ? [{ id: "h-v", title: "Eligibility verified by the university", meta: `11 Sep 2026 · Dr Suresh Nair`, tone: "jade" as StatusTone }]
            : []),
          ...(jc.status === "eligible"
            ? [{ id: "h-e", title: "All four criteria met", meta: "Eligibility check · 10 Sep 2026", body: "Sent to the university for verification.", tone: "info" as StatusTone }]
            : [{ id: "h-c", title: "Eligibility checked", meta: "Eligibility check · 10 Sep 2026", body: `Still needed: ${jc.missing.join(", ")}.`, tone: "neutral" as StatusTone }]),
        ];
        return { student: s, eligibility: jc.status, verification, history };
      }),
  );

  const [intake, setIntake] = useState("in-2025-jul");
  const [eligibility, setEligibility] = useState("");
  const [verification, setVerification] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [holdIds, setHoldIds] = useState<string[] | null>(null);

  const visible = rows.filter(
    (r) => (!intake || r.student.intakeId === intake) && (!eligibility || r.eligibility === eligibility) && (!verification || r.verification === verification),
  );
  const opened = rows.find((r) => r.student.id === openId) ?? null;

  const cohortRows = rows.filter((r) => r.student.intakeId === "in-2025-jul");
  const stats = {
    eligible: rows.filter((r) => r.eligibility === "eligible").length,
    verified: rows.filter((r) => r.verification === "verified").length,
    pending: rows.filter((r) => r.verification === "pending").length,
    hold: rows.filter((r) => r.verification === "on-hold").length,
    onTrack: cohortRows.filter((r) => r.eligibility !== "at-risk").length,
  };

  const canVerify = (r: Row) => r.eligibility === "eligible" && (r.verification === "pending" || r.verification === "on-hold");
  // A hold is a deliberate stop, so "verify all" only takes learners still pending.
  const verifiable = visible.filter((r) => r.eligibility === "eligible" && r.verification === "pending");
  const notEligibleReason = (r: Row) => `Not eligible yet. Still needed: ${r.student.jointCertificate?.missing.join(", ")}.`;

  const verify = (ids: string[]) => {
    const targets = rows.filter((r) => ids.includes(r.student.id));
    const ok = targets.filter(canVerify);
    const skipped = targets.length - ok.length;
    if (!ok.length) {
      toast({ title: "Nothing to verify", body: `${plural(skipped, "selected learner")} ${skipped === 1 ? "is" : "are"} not eligible yet or already verified.`, tone: "warning" });
      return;
    }
    const okIds = new Set(ok.map((r) => r.student.id));
    setRows((list) =>
      list.map((r) =>
        okIds.has(r.student.id)
          ? {
              ...r,
              verification: "verified",
              holdReason: undefined,
              history: [{ id: `h-${r.history.length + 1}`, title: "Eligibility verified by the university", meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name}`, tone: "jade" }, ...r.history],
            }
          : r,
      ),
    );
    toast({
      title: ok.length === 1 ? `Eligibility verified: ${ok[0].student.name}` : `${ok.length} learners verified`,
      body: `Sent to ZSkillup to issue the joint certificate.${skipped ? ` ${plural(skipped, "learner")} skipped: not eligible yet or already verified.` : ""}`,
    });
  };

  const releaseHold = (r: Row) => {
    setRows((list) =>
      list.map((x) =>
        x.student.id === r.student.id
          ? {
              ...x,
              verification: "pending",
              holdReason: undefined,
              history: [{ id: `h-${x.history.length + 1}`, title: "Hold released", meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name}`, tone: "info" }, ...x.history],
            }
          : x,
      ),
    );
    toast({ title: `Hold released: ${r.student.name}`, body: "Back in the verification queue.", tone: "info" });
  };

  const columns: DataTableColumn<Row>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block text-[12px] text-ink-3">
            <span className="font-mono">{rollNumber(r.student.id)}</span> · Section {r.student.section}
          </span>
        </span>
      ),
    },
    ...jointCertificateRule.criteria.map<DataTableColumn<Row>>((c) => ({
      key: c.id,
      header: CRITERIA_SHORT[c.id],
      sortable: true,
      sortValue: (r) => r.student.jointCertificate?.checks.find((x) => x.id === c.id)?.met ?? false,
      render: (r) => {
        const check = r.student.jointCertificate?.checks.find((x) => x.id === c.id);
        return check ? <CheckCell met={check.met} detail={check.detail} /> : null;
      },
    })),
    {
      key: "eligibility",
      header: "Eligibility",
      sortable: true,
      sortValue: (r) => ["eligible", "on-track", "at-risk"].indexOf(r.eligibility),
      render: (r) => (
        <StatusPill status={r.eligibility} tone={ELIGIBILITY[r.eligibility].tone}>
          {ELIGIBILITY[r.eligibility].label}
        </StatusPill>
      ),
    },
    {
      key: "verification",
      header: "University verification",
      sortable: true,
      sortValue: (r) => ["pending", "on-hold", "verified", "not-started"].indexOf(r.verification),
      render: (r) => (
        <span className="block">
          <StatusPill status={r.verification} tone={VERIFICATION[r.verification].tone}>
            {VERIFICATION[r.verification].label}
          </StatusPill>
          {r.holdReason ? <span className="mt-1 block max-w-[14rem] truncate text-[11.5px] text-ink-3">{r.holdReason}</span> : null}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => {
        const why = !canEdit ? reason : r.eligibility !== "eligible" ? notEligibleReason(r) : r.verification === "verified" ? "Already verified" : undefined;
        return (
          <span className="inline-flex gap-1.5">
            {r.verification === "on-hold" ? (
              <Gated allowed={canEdit} reason={reason} size="xs" variant="outline" onClick={() => releaseHold(r)}>
                Release hold
              </Gated>
            ) : (
              <Gated allowed={canEdit && r.eligibility === "eligible" && r.verification !== "verified"} reason={why} size="xs" variant="outline" onClick={() => setHoldIds([r.student.id])}>
                Hold with reason
              </Gated>
            )}
            <Gated allowed={canEdit && canVerify(r)} reason={why} size="xs" onClick={() => verify([r.student.id])}>
              Verify
            </Gated>
          </span>
        );
      },
    },
  ];

  const holdTargets = rows.filter((r) => holdIds?.includes(r.student.id));

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <WorkspaceHeader
        section="Administration"
        title="Joint certificates"
        sub={`Verify joint-certificate eligibility for ${uni.programmeName} learners. ZSkillup issues the joint certificate once the university verifies.`}
        actions={
          <Button variant="outline" onClick={() => queueReport(`${uni.workspace.slug}-joint-certificate-eligibility.csv`, `${rows.length} learners with criteria and verification status`)}>
            <Download className="size-4" />
            Export eligibility
          </Button>
        }
      />

      <Card className="min-w-0 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <UniversityMark uni={uni} size="md" />
              <span aria-hidden className="text-[13px] font-bold text-ink-3">×</span>
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-surface-inv text-cta">
                <Stamp className="size-5" />
              </span>
              <div className="min-w-0">
                <MiniLabel>Joint certificate rule</MiniLabel>
                <p className="truncate text-[13px] text-ink-2">{jointCertificateRule.issuers.join(" and ")}</p>
              </div>
            </div>
            <h2 className="mt-4 font-display text-[21px] leading-tight font-bold tracking-[-0.02em] text-ink">{jointCertificateRule.title}</h2>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {jointCertificateRule.criteria.map((c, i) => (
                <li key={c.id} className="flex min-w-0 items-start gap-2.5 rounded-[12px] border border-line bg-surface-2 px-3 py-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-inv font-mono text-[11px] font-bold text-ink-inv">{i + 1}</span>
                  <span className="min-w-0 text-[13px] leading-snug text-ink">{c.label}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-w-0 border-t border-line bg-surface-2 p-5 sm:p-6 lg:border-t-0 lg:border-l">
            <MiniLabel>Signatories</MiniLabel>
            <ul className="mt-2 space-y-1.5">
              {(template?.signatories ?? []).map((s) => (
                <li key={s} className="flex items-center gap-2 text-[13px] text-ink">
                  <BadgeCheck aria-hidden className="size-4 shrink-0 text-jade" />
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ul>
            <MiniLabel className="mt-5">2025 intake on track</MiniLabel>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={uni.headline.jointCertOnTrackPct} tone="brand" className="flex-1" height={8} />
              <span className="font-display text-[22px] leading-none font-bold text-ink tnum">{uni.headline.jointCertOnTrackPct}%</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-3">
              Of all 71 learners in the 2025 intake. Certificates issued so far: {template?.issued ?? 0}. The first full eligibility check runs after Semester 3 results.
            </p>
          </div>
        </div>
      </Card>

      <KpiRow cols={4}>
        <KpiTile label="Eligible now" value={stats.eligible} tone="jade" icon={<Award />} sub="All four criteria met" />
        <KpiTile label="Pending verification" value={stats.pending} tone="amber" icon={<Hourglass />} sub={stats.hold ? `${stats.hold} on hold` : "Waiting for the university"} />
        <KpiTile label="Verified by university" value={stats.verified} icon={<BadgeCheck />} sub="Ready for ZSkillup to issue" />
        <KpiTile
          label="On track in the listed 2025 records"
          value={`${stats.onTrack} of ${cohortRows.length}`}
          tone="info"
          icon={<ShieldAlert />}
          sub={`${cohortRows.length - stats.onTrack} at risk`}
        />
      </KpiRow>

      <DataTable
        caption="Joint-certificate eligibility"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.student.id}
        onRowClick={(r) => setOpenId(r.student.id)}
        rowLabel={(r) => `Open ${r.student.name}`}
        initialSort={{ key: "eligibility", dir: "asc" }}
        pageSize={12}
        selectable={canEdit}
        toolbar={
          <Gated
            allowed={canEdit && verifiable.length > 0}
            reason={!canEdit ? reason : "No eligible learner in this view is waiting for verification."}
            size="sm"
            onClick={() => verify(verifiable.map((r) => r.student.id))}
          >
            <BadgeCheck className="size-4" />
            Verify all eligible · {verifiable.length}
          </Gated>
        }
        search={{ placeholder: "Search student or roll number", match: (r, q) => r.student.name.toLowerCase().includes(q) || rollNumber(r.student.id).toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(intake !== "in-2025-jul" || eligibility || verification)}
            onClear={() => {
              setIntake("in-2025-jul");
              setEligibility("");
              setVerification("");
            }}
          >
            <FilterSelect
              label="Intake"
              allLabel="Both"
              value={intake}
              onChange={setIntake}
              options={[...new Set(rows.map((r) => r.student.intakeId))].sort().map((id) => ({ value: id, label: intakeShort(id) }))}
            />
            <FilterSelect
              label="Eligibility"
              allLabel="Any"
              value={eligibility}
              onChange={setEligibility}
              options={Object.entries(ELIGIBILITY).map(([value, v]) => ({ value, label: v.label }))}
            />
            <FilterSelect
              label="Verification"
              allLabel="Any"
              value={verification}
              onChange={setVerification}
              options={Object.entries(VERIFICATION).map(([value, v]) => ({ value, label: v.label }))}
            />
          </FilterBar>
        }
        bulkActions={(ids, clear) => (
          <>
            <Button
              size="sm"
              variant="inverse"
              onClick={() => {
                const eligibleIds = rows.filter((r) => ids.includes(r.student.id) && r.eligibility === "eligible" && r.verification !== "verified").map((r) => r.student.id);
                if (!eligibleIds.length) {
                  toast({ title: "Only eligible learners can be put on hold", tone: "warning" });
                  return;
                }
                setHoldIds(eligibleIds);
                clear();
              }}
            >
              <PauseCircle className="size-4" />
              Hold with reason
            </Button>
            <Button
              size="sm"
              onClick={() => {
                verify(ids);
                clear();
              }}
            >
              <BadgeCheck className="size-4" />
              Verify eligibility
            </Button>
          </>
        )}
      />
      <p className="text-[12px] text-ink-3">
        Criteria are checked from ACCA results, attendance in ACCA sessions and fee records. Headline figures cover all {uni.headline.students} students; the table lists
        the {rows.length} learner records synced to this workspace.
      </p>

      <Drawer
        open={opened != null}
        onClose={() => setOpenId(null)}
        title={opened?.student.name ?? "Learner"}
        sub={opened ? `${rollNumber(opened.student.id)} · ${intakeShort(opened.student.intakeId)} · Semester ${opened.student.semester} · Section ${opened.student.section}` : undefined}
        width="w-full max-w-lg"
        footer={
          opened ? (
            <>
              {opened.verification === "on-hold" ? (
                <Gated allowed={canEdit} reason={reason} variant="outline" onClick={() => releaseHold(opened)}>
                  <PlayCircle className="size-4" />
                  Release hold
                </Gated>
              ) : (
                <Gated
                  allowed={canEdit && opened.eligibility === "eligible" && opened.verification !== "verified"}
                  reason={!canEdit ? reason : opened.eligibility !== "eligible" ? notEligibleReason(opened) : "Already verified"}
                  variant="outline"
                  onClick={() => setHoldIds([opened.student.id])}
                >
                  <PauseCircle className="size-4" />
                  Hold with reason
                </Gated>
              )}
              <Gated
                allowed={canEdit && canVerify(opened)}
                reason={!canEdit ? reason : opened.eligibility !== "eligible" ? notEligibleReason(opened) : "Already verified"}
                onClick={() => verify([opened.student.id])}
              >
                <BadgeCheck className="size-4" />
                Verify eligibility
              </Gated>
            </>
          ) : null
        }
      >
        {opened ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={opened.eligibility} tone={ELIGIBILITY[opened.eligibility].tone}>
                {ELIGIBILITY[opened.eligibility].label}
              </StatusPill>
              <StatusPill status={opened.verification} tone={VERIFICATION[opened.verification].tone}>
                {VERIFICATION[opened.verification].label}
              </StatusPill>
            </div>
            {opened.holdReason ? (
              <p className="rounded-[12px] border border-rose/30 bg-rose-soft px-3.5 py-2.5 text-[13px] text-ink">
                <span className="font-semibold">On hold:</span> {opened.holdReason}
              </p>
            ) : null}
            <div>
              <MiniLabel className="mb-2">Criteria</MiniLabel>
              <ul className="divide-y divide-line rounded-[14px] border border-line">
                {opened.student.jointCertificate?.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-3.5 py-3">
                    <span
                      aria-hidden
                      className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", c.met ? "bg-jade-soft text-jade" : "bg-rose-soft text-rose")}
                    >
                      {c.met ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-ink">{c.label}</span>
                      <span className="block text-[12.5px] text-ink-3">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <MiniLabel className="mb-3">Verification history</MiniLabel>
              <Timeline dense items={opened.history} />
            </div>
          </div>
        ) : null}
      </Drawer>

      <FormDrawer
        open={holdIds != null}
        onClose={() => setHoldIds(null)}
        title="Hold with reason"
        sub={holdTargets.length === 1 ? `${holdTargets[0].student.name} stays unverified until the hold is released.` : `${plural(holdTargets.length, "learner")} stay unverified until the hold is released.`}
        submitLabel="Put on hold"
        destructive
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="The Programme Admin team sees the reason."
        onSubmit={(data) => {
          const why = String(data.get("reason"));
          const note = String(data.get("note") ?? "").trim();
          const text = note ? `${why}. ${note}` : why;
          const ids = new Set(holdIds ?? []);
          setRows((list) =>
            list.map((r) =>
              ids.has(r.student.id)
                ? {
                    ...r,
                    verification: "on-hold",
                    holdReason: text,
                    history: [{ id: `h-${r.history.length + 1}`, title: "Put on hold", meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name}`, body: text, tone: "rose" }, ...r.history],
                  }
                : r,
            ),
          );
          toast({
            title: holdTargets.length === 1 ? `On hold: ${holdTargets[0].student.name}` : `${holdTargets.length} learners on hold`,
            body: why,
            tone: "warning",
          });
          setHoldIds(null);
        }}
      >
        <Field label="Reason">
          <Select name="reason" defaultValue={HOLD_REASONS[0]}>
            {HOLD_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Note" hint="Optional">
          <Textarea name="note" rows={4} placeholder="e.g. Semester 2 attendance register being re-checked by the Commerce office. Expected by 25 Sep." />
        </Field>
      </FormDrawer>
    </div>
  );
}
