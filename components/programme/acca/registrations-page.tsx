"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  FileUp,
  IdCard,
  Pencil,
  Send,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  ACCA_TODAY,
  accaFeesGBP,
  daysBetween,
  formatAccaDate,
  formatGBP,
  programmeById,
  students as allStudents,
  universities,
  universityById,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural, useEditAccess } from "./common";

/* ------------------------------------------------------------------ model */

type RegStatus = "not-started" | "documents-pending" | "submitted" | "registered";
type SubStatus = "paid" | "due" | "overdue" | "not-applicable";

const REG_STAGES: { id: RegStatus; label: string; tone: StatusTone; hint: string }[] = [
  { id: "not-started", label: "Not started", tone: "neutral", hint: "Waiting on exemption documents" },
  { id: "documents-pending", label: "Documents pending", tone: "amber", hint: "ID proof or registration forms missing" },
  { id: "submitted", label: "Submitted", tone: "info", hint: "Application with ACCA" },
  { id: "registered", label: "Registered", tone: "jade", hint: "ACCA student ID issued" },
];
const REG_LABEL = Object.fromEntries(REG_STAGES.map((s) => [s.id, s])) as Record<RegStatus, (typeof REG_STAGES)[number]>;

const SUB_META: Record<SubStatus, { label: string; tone: StatusTone }> = {
  paid: { label: "Paid", tone: "jade" },
  due: { label: "Due 1 Jan 2027", tone: "amber" },
  overdue: { label: "Overdue", tone: "rose" },
  "not-applicable": { label: "Not applicable", tone: "neutral" },
};

const NEXT_SUBSCRIPTION = "2027-01-01";
const SUB_FEE = accaFeesGBP.annualSubscription;

type RegRow = {
  id: string;
  name: string;
  email: string;
  type: Student["type"];
  programme: string;
  universityId?: string;
  accaId: string | null;
  reg: RegStatus;
  regDate?: string;
  regNote?: string;
  sub: SubStatus;
  subPaidOn?: string;
};

function regStatusOf(s: Student): RegStatus {
  if (s.registration.status === "registered") return "registered";
  const note = (s.registration.note ?? "").toLowerCase();
  if (s.registration.status === "pending") return note.includes("submitted") ? "submitted" : "documents-pending";
  return note.includes("documents not yet received") ? "documents-pending" : "not-started";
}

/** Learners registered during 2026 have not yet paid a subscription: the first one falls due on 1 January 2027. */
function subStatusOf(s: Student): SubStatus {
  if (s.subscription.status === "overdue") return "overdue";
  if (s.subscription.status === "not-applicable") return "not-applicable";
  return (s.registration.date ?? "") >= "2026-01-01" ? "due" : "paid";
}

function toRow(s: Student): RegRow {
  const sub = subStatusOf(s);
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    type: s.type,
    programme: programmeById(s.programmeId)?.name ?? "ACCA programme",
    universityId: s.universityId,
    accaId: s.accaId,
    reg: regStatusOf(s),
    regDate: s.registration.date,
    regNote: s.registration.note,
    sub,
    subPaidOn: sub === "paid" ? s.subscription.paidOn : undefined,
  };
}

const SEED: RegRow[] = allStudents.map(toRow);

/** IDs in the sample myACCA export, matched to the learners whose applications were submitted. */
const IMPORT_IDS = ["5184402", "5184417", "5190236", "5190251", "5190268"];

const TEMPLATES = [
  {
    id: "documents",
    label: "Registration documents needed",
    body: "Hello {name}, please upload your photo ID and signed ACCA registration form so we can submit your ACCA registration this week.",
  },
  {
    id: "due",
    label: "ACCA annual subscription due 1 Jan 2027",
    body: "Hello {name}, your ACCA annual subscription of £138 is due on 1 January 2027. Pay it in myACCA and reply with the receipt so we can record it.",
  },
  {
    id: "overdue",
    label: "ACCA annual subscription overdue",
    body: "Hello {name}, your ACCA annual subscription is overdue. ACCA may block exam entry until it is paid. Pay it in myACCA today and share the receipt.",
  },
] as const;

const DAYS_TO_SUBSCRIPTION = daysBetween(ACCA_TODAY, NEXT_SUBSCRIPTION);

/* ------------------------------------------------------------------ ACCA ID cell */

function AccaIdCell({
  row,
  canEdit,
  reason,
  owners,
  onSave,
}: {
  row: RegRow;
  canEdit: boolean;
  reason?: string;
  owners: Map<string, string>;
  onSave: (row: RegRow, id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.accaId ?? "");
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setValue(row.accaId ?? "");
    setError(null);
    setEditing(true);
  };
  const save = () => {
    const v = value.trim();
    if (!/^\d{7}$/.test(v)) {
      setError("ACCA student IDs are 7 digits");
      return;
    }
    const owner = owners.get(v);
    if (owner && owner !== row.id) {
      setError(`Already used by ${SEED.find((r) => r.id === owner)?.name ?? "another learner"}`);
      return;
    }
    onSave(row, v);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        {row.accaId ? (
          <span className="font-mono text-[12.5px] font-semibold text-ink tnum">{row.accaId}</span>
        ) : (
          <span className="text-[12.5px] text-ink-3">Not issued</span>
        )}
        <span title={canEdit ? undefined : reason} className="inline-flex">
          <IconButton
            size="xs"
            label={`${row.accaId ? "Edit" : "Add"} ACCA ID for ${row.name}`}
            disabled={!canEdit}
            onClick={start}
          >
            <Pencil className="size-3.5" />
          </IconButton>
        </span>
      </span>
    );
  }

  return (
    <span className="block">
      <span className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          inputMode="numeric"
          maxLength={7}
          aria-label={`ACCA student ID for ${row.name}`}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="7 digits"
          className={cn(
            "h-8 w-24 rounded-[10px] border bg-surface px-2 font-mono text-[12.5px] text-ink tnum focus:shadow-[0_0_0_3px_var(--ring-cta)] focus:outline-none",
            error ? "border-rose" : "border-line-strong focus:border-ink",
          )}
        />
        <IconButton size="xs" variant="secondary" label="Save ACCA ID" onClick={save}>
          <Check className="size-3.5" />
        </IconButton>
        <IconButton size="xs" label="Cancel" onClick={() => setEditing(false)}>
          <X className="size-3.5" />
        </IconButton>
      </span>
      {error ? <span className="mt-1 block text-[11.5px] font-medium text-rose">{error}</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ page */

export function RegistrationsPage() {
  const { canEdit, reason } = useEditAccess("programme:acca");

  const [rows, setRows] = useState<RegRow[]>(SEED);
  const [regFilter, setRegFilter] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [uniFilter, setUniFilter] = useState("");

  const [editing, setEditing] = useState<RegRow | null>(null);
  const [reminding, setReminding] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFiles, setImportFiles] = useState<string[]>([]);

  const owners = useMemo(() => new Map(rows.filter((r) => r.accaId).map((r) => [r.accaId as string, r.id])), [rows]);

  const counts = useMemo(() => {
    const reg = { "not-started": 0, "documents-pending": 0, submitted: 0, registered: 0 } as Record<RegStatus, number>;
    const sub = { paid: 0, due: 0, overdue: 0, "not-applicable": 0 } as Record<SubStatus, number>;
    for (const r of rows) {
      reg[r.reg]++;
      sub[r.sub]++;
    }
    return { reg, sub, missingIds: rows.filter((r) => !r.accaId).length };
  }, [rows]);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!regFilter || r.reg === regFilter) &&
          (!subFilter || r.sub === subFilter) &&
          (!typeFilter || r.type === typeFilter) &&
          (!uniFilter || (uniFilter === "direct" ? !r.universityId : r.universityId === uniFilter)),
      ),
    [rows, regFilter, subFilter, typeFilter, uniFilter],
  );

  const importable = rows.filter((r) => r.reg === "submitted" && !r.accaId);

  const update = (id: string, patch: Partial<RegRow>) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const saveId = (row: RegRow, id: string) => {
    const becomesRegistered = row.reg !== "registered";
    update(row.id, {
      accaId: id,
      ...(becomesRegistered
        ? { reg: "registered" as const, regDate: ACCA_TODAY, regNote: undefined, sub: "due" as const }
        : {}),
    });
    toast({
      title: `ACCA ID ${id} saved`,
      body: becomesRegistered ? `${row.name} is now marked Registered. First subscription due 1 Jan 2027.` : row.name,
    });
  };

  const markSubscriptionPaid = (ids: string[]) => {
    const target = rows.filter((r) => ids.includes(r.id) && (r.sub === "overdue" || r.sub === "due"));
    if (target.length === 0) {
      toast({ title: "Nothing to record", body: "The selected learners have no subscription due or overdue.", tone: "info" });
      return;
    }
    setRows((list) =>
      list.map((r) => (target.some((t) => t.id === r.id) ? { ...r, sub: "paid", subPaidOn: ACCA_TODAY } : r)),
    );
    toast({
      title: `${plural(target.length, "subscription")} recorded as paid`,
      body: `${formatGBP(SUB_FEE * target.length)} paid to ACCA, recorded ${formatAccaDate(ACCA_TODAY)}.`,
    });
  };

  const clearFilters = () => {
    setRegFilter("");
    setSubFilter("");
    setTypeFilter("");
    setUniFilter("");
  };

  const columns: DataTableColumn<RegRow>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.name}</span>
          <span className="block text-[12px] text-ink-3">
            {r.universityId ? universityById(r.universityId)?.shortName : "ZSkillup direct"} · {r.type === "graduate" ? "Graduate" : "Undergraduate"}
          </span>
        </span>
      ),
    },
    {
      key: "accaId",
      header: "ACCA student ID",
      sortable: true,
      sortValue: (r) => r.accaId,
      render: (r) => <AccaIdCell row={r} canEdit={canEdit} reason={reason} owners={owners} onSave={saveId} />,
    },
    {
      key: "reg",
      header: "ACCA registration",
      sortable: true,
      sortValue: (r) => REG_STAGES.findIndex((s) => s.id === r.reg),
      render: (r) => (
        <span className="block">
          <StatusPill status={REG_LABEL[r.reg].label} tone={REG_LABEL[r.reg].tone} />
          <span className="mt-1 block max-w-60 truncate text-[12px] text-ink-3" title={r.regNote}>
            {r.reg === "registered" && r.regDate
              ? `Registered ${formatAccaDate(r.regDate)}`
              : (r.regNote ?? (r.regDate ? `Started ${formatAccaDate(r.regDate)}` : "No application yet"))}
          </span>
        </span>
      ),
    },
    {
      key: "sub",
      header: "Annual subscription",
      sortable: true,
      sortValue: (r) => ["overdue", "due", "paid", "not-applicable"].indexOf(r.sub),
      render: (r) => (
        <span className="block">
          <StatusPill status={SUB_META[r.sub].label} tone={SUB_META[r.sub].tone} />
          <span className="mt-1 block text-[12px] text-ink-3">
            {r.sub === "paid"
              ? `${r.subPaidOn === ACCA_TODAY ? `Recorded ${formatAccaDate(ACCA_TODAY)}` : "2026 paid"} · next due 1 Jan 2027`
              : r.sub === "due"
                ? `First subscription · ${formatGBP(SUB_FEE)}`
                : r.sub === "overdue"
                  ? `${formatGBP(SUB_FEE)} was due 1 Jan 2026`
                  : "Starts after registration"}
          </span>
        </span>
      ),
    },
    {
      key: "programme",
      header: "Programme",
      sortable: true,
      className: "text-ink-2",
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => (
        <Button type="button" size="xs" variant="outline" onClick={() => setEditing(r)}>
          {canEdit ? "Update" : "View"}
        </Button>
      ),
    },
  ];

  const remindRows = rows.filter((r) => (reminding ?? []).includes(r.id));
  const defaultTemplate = remindRows.some((r) => r.sub === "overdue")
    ? "overdue"
    : remindRows.some((r) => r.reg !== "registered")
      ? "documents"
      : "due";
  const [templateId, setTemplateId] = useState<string>("overdue");

  const openReminder = (ids: string[]) => {
    const target = rows.filter((r) => ids.includes(r.id));
    setTemplateId(
      target.some((r) => r.sub === "overdue") ? "overdue" : target.some((r) => r.reg !== "registered") ? "documents" : "due",
    );
    setReminding(ids);
  };

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES.find((t) => t.id === defaultTemplate)!;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="ACCA operations"
        title="Registrations"
        sub="Maintain ACCA student IDs, track ACCA registration and track annual subscriptions for every enrolled learner."
        badge={canEdit ? undefined : <ViewOnlyChip />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast({ title: "Report queued: acca-registrations.csv", tone: "info" })}
            >
              <Download className="size-4" /> Export
            </Button>
            <GatedButton allowed={canEdit} reason={reason} onClick={() => setImportOpen(true)}>
              <FileUp className="size-4" /> Import from myACCA
            </GatedButton>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Registered with ACCA"
          value={`${counts.reg.registered} of ${rows.length}`}
          sub={`${Math.round((counts.reg.registered / rows.length) * 100)}% of listed learners`}
          icon={<UserCheck />}
        />
        <KpiTile
          label="ACCA student IDs to record"
          value={counts.missingIds}
          tone="amber"
          icon={<IdCard />}
          sub="Registration not yet complete"
        />
        <KpiTile
          label="Subscriptions overdue"
          value={counts.sub.overdue}
          tone="rose"
          icon={<AlertTriangle />}
          sub={`${formatGBP(counts.sub.overdue * SUB_FEE)} owed to ACCA`}
        />
        <KpiTile
          label="First subscription due 1 Jan 2027"
          value={counts.sub.due}
          tone="info"
          icon={<Wallet />}
          sub={`in ${DAYS_TO_SUBSCRIPTION} days`}
        />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Track ACCA registration"
            sub="Every learner moves from documents to an ACCA student ID. Select a stage to filter the table."
          />
          <div className="grid grid-cols-2 gap-2.5 px-5 pb-5 sm:grid-cols-4">
            {REG_STAGES.map((stage, i) => {
              const active = regFilter === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRegFilter(active ? "" : stage.id)}
                  className={cn(
                    "relative min-w-0 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
                    active ? "border-ink bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <StatusPill status={stage.label} tone={stage.tone} size="sm" />
                    {i < REG_STAGES.length - 1 ? (
                      <ArrowRight aria-hidden className="hidden size-3.5 text-ink-3 sm:block" />
                    ) : null}
                  </span>
                  <span className="mt-2 block font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-ink tnum">
                    {counts.reg[stage.id]}
                  </span>
                  <span className="mt-1.5 block text-[12px] leading-snug text-ink-3">{stage.hint}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Track annual subscriptions"
            sub={`ACCA subscription ${formatGBP(SUB_FEE)} is due every 1 January. Paid to ACCA and recorded here.`}
          />
          <div className="space-y-3.5 px-5 pb-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              {(["paid", "due", "overdue", "not-applicable"] as SubStatus[]).map((k) => (
                <span
                  key={k}
                  className={cn(
                    "h-full",
                    { paid: "bg-jade", due: "bg-amber", overdue: "bg-rose", "not-applicable": "bg-line-strong" }[k],
                  )}
                  style={{ width: `${(counts.sub[k] / rows.length) * 100}%` }}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {(["paid", "due", "overdue", "not-applicable"] as SubStatus[]).map((k) => {
                const active = subFilter === k;
                return (
                  <li key={k} className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSubFilter(active ? "" : k)}
                      className={cn(
                        "flex w-full min-w-0 items-center justify-between gap-2 rounded-[10px] border px-2.5 py-2 text-left transition-colors",
                        active ? "border-ink bg-cta-soft" : "border-line hover:bg-cta-soft",
                      )}
                    >
                      <StatusPill status={SUB_META[k].label} tone={SUB_META[k].tone} size="sm" />
                      <span className="font-mono text-[13px] font-semibold text-ink tnum">{counts.sub[k]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <GatedButton
                size="sm"
                variant="secondary"
                allowed={canEdit}
                reason={reason}
                disabled={counts.sub.overdue === 0}
                onClick={() => openReminder(rows.filter((r) => r.sub === "overdue").map((r) => r.id))}
              >
                <Send className="size-3.5" /> Remind overdue ({counts.sub.overdue})
              </GatedButton>
              <GatedButton
                size="sm"
                variant="outline"
                allowed={canEdit}
                reason={reason}
                disabled={counts.sub.due === 0}
                onClick={() => openReminder(rows.filter((r) => r.sub === "due").map((r) => r.id))}
              >
                Remind due 1 Jan ({counts.sub.due})
              </GatedButton>
            </div>
          </div>
        </Card>
      </div>

      <section className="space-y-3.5">
        <SectionTitle>Maintain ACCA student IDs</SectionTitle>
        <DataTable
          caption="ACCA registrations"
          rows={visible}
          columns={columns}
          getRowId={(r) => r.id}
          initialSort={{ key: "reg", dir: "asc" }}
          search={{
            placeholder: "Search name, email or ACCA ID",
            match: (r, q) =>
              r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.accaId ?? "").includes(q),
          }}
          filters={
            <FilterBar active={Boolean(regFilter || subFilter || typeFilter || uniFilter)} onClear={clearFilters}>
              <FilterSelect
                label="Registration"
                value={regFilter}
                onChange={setRegFilter}
                allLabel="All"
                options={REG_STAGES.map((s) => ({ value: s.id, label: s.label }))}
              />
              <FilterSelect
                label="Subscription"
                value={subFilter}
                onChange={setSubFilter}
                allLabel="All"
                options={(Object.keys(SUB_META) as SubStatus[]).map((k) => ({ value: k, label: SUB_META[k].label }))}
              />
              <FilterSelect
                label="Type"
                value={typeFilter}
                onChange={setTypeFilter}
                allLabel="All"
                options={[
                  { value: "graduate", label: "Graduate" },
                  { value: "undergraduate", label: "Undergraduate" },
                ]}
              />
              <FilterSelect
                label="University"
                value={uniFilter}
                onChange={setUniFilter}
                allLabel="All"
                options={[{ value: "direct", label: "ZSkillup direct" }, ...universities.map((u) => ({ value: u.id, label: u.shortName }))]}
              />
            </FilterBar>
          }
          selectable
          bulkActions={(ids, clear) => (
            <>
              <GatedButton
                size="sm"
                allowed={canEdit}
                reason={reason}
                onClick={() => {
                  openReminder(ids);
                  clear();
                }}
              >
                <Send className="size-3.5" /> Send reminder
              </GatedButton>
              <GatedButton
                size="sm"
                variant="inverse"
                allowed={canEdit}
                reason={reason}
                onClick={() => {
                  markSubscriptionPaid(ids);
                  clear();
                }}
              >
                <Wallet className="size-3.5" /> Mark subscription paid
              </GatedButton>
              <Button
                type="button"
                size="sm"
                variant="inverse"
                onClick={() => {
                  toast({ title: `Report queued: acca-registrations-${ids.length}-selected.csv`, tone: "info" });
                  clear();
                }}
              >
                <Download className="size-3.5" /> Export
              </Button>
            </>
          )}
        />
      </section>

      {/* ---------------------------------------------------------- record drawer */}
      <FormDrawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? editing.name : "Registration record"}
        sub={editing ? `${editing.programme} · ${editing.email}` : undefined}
        submitLabel="Save record"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote={canEdit ? "Changes are logged in the audit trail." : undefined}
        onSubmit={(data) => {
          if (!editing) return;
          const accaId = String(data.get("accaId") ?? "").trim();
          const reg = String(data.get("reg")) as RegStatus;
          const sub = String(data.get("sub")) as SubStatus;
          if (accaId && !/^\d{7}$/.test(accaId)) {
            toast({ title: "ACCA student IDs are 7 digits", tone: "warning" });
            return;
          }
          if (accaId && owners.get(accaId) && owners.get(accaId) !== editing.id) {
            toast({ title: `${accaId} is already recorded for another learner`, tone: "warning" });
            return;
          }
          if (reg === "registered" && !accaId) {
            toast({ title: "Add the ACCA student ID to mark this learner Registered", tone: "warning" });
            return;
          }
          update(editing.id, {
            accaId: accaId || null,
            reg,
            regDate: String(data.get("regDate") || "") || undefined,
            regNote: String(data.get("regNote") ?? "").trim() || undefined,
            sub: reg === "registered" ? sub : "not-applicable",
            subPaidOn: sub === "paid" && editing.sub !== "paid" ? ACCA_TODAY : editing.subPaidOn,
          });
          toast({ title: "Registration record updated", body: `${editing.name} · ${REG_LABEL[reg].label}` });
          setEditing(null);
        }}
      >
        {editing ? (
          <>
            <Field label="ACCA student ID" hint="7 digits">
              <Input
                key={`${editing.id}-id`}
                name="accaId"
                defaultValue={editing.accaId ?? ""}
                inputMode="numeric"
                maxLength={7}
                pattern="[0-9]{7}"
                placeholder="e.g. 4382917"
                className="font-mono"
                disabled={!canEdit}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registration status">
                <Select key={`${editing.id}-reg`} name="reg" defaultValue={editing.reg} disabled={!canEdit}>
                  {REG_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Registration date">
                <Input
                  key={`${editing.id}-date`}
                  type="date"
                  name="regDate"
                  defaultValue={editing.regDate ?? ""}
                  disabled={!canEdit}
                />
              </Field>
            </div>
            <Field label="Registration note" hint="Optional">
              <Textarea
                key={`${editing.id}-note`}
                name="regNote"
                rows={2}
                defaultValue={editing.regNote ?? ""}
                placeholder="e.g. Awaiting ID proof upload before submission"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Annual subscription" hint="Recorded once registered">
              <Select key={`${editing.id}-sub`} name="sub" defaultValue={editing.sub} disabled={!canEdit}>
                {(Object.keys(SUB_META) as SubStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {SUB_META[k].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Note icon={<Wallet />}>
              ACCA registration fee {formatGBP(accaFeesGBP.registration)} and annual subscription {formatGBP(SUB_FEE)} are paid
              by the learner to ACCA. They are recorded here for tracking only.
            </Note>
          </>
        ) : null}
      </FormDrawer>

      {/* ---------------------------------------------------------- reminder drawer */}
      <FormDrawer
        open={reminding !== null}
        onClose={() => setReminding(null)}
        title="Send reminder"
        sub={`${plural(remindRows.length, "learner")} selected`}
        submitLabel={`Send to ${plural(remindRows.length, "learner")}`}
        disabled={!canEdit || remindRows.length === 0}
        disabledReason={reason}
        footerNote="Uses an approved message template."
        onSubmit={(data) => {
          const channels = data.getAll("channel").map(String);
          if (channels.length === 0) {
            toast({ title: "Choose at least one channel", tone: "warning" });
            return;
          }
          toast({
            title: `Reminder sent to ${plural(remindRows.length, "learner")}`,
            body: `${template.label} · ${channels.join(", ")}`,
          });
          setReminding(null);
        }}
      >
        <Field label="Template">
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} name="template">
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Channels</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Checkbox name="channel" value="In-app" defaultChecked label="In-app" />
            <Checkbox name="channel" value="Email" defaultChecked label="Email" />
            <Checkbox name="channel" value="WhatsApp" label="WhatsApp" />
          </div>
        </fieldset>
        <div>
          <MiniLabel className="mb-2">Preview</MiniLabel>
          <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5 text-[13px] leading-relaxed text-ink">
            {template.body.replace("{name}", remindRows[0]?.name.split(" ")[0] ?? "there")}
          </div>
        </div>
        <div>
          <MiniLabel className="mb-2">Recipients</MiniLabel>
          <ul className="flex flex-wrap gap-1.5">
            {remindRows.slice(0, 12).map((r) => (
              <li key={r.id} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] text-ink-2">
                {r.name}
              </li>
            ))}
            {remindRows.length > 12 ? (
              <li className="px-1 text-[12px] text-ink-3">+{remindRows.length - 12} more</li>
            ) : null}
          </ul>
        </div>
      </FormDrawer>

      {/* ---------------------------------------------------------- import drawer */}
      <FormDrawer
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportFiles([]);
        }}
        title="Import from myACCA"
        sub="Match the ACCA student IDs in an export file to learners whose applications were submitted."
        submitLabel={importFiles.length ? `Apply ${plural(importable.length, "ID")}` : "Choose a file first"}
        disabled={!canEdit || importFiles.length === 0}
        disabledReason={reason ?? "Choose an export file to preview the matches."}
        onSubmit={() => {
          if (importable.length === 0) {
            toast({ title: "No new IDs in this file", body: "Every submitted application already has an ACCA student ID.", tone: "info" });
          } else {
            const assigned = new Map(importable.map((r, i) => [r.id, IMPORT_IDS[i % IMPORT_IDS.length]]));
            setRows((list) =>
              list.map((r) =>
                assigned.has(r.id)
                  ? { ...r, accaId: assigned.get(r.id)!, reg: "registered", regDate: ACCA_TODAY, regNote: undefined, sub: "due" }
                  : r,
              ),
            );
            toast({
              title: `${plural(importable.length, "ACCA student ID")} imported`,
              body: `${importFiles[0]} · ${importable.map((r) => r.name).join(", ")} marked Registered`,
            });
          }
          setImportOpen(false);
          setImportFiles([]);
        }}
      >
        <FileDrop
          label="Upload the myACCA student export"
          accept=".csv,.xlsx"
          multiple={false}
          hint="Columns: ACCA ID, first name, last name, email."
          onFiles={(all) => setImportFiles(all)}
        />
        {importFiles.length ? (
          <div className="space-y-2">
            <MiniLabel>Matched in {importFiles[0]}</MiniLabel>
            {importable.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line">
                {importable.map((r, i) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{r.name}</span>
                      <span className="block truncate text-[12px] text-ink-3">Matched by email · {r.email}</span>
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold text-ink tnum">{IMPORT_IDS[i % IMPORT_IDS.length]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No unmatched learners: every submitted application already has an ID.</p>
            )}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-3">
            {plural(importable.length, "learner")} submitted to ACCA and waiting for an ID:{" "}
            {importable.map((r) => r.name).join(", ") || "none"}.
          </p>
        )}
      </FormDrawer>
    </div>
  );
}
