"use client";

import { useState } from "react";
import { Download, Eye, KeyRound, MailPlus, PencilLine, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { ACCA_TODAY, auditLogs, formatAccaDate, formatDateTime, platformUsers } from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Matrix, MatrixCheck } from "@/components/ui/matrix";
import { StatusPill } from "@/components/ui/status";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { Gated, MiniLabel, WorkspaceHeader, plural, useWorkspace } from "./shared";

type Access = "editor" | "view-only";
type UserRow = {
  id: string;
  name: string;
  email: string;
  designation: string;
  access: Access;
  status: "active" | "invited" | "suspended" | "revoked";
  lastActive: string;
  mfa: boolean;
};

const ACCESS_LABEL: Record<Access, string> = { editor: "Editor", "view-only": "View-only" };

const CAPABILITIES: { id: string; label: string; editor: boolean; view: boolean }[] = [
  { id: "view", label: "View dashboard, students, cohorts, ACCA progress and performance", editor: true, view: true },
  { id: "reports", label: "Download student, cohort and executive reports", editor: true, view: true },
  { id: "support", label: "View support-ticket status and careers", editor: true, view: true },
  { id: "verify", label: "Verify student records and update current student semester", editor: true, view: false },
  { id: "curriculum", label: "Upload university curriculum and review the semester-to-ACCA roadmap", editor: true, view: false },
  { id: "calendar", label: "Upload academic calendar, add semester dates and examination periods", editor: true, view: false },
  { id: "announce", label: "Publish authorised university announcements", editor: true, view: false },
  { id: "certificates", label: "Verify joint-certificate eligibility", editor: true, view: false },
  { id: "users", label: "Add authorised university users", editor: true, view: false },
];

const DESIGNATIONS = [
  "Programme Coordinator",
  "Head of Department, Commerce",
  "Campus Coordinator",
  "Controller of Examinations",
  "Placement Officer",
  "Dean",
];

export function UsersPage() {
  const { uni, canEdit, reason, persona } = useWorkspace();
  const domain = uni.contact.email.split("@")[1] ?? "university.edu";

  const [rows, setRows] = useState<UserRow[]>(() =>
    platformUsers
      .filter((u) => u.role === "university-admin" && u.organisation === uni.name)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        designation: u.title.split(" · ")[0],
        access: u.permissions.includes("university:edit") ? "editor" : "view-only",
        status: u.status,
        lastActive: u.lastActive,
        mfa: u.mfa,
      })),
  );
  const [activity, setActivity] = useState<TimelineItem[]>(() =>
    auditLogs
      .filter((l) => l.actorRole === "university-admin" && rows.some((r) => r.name === l.actor))
      .map((l) => ({
        id: l.id,
        title: `${l.actor}: ${l.action.toLowerCase()}`,
        meta: `${formatDateTime(l.at)} · ${l.target}`,
        tone: l.result === "denied" ? "rose" : "neutral",
        body: l.result === "denied" ? "Denied: view-only access." : undefined,
      })),
  );

  const [accessFilter, setAccessFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [revoking, setRevoking] = useState<UserRow | null>(null);

  const me = rows.find((r) => r.email === persona.email || r.name === persona.name);
  const isMe = (r: UserRow) => r.id === me?.id;

  const log = (title: string, meta: string, tone: TimelineItem["tone"] = "info", body?: string) =>
    setActivity((list) => [{ id: `act-${list.length + 1}`, title, meta, tone, body }, ...list]);

  const visible = rows.filter((r) => (!accessFilter || r.access === accessFilter) && (!statusFilter || r.status === statusFilter));
  const live = rows.filter((r) => r.status !== "revoked");

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">
              {r.name}
              {isMe(r) ? <span className="ml-1.5 rounded-full bg-cta px-1.5 py-px text-[10.5px] font-bold text-cta-ink">You</span> : null}
            </span>
            <span className="block text-[12px] text-ink-3">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: "designation", header: "Designation", sortable: true },
    {
      key: "access",
      header: "Access",
      sortable: true,
      render: (r) =>
        r.access === "editor" ? (
          <StatusPill status="editor" tone="jade">Editor</StatusPill>
        ) : (
          <StatusPill status="view-only" tone="neutral">View-only</StatusPill>
        ),
    },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} tone={r.status === "revoked" ? "rose" : undefined} /> },
    { key: "mfa", header: "Two-step sign-in", render: (r) => (r.mfa ? <span className="text-jade">On</span> : <span className="text-ink-3">Off</span>) },
    {
      key: "lastActive",
      header: "Last active",
      sortable: true,
      render: (r) => (r.lastActive ? formatDateTime(r.lastActive) : <span className="text-ink-3">{r.status === "invited" ? "Invite not accepted" : "Never"}</span>),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => {
        if (r.status === "revoked") return <span className="text-[12.5px] text-ink-3">Access revoked</span>;
        const selfReason = "You cannot change your own access. Ask a ZSkillup Super Admin.";
        return (
          <span className="inline-flex gap-1.5">
            {r.status === "invited" ? (
              <Gated
                allowed={canEdit}
                reason={reason}
                size="xs"
                variant="outline"
                onClick={() => toast({ title: `Invitation resent to ${r.email}`, body: "The link is valid for 7 days.", tone: "info" })}
              >
                Resend
              </Gated>
            ) : (
              <Gated allowed={canEdit && !isMe(r)} reason={!canEdit ? reason : selfReason} size="xs" variant="outline" onClick={() => setEditing(r)}>
                <PencilLine className="size-3.5" />
                Access
              </Gated>
            )}
            <Gated allowed={canEdit && !isMe(r)} reason={!canEdit ? reason : selfReason} size="xs" variant="danger" onClick={() => setRevoking(r)}>
              <UserMinus className="size-3.5" />
              Revoke
            </Gated>
          </span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <WorkspaceHeader
        section="Administration"
        title="University users"
        sub={`Add authorised university users and give each one editable or view-only access to the ${uni.shortName} workspace.`}
        actions={
          <>
            <Button variant="outline" onClick={() => toast({ title: `Report queued: ${uni.workspace.slug}-university-users.csv`, tone: "info" })}>
              <Download className="size-4" />
              Export
            </Button>
            <Gated allowed={canEdit} reason={reason} onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              Add university user
            </Gated>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile label="Users with access" value={live.filter((r) => r.status === "active").length} icon={<Users />} sub={`${plural(live.length, "account")} in total`} />
        <KpiTile label="Editors" value={live.filter((r) => r.access === "editor").length} tone="jade" icon={<ShieldCheck />} sub="Can add, verify and publish" />
        <KpiTile label="View-only" value={live.filter((r) => r.access === "view-only").length} icon={<Eye />} sub="Dashboards, records and reports" />
        <KpiTile label="Pending invitations" value={rows.filter((r) => r.status === "invited").length} tone="amber" icon={<MailPlus />} sub={`Sign in with a ${domain} email`} />
      </KpiRow>

      <DataTable
        caption="University users"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        search={{ placeholder: "Search name or email", match: (r, q) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(accessFilter || statusFilter)}
            onClear={() => {
              setAccessFilter("");
              setStatusFilter("");
            }}
          >
            <FilterSelect
              label="Access"
              allLabel="Any"
              value={accessFilter}
              onChange={setAccessFilter}
              options={[
                { value: "editor", label: "Editor" },
                { value: "view-only", label: "View-only" },
              ]}
            />
            <FilterSelect
              label="Status"
              allLabel="Any"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "active", label: "Active" },
                { value: "invited", label: "Invited" },
                { value: "revoked", label: "Revoked" },
              ]}
            />
          </FilterBar>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">Editable or view-only</h2>
            <p className="mt-1 text-[13px] text-ink-2">What each access level can do in this workspace. The ZSkillup Super Admin can review every change in the audit log.</p>
          </div>
          <Matrix
            caption="Access levels"
            corner="Capability"
            dense
            rows={CAPABILITIES.map((c) => ({ id: c.id, label: c.label }))}
            cols={[
              { id: "editor", label: "Editor", sub: "e.g. Programme Director" },
              { id: "view", label: "View-only", sub: "e.g. Dean" },
            ]}
            cell={(rowId, colId) => {
              const c = CAPABILITIES.find((x) => x.id === rowId)!;
              const on = colId === "editor" ? c.editor : c.view;
              return <MatrixCheck checked={on} label={`${colId === "editor" ? "Editor" : "View-only"}: ${c.label}`} />;
            }}
          />
        </div>
        <Card className="min-w-0">
          <CardHeader title="Recent access activity" sub={`${uni.shortName} university users`} />
          <div className="px-5 pb-5">
            <Timeline dense items={activity.slice(0, 6)} />
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------ drawers */}
      <FormDrawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add authorised university user"
        sub={`They receive an invitation to sign in to the ${uni.shortName} workspace with their university email.`}
        submitLabel="Send invitation"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="Invitations expire after 7 days."
        onSubmit={(data) => {
          const name = String(data.get("name") ?? "").trim();
          const email = String(data.get("email") ?? "").trim().toLowerCase();
          const designation = String(data.get("designation"));
          const access = String(data.get("access")) as Access;
          if (!email.endsWith(`@${domain}`)) {
            toast({ title: `Use a ${domain} email address`, body: "University users sign in with university single sign-on.", tone: "warning" });
            return;
          }
          if (rows.some((r) => r.email === email && r.status !== "revoked")) {
            toast({ title: `${email} already has access`, tone: "warning" });
            return;
          }
          setRows((list) => [
            ...list,
            { id: `pu-new-${list.length + 1}`, name, email, designation, access, status: "invited", lastActive: "", mfa: false },
          ]);
          log(`${persona.name}: invited ${name}`, `${formatAccaDate(ACCA_TODAY)} · ${designation} · ${ACCESS_LABEL[access]}`, "info");
          toast({ title: `Invitation sent to ${name}`, body: `${email} · ${ACCESS_LABEL[access]} access` });
          setInviteOpen(false);
        }}
      >
        <Field label="Full name">
          <Input name="name" required placeholder="e.g. Dr Kavita Joshi" />
        </Field>
        <Field label="University email">
          <Input name="email" type="email" required placeholder={`name@${domain}`} />
        </Field>
        <Field label="Designation">
          <Select name="designation" defaultValue={DESIGNATIONS[0]}>
            {DESIGNATIONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Access</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(
              [
                ["view-only", "View-only", "Dashboards, records and reports. Cannot change anything."],
                ["editor", "Editor", "Can verify records, upload, publish and add users."],
              ] as [Access, string, string][]
            ).map(([value, label, sub]) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-line bg-surface p-3.5 transition-colors hover:bg-cta-soft",
                  "has-[:checked]:border-ink has-[:checked]:bg-cta-soft",
                )}
              >
                <input type="radio" name="access" value={value} defaultChecked={value === "view-only"} className="mt-1 accent-ink" />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
                  <span className="block text-[12.5px] leading-snug text-ink-3">{sub}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
          <KeyRound aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Give editor access only to people who verify records or publish for {uni.shortName}. Everyone else can work with view-only access.
        </p>
      </FormDrawer>

      <FormDrawer
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing ? `Change access: ${editing.name}` : "Change access"}
        sub={editing ? `${editing.designation} · currently ${ACCESS_LABEL[editing.access]}` : undefined}
        submitLabel="Save access"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          if (!editing) return;
          const access = String(data.get("access")) as Access;
          if (access === editing.access) {
            setEditing(null);
            return;
          }
          setRows((list) => list.map((r) => (r.id === editing.id ? { ...r, access } : r)));
          log(`${persona.name}: changed access for ${editing.name}`, `${formatAccaDate(ACCA_TODAY)} · ${ACCESS_LABEL[editing.access]} to ${ACCESS_LABEL[access]}`, "amber");
          toast({ title: `${editing.name} now has ${ACCESS_LABEL[access]} access`, body: "The change applies at their next sign-in." });
          setEditing(null);
        }}
      >
        {editing ? (
          <Field label="Access level">
            <Select name="access" defaultValue={editing.access} key={editing.id}>
              <option value="editor">Editor: can add, verify, upload and publish</option>
              <option value="view-only">View-only: can view and download reports</option>
            </Select>
          </Field>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={revoking != null}
        onClose={() => setRevoking(null)}
        title={revoking ? `Revoke access: ${revoking.name}` : "Revoke access"}
        sub="They are signed out and can no longer open the workspace. Their past actions stay in the audit log."
        submitLabel="Revoke access"
        destructive
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          if (!revoking) return;
          const why = String(data.get("reason"));
          setRows((list) => list.map((r) => (r.id === revoking.id ? { ...r, status: "revoked" } : r)));
          log(`${persona.name}: revoked access for ${revoking.name}`, `${formatAccaDate(ACCA_TODAY)} · ${why}`, "rose");
          toast({ title: `Access revoked: ${revoking.name}`, body: why, tone: "warning" });
          setRevoking(null);
        }}
      >
        <Field label="Reason">
          <Select name="reason" defaultValue="Left the university">
            <option>Left the university</option>
            <option>Changed role</option>
            <option>Access no longer needed</option>
            <option>Invitation sent in error</option>
          </Select>
        </Field>
        <Field label="Note" hint="Optional">
          <Textarea name="note" rows={3} placeholder="e.g. Moved to the Faculty of Law from 1 Oct." />
        </Field>
        <MiniLabel>This cannot be undone here</MiniLabel>
        <p className="-mt-2 text-[12.5px] text-ink-3">To restore access, add the person again with a new invitation.</p>
      </FormDrawer>

    </div>
  );
}
