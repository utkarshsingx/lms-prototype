"use client";

import { useMemo, useState } from "react";
import { Globe2, Landmark, Palette, Plus, Settings2, Trash2, UserPlus } from "lucide-react";
import {
  cohortsForUniversity,
  formatAccaDate,
  platformUsers,
  staffById,
  students as allStudents,
  universities as seedUniversities,
  type University,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { BRAND_SWATCHES, MiniLabel, SectionHead, UniversityMark, inkOn, slugify } from "./shared";

/* ------------------------------------------------------------------ model */

type UniStatus = "Live" | "Onboarding" | "Paused";
type AdminAccess = "Editor" | "View-only";
type UniAdmin = { id: string; name: string; email: string; access: AdminAccess; status: "Active" | "Invited" };

export type UniRow = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  programmeName: string;
  status: UniStatus;
  students: number;
  cohorts: number;
  partnerSince: string;
  goLive: string;
  semesters: number;
  academicYear: string;
  slug: string;
  loginMethods: string[];
  modules: string[];
  studentIdFormat: string;
  supportEmail: string;
  dataRegion: string;
  displayName: string;
  initials: string;
  tagline: string;
  primary: string;
  logoFiles: string[];
  contactName: string;
  contactEmail: string;
  admins: UniAdmin[];
};

const DOMAIN_SUFFIX = ".acca.zskillup.com";

const ALL_MODULES = [
  "Student records",
  "ACCA progress",
  "Performance",
  "Curriculum mapping",
  "Academic calendar",
  "Announcements",
  "Joint certificates",
  "Careers",
  "Support tickets",
  "Reports",
];

const LOGIN_METHODS = ["University email single sign-on", "Email and one-time code", "Google Workspace single sign-on"];
const ACADEMIC_YEARS = ["Jul to Apr", "Aug to May", "Jun to Mar"];

function adminsFor(u: University): UniAdmin[] {
  const fromStaff = u.adminIds
    .map((id) => staffById(id))
    .filter((s) => s != null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      access: (s.access === "view-only" ? "View-only" : "Editor") as AdminAccess,
      status: "Active" as const,
    }));
  const extra = platformUsers
    .filter((p) => p.role === "university-admin" && !p.staffId && p.organisation === u.name)
    .map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      access: (p.permissions.includes("university:edit") ? "Editor" : "View-only") as AdminAccess,
      status: (p.status === "invited" ? "Invited" : "Active") as UniAdmin["status"],
    }));
  return [...fromStaff, ...extra];
}

function toRow(u: University): UniRow {
  return {
    id: u.id,
    name: u.name,
    shortName: u.shortName,
    city: u.city,
    state: u.state,
    programmeName: u.programmeName,
    status: u.status,
    students: u.students,
    cohorts: cohortsForUniversity(u.id).length,
    partnerSince: u.partnerSince,
    goLive: u.workspace.goLive,
    semesters: u.semesterSystem.semesters,
    academicYear: u.semesterSystem.academicYear,
    slug: u.workspace.slug,
    loginMethods: u.workspace.loginMethods,
    modules: u.workspace.enabledModules,
    studentIdFormat: u.workspace.studentIdFormat,
    supportEmail: u.workspace.supportEmail,
    dataRegion: u.workspace.dataRegion,
    displayName: u.name,
    initials: u.branding.logoInitials,
    tagline: u.branding.tagline,
    primary: u.branding.primary,
    logoFiles: [],
    contactName: u.contact.name,
    contactEmail: u.contact.email,
    admins: adminsFor(u),
  };
}

export const SEED_ROWS = seedUniversities.map(toRow);

/* ------------------------------------------------------------------ page */

export function AdminUniversities() {
  const [rows, setRows] = useState<UniRow[]>(SEED_ROWS);
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<UniRow | null>(null);
  const [editTab, setEditTab] = useState("workspace");
  const [editOpen, setEditOpen] = useState(false);

  const visible = useMemo(() => rows.filter((r) => !status || r.status === status), [rows, status]);
  const current = rows.find((r) => r.id === draft?.id);

  const openEditor = (id: string, tab: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setDraft({ ...row, admins: [...row.admins] });
    setEditTab(tab);
    setEditOpen(true);
  };

  const columns: DataTableColumn<UniRow>[] = [
    {
      key: "name",
      header: "University",
      sortable: true,
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <UniversityMark initials={r.initials} color={r.primary} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{r.displayName}</span>
            <span className="block text-[12px] text-ink-3">{r.programmeName}</span>
          </span>
        </span>
      ),
    },
    { key: "city", header: "Location", sortable: true, render: (r) => <span className="text-ink-2">{`${r.city}, ${r.state}`}</span> },
    { key: "students", header: "Students", align: "right", mono: true, sortable: true },
    { key: "cohorts", header: "Cohorts", align: "right", mono: true, sortable: true },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} /> },
    { key: "slug", header: "Workspace", render: (r) => <span className="font-mono text-[12px] text-ink-2">{`${r.slug}${DOMAIN_SUFFIX}`}</span> },
    {
      key: "admins",
      header: "Admins",
      align: "right",
      sortable: true,
      sortValue: (r) => r.admins.length,
      render: (r) => <span className="font-mono">{r.admins.length}</span>,
    },
    { key: "partnerSince", header: "Partner since", sortable: true, render: (r) => <span className="text-ink-2">{formatAccaDate(r.partnerSince)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => (
        <Button
          size="xs"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            openEditor(r.id, "workspace");
          }}
        >
          <Settings2 className="size-3.5" />
          Manage
        </Button>
      ),
    },
  ];

  const live = rows.filter((r) => r.status === "Live");

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Network"
        title="Universities"
        sub="Create and manage partner universities, then configure each university's workspace and branding."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add partner university
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile label="Partner universities" value={rows.length} icon={<Landmark />} />
        <KpiTile label="Live workspaces" value={live.length} tone="jade" icon={<Globe2 />} />
        <KpiTile label="University-linked learners" value={rows.reduce((n, r) => n + r.students, 0)} tone="info" />
        <KpiTile
          label="Onboarding"
          value={rows.filter((r) => r.status === "Onboarding").length}
          tone="amber"
          sub={rows
            .filter((r) => r.status === "Onboarding")
            .map((r) => `${r.shortName} goes live ${formatAccaDate(r.goLive)}`)
            .join(" · ")}
        />
      </KpiRow>

      <section className="space-y-4">
        <SectionHead
          title="Create and manage partner universities"
          sub="Status, workspace and admins for every partner. Open a university to change its status, workspace or branding."
        />
        <DataTable
          caption="Partner universities"
          rows={visible}
          columns={columns}
          getRowId={(r) => r.id}
          search={{ placeholder: "Search universities", match: (r, q) => `${r.name} ${r.city} ${r.programmeName}`.toLowerCase().includes(q) }}
          filters={<FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={["Live", "Onboarding", "Paused"]} />}
          onRowClick={(r) => openEditor(r.id, "workspace")}
          rowLabel={(r) => `Manage ${r.name}`}
          maxHeight="none"
        />
      </section>

      <section className="space-y-4">
        <SectionHead
          title="Configure university workspaces · Configure university branding"
          sub="Each university gets its own workspace address, modules and brand. Students see the brand in their identity strip."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className="min-w-0 overflow-hidden">
              <div className="flex min-w-0 items-center gap-3 px-5 py-4" style={{ backgroundColor: r.primary, color: inkOn(r.primary) }}>
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-[11px] font-display text-[14px] font-bold"
                  style={{ backgroundColor: inkOn(r.primary), color: r.primary }}
                >
                  {r.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-[16px] font-bold">{r.displayName}</p>
                  <p className="truncate text-[12px] opacity-80">{r.tagline}</p>
                </div>
              </div>
              <div className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[12px] text-ink-2">{`${r.slug}${DOMAIN_SUFFIX}`}</span>
                  <StatusPill status={r.status} size="sm" />
                </div>
                <p className="text-[12.5px] text-ink-3">
                  {r.semesters} semesters · academic year {r.academicYear} · {r.modules.length} of {ALL_MODULES.length} modules
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.modules.slice(0, 4).map((m) => (
                    <Badge key={m}>{m}</Badge>
                  ))}
                  {r.modules.length > 4 ? <Badge tone="dark">+{r.modules.length - 4} more</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEditor(r.id, "workspace")}>
                    <Settings2 className="size-4" />
                    Configure workspace
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEditor(r.id, "branding")}>
                    <Palette className="size-4" />
                    Edit branding
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <FormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width="w-full max-w-2xl"
        title={current?.displayName ?? "University"}
        sub={current ? `${current.slug}${DOMAIN_SUFFIX} · ${current.programmeName}` : undefined}
        submitLabel="Save changes"
        footerNote="Changes apply to the university workspace immediately"
        onSubmit={() => {
          if (!draft || !current) return;
          if (rows.some((r) => r.id !== draft.id && r.slug === draft.slug)) {
            toast({ title: "Workspace URL already in use", body: `${draft.slug}${DOMAIN_SUFFIX} belongs to another university.`, tone: "warning" });
            return;
          }
          const differs = (keys: (keyof UniRow)[]) => keys.some((k) => JSON.stringify(draft[k]) !== JSON.stringify(current[k]));
          const changed: string[] = [];
          if (differs(["status", "goLive", "programmeName", "students", "contactName", "contactEmail"])) changed.push(`partnership (${draft.status})`);
          if (differs(["slug", "semesters", "academicYear", "loginMethods", "modules", "studentIdFormat", "supportEmail", "admins"])) changed.push("workspace");
          if (differs(["displayName", "initials", "tagline", "primary", "logoFiles"])) changed.push("branding");
          setRows((list) => list.map((r) => (r.id === draft.id ? draft : r)));
          toast({
            title: changed.length ? `${draft.displayName} saved` : "No changes to save",
            body: changed.length
              ? `Updated ${changed.join(", ")} · ${draft.modules.length} modules · ${draft.slug}${DOMAIN_SUFFIX}`
              : undefined,
            tone: changed.length ? "success" : "neutral",
          });
          setEditOpen(false);
        }}
      >
        {draft ? (
          <UniversityEditor
            key={draft.id}
            draft={draft}
            onChange={(update) => setDraft((d) => (d ? update(d) : d))}
            tab={editTab}
            onTab={setEditTab}
          />
        ) : null}
      </FormDrawer>

      <AddUniversityDrawer
        open={adding}
        existingSlugs={rows.map((r) => r.slug)}
        onClose={() => setAdding(false)}
        onAdd={(row) => {
          setRows((list) => [...list, row]);
          toast({ title: "Partner university added", body: `${row.name} · workspace ${row.slug}${DOMAIN_SUFFIX} created in Onboarding` });
          setAdding(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

export function UniversityEditor({
  draft,
  onChange,
  tab,
  onTab,
}: {
  draft: UniRow;
  onChange: (update: (d: UniRow) => UniRow) => void;
  tab: string;
  onTab: (id: string) => void;
}) {
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", access: "View-only" as AdminAccess });
  const set = <K extends keyof UniRow>(key: K, value: UniRow[K]) => onChange((d) => ({ ...d, [key]: value }));

  const sample = allStudents.find((s) => s.universityId === draft.id);
  const swatches = BRAND_SWATCHES.includes(draft.primary) ? BRAND_SWATCHES : [draft.primary, ...BRAND_SWATCHES];
  const validHex = /^#[0-9a-fA-F]{6}$/.test(draft.primary);
  const brand = validHex ? draft.primary : BRAND_SWATCHES[0];
  const brandInk = inkOn(brand);

  return (
    <div className="space-y-5">
      <Tabs
        items={[
          { id: "workspace", label: "Workspace" },
          { id: "branding", label: "Branding" },
          { id: "partnership", label: "Partnership" },
        ]}
        value={tab}
        onChange={onTab}
      />

      {tab === "workspace" ? (
        <div className="space-y-5">
          <MiniLabel>Configure university workspaces</MiniLabel>
          <Field label="Workspace URL" hint="Lower-case letters, numbers and hyphens">
            <div className="flex min-w-0 items-center gap-2">
              <Input
                value={draft.slug}
                onChange={(e) => set("slug", slugify(e.target.value) || e.target.value.toLowerCase())}
                pattern="[a-z0-9-]+"
                required
                className="min-w-0 font-mono"
                aria-label="Workspace URL slug"
              />
              <span className="shrink-0 font-mono text-[12.5px] text-ink-3">{DOMAIN_SUFFIX}</span>
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Semester system">
              <Select value={draft.semesters} onChange={(e) => set("semesters", Number(e.target.value))}>
                {[6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} semesters
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Academic year">
              <Select value={draft.academicYear} onChange={(e) => set("academicYear", e.target.value)}>
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </Field>
            <Field label="Student ID format">
              <Input value={draft.studentIdFormat} onChange={(e) => set("studentIdFormat", e.target.value)} className="font-mono" />
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Sign-in methods</legend>
            {LOGIN_METHODS.map((m) => (
              <Checkbox
                key={m}
                label={m}
                checked={draft.loginMethods.includes(m)}
                onChange={(e) =>
                  set("loginMethods", e.target.checked ? [...draft.loginMethods, m] : draft.loginMethods.filter((x) => x !== m))
                }
              />
            ))}
          </fieldset>
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] font-semibold text-ink-2">Enabled modules</p>
              <span className="text-[12px] text-ink-3 tnum">
                {draft.modules.length} of {ALL_MODULES.length} on
              </span>
            </div>
            <div className="grid gap-x-6 gap-y-3 rounded-[12px] border border-line p-4 sm:grid-cols-2">
              {ALL_MODULES.map((m) => (
                <Switch
                  key={m}
                  label={m}
                  checked={draft.modules.includes(m)}
                  onChange={(on) => set("modules", on ? ALL_MODULES.filter((x) => x === m || draft.modules.includes(x)) : draft.modules.filter((x) => x !== m))}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Support email">
              <Input type="email" value={draft.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
            </Field>
            <Field label="Data region" hint="Fixed by the data residency policy">
              <Input value={draft.dataRegion} disabled />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-[12.5px] font-semibold text-ink-2">University admins</p>
            <ul className="divide-y divide-line rounded-[12px] border border-line">
              {draft.admins.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                  <Avatar name={a.name} size="sm" />
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{a.name}</span>
                    <span className="block truncate text-[12px] text-ink-3">{a.email}</span>
                  </span>
                  {a.status === "Invited" ? <StatusPill status="Invited" size="sm" /> : null}
                  <Select
                    aria-label={`Access for ${a.name}`}
                    value={a.access}
                    onChange={(e) =>
                      set(
                        "admins",
                        draft.admins.map((x) => (x.id === a.id ? { ...x, access: e.target.value as AdminAccess } : x)),
                      )
                    }
                    className="w-32 text-[13px]"
                  >
                    <option>Editor</option>
                    <option>View-only</option>
                  </Select>
                  <IconButton
                    type="button"
                    label={`Remove ${a.name}`}
                    size="sm"
                    onClick={() => set("admins", draft.admins.filter((x) => x.id !== a.id))}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 rounded-[12px] border border-dashed border-line-strong p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_auto]">
              <Input placeholder="Full name" value={newAdmin.name} onChange={(e) => setNewAdmin((n) => ({ ...n, name: e.target.value }))} aria-label="New admin name" />
              <Input
                placeholder="Email"
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin((n) => ({ ...n, email: e.target.value }))}
                aria-label="New admin email"
              />
              <Select value={newAdmin.access} onChange={(e) => setNewAdmin((n) => ({ ...n, access: e.target.value as AdminAccess }))} aria-label="New admin access">
                <option>Editor</option>
                <option>View-only</option>
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!newAdmin.name.trim() || !newAdmin.email.includes("@")) {
                    toast({ title: "Enter a name and a valid email", tone: "warning" });
                    return;
                  }
                  set("admins", [
                    ...draft.admins,
                    { id: `adm-${draft.admins.length + 1}-${slugify(newAdmin.name)}`, name: newAdmin.name.trim(), email: newAdmin.email.trim(), access: newAdmin.access, status: "Invited" },
                  ]);
                  toast({ title: "Admin invited", body: `${newAdmin.name.trim()} · ${newAdmin.access} · save to confirm` });
                  setNewAdmin({ name: "", email: "", access: "View-only" });
                }}
              >
                <UserPlus className="size-4" />
                Invite
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "branding" ? (
        <div className="space-y-5">
          <MiniLabel>Configure university branding</MiniLabel>
          <FileDrop
            label="Upload logo"
            accept=".svg,.png"
            multiple={false}
            hint="Square SVG or PNG, at least 256 px. The initials tile is used until a logo is uploaded."
            initialFiles={draft.logoFiles}
            onFiles={(all) => set("logoFiles", all)}
          />
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <Field label="Display name">
              <Input value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} required />
            </Field>
            <Field label="Logo initials">
              <Input value={draft.initials} maxLength={3} onChange={(e) => set("initials", e.target.value.toUpperCase())} required className="font-mono" />
            </Field>
          </div>
          <Field label="Tagline">
            <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Primary colour</p>
            <div className="flex flex-wrap items-center gap-2">
              {swatches.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Use ${hex}`}
                  aria-pressed={draft.primary === hex}
                  onClick={() => set("primary", hex)}
                  className={
                    draft.primary === hex
                      ? "size-8 rounded-full ring-2 ring-ink ring-offset-2 ring-offset-surface"
                      : "size-8 rounded-full ring-1 ring-line-strong transition-transform hover:scale-105"
                  }
                  style={{ backgroundColor: hex }}
                />
              ))}
              <label className="inline-flex items-center gap-2 rounded-[12px] border border-line px-2 py-1">
                <input
                  type="color"
                  value={brand}
                  onChange={(e) => set("primary", e.target.value)}
                  className="size-7 cursor-pointer rounded-[6px] border-0 bg-transparent p-0"
                  aria-label="Pick a custom colour"
                />
                <Input
                  value={draft.primary}
                  onChange={(e) => set("primary", e.target.value)}
                  pattern="#[0-9a-fA-F]{6}"
                  className="w-28 font-mono text-[12.5px]"
                  aria-label="Hex colour"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <MiniLabel>Live preview</MiniLabel>
            <div className="overflow-hidden rounded-[16px] border border-line">
              <p className="border-b border-line bg-surface-2 px-4 py-2 text-[11.5px] font-semibold text-ink-3">University workspace header</p>
              <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-4" style={{ backgroundColor: brand, color: brandInk }}>
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-[12px] font-display text-[15px] font-bold"
                  style={{ backgroundColor: brandInk, color: brand }}
                >
                  {draft.initials || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[18px] leading-tight font-bold">{draft.displayName || "University name"}</p>
                  <p className="truncate text-[12.5px] opacity-80">{draft.tagline || draft.programmeName}</p>
                </div>
                <span className="max-w-full truncate rounded-full px-2.5 py-0.5 font-mono text-[11px]" style={{ boxShadow: "inset 0 0 0 1px currentColor" }}>
                  {`${draft.slug}${DOMAIN_SUFFIX}`}
                </span>
              </div>
              <p className="border-y border-line bg-surface-2 px-4 py-2 text-[11.5px] font-semibold text-ink-3">Student identity strip</p>
              <div className="flex min-w-0 items-center gap-3 bg-surface px-4 py-3.5">
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: brand }} aria-hidden />
                <UniversityMark initials={draft.initials || "?"} color={brand} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{sample?.name ?? "Sample student"}</p>
                  <p className="truncate text-[12px] text-ink-3">
                    {draft.programmeName}
                    {sample?.semester ? ` · Semester ${sample.semester}` : ""}
                    {sample?.section ? ` · Section ${sample.section}` : ""}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[12px] text-ink-3">
              {draft.logoFiles.length ? `Logo file ${draft.logoFiles[0]} replaces the initials once processed. ` : ""}
              Text on this colour renders {brandInk === "#ffffff" ? "white" : "dark"} for contrast.
            </p>
          </div>
        </div>
      ) : null}

      {tab === "partnership" ? (
        <div className="space-y-5">
          <MiniLabel>Create and manage partner universities</MiniLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Partnership status">
              <Select value={draft.status} onChange={(e) => set("status", e.target.value as UniStatus)}>
                <option>Onboarding</option>
                <option>Live</option>
                <option>Paused</option>
              </Select>
            </Field>
            <Field label="Workspace go-live">
              <Input type="date" value={draft.goLive} onChange={(e) => set("goLive", e.target.value)} />
            </Field>
          </div>
          {draft.status === "Paused" ? (
            <p className="rounded-[12px] border border-rose/30 bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-ink">
              Paused workspaces keep all records but block sign-in for university users. Learners keep access to their ACCA classes.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Programme">
              <Input value={draft.programmeName} onChange={(e) => set("programmeName", e.target.value)} />
            </Field>
            <Field label="Students (headline)">
              <Input type="number" min={0} value={draft.students} onChange={(e) => set("students", Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary contact">
              <Input value={draft.contactName} onChange={(e) => set("contactName", e.target.value)} />
            </Field>
            <Field label="Contact email">
              <Input type="email" value={draft.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
            </Field>
          </div>
          <p className="text-[12.5px] text-ink-3">
            Partner since {formatAccaDate(draft.partnerSince)}. University B.Com subjects stay with the university; this workspace covers ACCA delivery and reporting only.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ add drawer */

function AddUniversityDrawer({
  open,
  onClose,
  onAdd,
  existingSlugs,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (row: UniRow) => void;
  existingSlugs: string[];
}) {
  const [colour, setColour] = useState(BRAND_SWATCHES[3]);
  const [shortName, setShortName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add partner university"
      sub="Creates the partnership in Onboarding with a workspace you can configure next."
      submitLabel="Add university"
      footerNote="The primary contact receives a workspace invitation"
      onSubmit={(data) => {
        const name = String(data.get("name")).trim();
        const short = String(data.get("shortName")).trim() || name.split(" ")[0];
        const workspace = slug || slugify(short);
        if (existingSlugs.includes(workspace)) {
          toast({ title: "Workspace URL already in use", body: `${workspace}${DOMAIN_SUFFIX} belongs to another university.`, tone: "warning" });
          return;
        }
        onAdd({
          id: `u-${workspace}`,
          name,
          shortName: short,
          city: String(data.get("city")).trim(),
          state: String(data.get("state")).trim(),
          programmeName: String(data.get("programme")).trim(),
          status: "Onboarding",
          students: Number(data.get("students")) || 0,
          cohorts: 0,
          partnerSince: "2026-09-14",
          goLive: String(data.get("goLive")),
          semesters: Number(data.get("semesters")),
          academicYear: String(data.get("academicYear")),
          slug: workspace,
          loginMethods: ["Email and one-time code"],
          modules: ["Student records", "ACCA progress", "Academic calendar", "Announcements"],
          studentIdFormat: `${short.slice(0, 2).toUpperCase()}-YYYY-NNNN`,
          supportEmail: String(data.get("contactEmail")),
          dataRegion: "India (Mumbai)",
          displayName: name,
          initials: short
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
            .padEnd(2, "U"),
          tagline: "",
          primary: colour,
          logoFiles: [],
          contactName: String(data.get("contactName")).trim(),
          contactEmail: String(data.get("contactEmail")).trim(),
          admins: [
            {
              id: `adm-${workspace}-1`,
              name: String(data.get("contactName")).trim(),
              email: String(data.get("contactEmail")).trim(),
              access: "Editor",
              status: "Invited",
            },
          ],
        });
        setShortName("");
        setSlug("");
        setSlugTouched(false);
      }}
    >
      <Field label="University name">
        <Input name="name" required placeholder="e.g. Riverside University" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Short name">
          <Input
            name="shortName"
            required
            placeholder="e.g. Riverside"
            value={shortName}
            onChange={(e) => {
              setShortName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Workspace URL">
          <div className="flex min-w-0 items-center gap-2">
            <Input
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              required
              className="min-w-0 font-mono"
              aria-label="Workspace URL slug"
            />
            <span className="shrink-0 font-mono text-[11.5px] text-ink-3">{DOMAIN_SUFFIX}</span>
          </div>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <Input name="city" required placeholder="e.g. Indore" />
        </Field>
        <Field label="State">
          <Input name="state" required placeholder="e.g. Madhya Pradesh" />
        </Field>
      </div>
      <Field label="Programme">
        <Input name="programme" required defaultValue="B.Com with ACCA" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Semesters">
          <Select name="semesters" defaultValue="6">
            <option value="6">6 semesters</option>
            <option value="8">8 semesters</option>
          </Select>
        </Field>
        <Field label="Academic year">
          <Select name="academicYear" defaultValue="Jul to Apr">
            {ACADEMIC_YEARS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </Field>
        <Field label="Expected students">
          <Input name="students" type="number" min={0} defaultValue={60} />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Brand colour</p>
        <div className="flex flex-wrap gap-2">
          {BRAND_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Use ${hex}`}
              aria-pressed={colour === hex}
              onClick={() => setColour(hex)}
              className={colour === hex ? "size-8 rounded-full ring-2 ring-ink ring-offset-2 ring-offset-surface" : "size-8 rounded-full ring-1 ring-line-strong"}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Primary contact">
          <Input name="contactName" required placeholder="e.g. Dr Kavya Menon" />
        </Field>
        <Field label="Contact email">
          <Input name="contactEmail" type="email" required placeholder="name@university.edu" />
        </Field>
      </div>
      <Field label="Workspace go-live">
        <Input name="goLive" type="date" required defaultValue="2026-11-02" />
      </Field>
    </FormDrawer>
  );
}
