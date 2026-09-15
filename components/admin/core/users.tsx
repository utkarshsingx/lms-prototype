"use client";

import { useMemo, useState } from "react";
import { KeyRound, Lock, MailPlus, Plus, RotateCcw, ShieldAlert, ShieldCheck, UserCog, UserMinus, Users } from "lucide-react";
import {
  ACCESS_LEVEL_LABELS,
  capabilities,
  permissionDefinitions,
  permissionMatrix,
  platformRoles,
  platformUsers,
  SUPER_ADMIN_SEAT_LIMIT,
  universities,
  type AccaRoleId,
  type AccessLevel,
  type PlatformUser,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusPill } from "@/components/ui/status";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Matrix, MatrixCheck } from "@/components/ui/matrix";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MiniLabel, ROLE_SHORT, SectionHead, lastActiveLabel, slugify } from "./shared";

/* ------------------------------------------------------------------ model */

type RoleCol = { id: string; name: string; short: string; description: string; users: number; seatLimit?: number; scope: string; custom: boolean; base: AccaRoleId };

const BASE_ROLES: RoleCol[] = platformRoles.map((r) => ({
  id: r.id,
  name: r.name,
  short: ROLE_SHORT[r.id],
  description: r.description,
  users: r.users,
  seatLimit: r.seatLimit,
  scope: r.scope,
  custom: false,
  base: r.id,
}));

const ROLE_IDS = platformRoles.map((r) => r.id);
const PROGRAMME_PERMISSIONS = ["programme:ops", "programme:acca", "programme:universities", "programme:support", "finance:view", "finance:record"];
const FINANCE_PERMISSIONS = ["finance:view", "finance:record"];
const FINANCE_CAPABILITIES = ["finance-view", "finance-record"];
const ORGANISATIONS = ["ZSkillup", ...universities.map((u) => u.name)];

const permissionLabel = (id: string) => permissionDefinitions.find((p) => p.id === id)?.label ?? id;

const DEFAULT_PERMISSIONS: Record<AccaRoleId, string[]> = {
  "super-admin": ["platform:all"],
  "programme-admin": ["programme:ops", "programme:acca", "programme:universities", "programme:support"],
  "university-admin": [],
  faculty: ["content:submit", "faculty:grade"],
  mentor: ["students:allocated"],
  student: [],
};

function initialMatrix() {
  return Object.fromEntries(Object.entries(permissionMatrix).map(([cap, row]) => [cap, { ...row } as Record<string, AccessLevel>]));
}

/* ------------------------------------------------------------------ page */

export function AdminUsers({ initialTab }: { initialTab?: string }) {
  const { persona } = useRole();
  const [tab, setTab] = useState(initialTab === "roles" ? "roles" : "users");
  const [users, setUsers] = useState<PlatformUser[]>(platformUsers);
  const [roles, setRoles] = useState<RoleCol[]>(BASE_ROLES);
  const [matrix, setMatrix] = useState<Record<string, Record<string, AccessLevel>>>(initialMatrix);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteKey, setInviteKey] = useState(0);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleKey, setRoleKey] = useState(0);
  const [editing, setEditing] = useState<PlatformUser | null>(null);

  const superAdmins = users.filter((u) => u.role === "super-admin" && u.status !== "suspended");
  const seatsFull = superAdmins.length >= SUPER_ADMIN_SEAT_LIMIT;
  const staffUsers = users.filter((u) => u.role !== "student");

  const openInvite = () => {
    setInviteKey((k) => k + 1);
    setInviteOpen(true);
  };
  const openCreateRole = () => {
    setRoleKey((k) => k + 1);
    setRoleOpen(true);
  };

  const setStatus = (ids: string[], status: PlatformUser["status"]) => {
    const selfId = users.find((u) => u.staffId && u.staffId === persona.staffId)?.id;
    const target = ids.filter((id) => id !== selfId);
    setUsers((list) => list.map((u) => (target.includes(u.id) ? { ...u, status } : u)));
    return target.length;
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Network"
        title="Users & roles"
        sub="Manage every user across the six logins, and create roles and permissions that decide what each login can see and change."
        actions={
          <>
            <Button variant="outline" onClick={openCreateRole}>
              <KeyRound className="size-4" />
              Create role
            </Button>
            <Button onClick={openInvite}>
              <MailPlus className="size-4" />
              Invite user
            </Button>
          </>
        }
      />

      <Card className={cn("min-w-0 p-4 sm:p-5", seatsFull ? "border-rose/40" : "border-cta")}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-inv text-cta">
            <ShieldAlert className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 basis-72">
            <p className="text-[14.5px] font-bold text-ink">
              Super Admin access: {superAdmins.length} of {SUPER_ADMIN_SEAT_LIMIT} seats used. Keep this login to a small number of people.
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              Super Admins can change every configuration, user, report and audit setting. Only a small number of users should receive this access.
            </p>
            <Progress value={(superAdmins.length / SUPER_ADMIN_SEAT_LIMIT) * 100} tone={seatsFull ? "rose" : "ink"} className="mt-2.5 max-w-sm" />
          </div>
          <div className="flex items-center gap-3">
            <AvatarStack names={superAdmins.map((u) => u.name)} />
            <span className="text-[12.5px] text-ink-2">{superAdmins.map((u) => u.name).join(", ")}</span>
          </div>
        </div>
      </Card>

      <KpiRow cols={5}>
        <KpiTile label="Staff users" value={staffUsers.length} sub="across five staff logins" icon={<UserCog />} />
        <KpiTile label="Learner accounts" value={users.length - staffUsers.length} sub="records shown · 610 enrolled" icon={<Users />} tone="info" />
        <KpiTile label="Invited, not yet signed in" value={users.filter((u) => u.status === "invited").length} tone="amber" />
        <KpiTile label="Suspended" value={users.filter((u) => u.status === "suspended").length} tone="rose" goodWhen="down" />
        <KpiTile
          label="Staff with MFA on"
          value={`${Math.round((staffUsers.filter((u) => u.mfa).length / Math.max(1, staffUsers.length)) * 100)}%`}
          tone="jade"
          icon={<ShieldCheck />}
        />
      </KpiRow>

      <Tabs
        items={[
          { id: "users", label: "Manage all platform users", count: users.length },
          { id: "roles", label: "Create roles and permissions", count: roles.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "users" ? (
        <UsersTable
          users={users}
          selfStaffId={persona.staffId}
          onEdit={setEditing}
          onStatus={(ids, status, verb) => {
            const n = setStatus(ids, status);
            if (n === 0) {
              toast({ title: "You cannot change your own account", tone: "warning" });
              return;
            }
            toast({ title: `${n} ${n === 1 ? "user" : "users"} ${verb}`, tone: status === "suspended" ? "warning" : "success" });
          }}
          onResend={(ids) => toast({ title: `Invitation resent to ${ids.length} ${ids.length === 1 ? "user" : "users"}`, tone: "info" })}
          onInvite={openInvite}
        />
      ) : (
        <RolesPanel
          roles={roles}
          users={users}
          setUsers={setUsers}
          matrix={matrix}
          setMatrix={setMatrix}
          onCreateRole={openCreateRole}
        />
      )}

      <InviteDrawer
        open={inviteOpen}
        formKey={inviteKey}
        seatsFull={seatsFull}
        onClose={() => setInviteOpen(false)}
        onInvite={(user) => {
          setUsers((list) => [user, ...list]);
          toast({ title: "Invitation sent", body: `${user.name} · ${ROLE_SHORT[user.role]} · ${user.organisation}` });
          setInviteOpen(false);
        }}
      />

      <EditUserDrawer
        user={editing}
        seatsFull={seatsFull}
        isSelf={Boolean(editing?.staffId && editing.staffId === persona.staffId)}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          setUsers((list) => list.map((u) => (u.id === next.id ? next : u)));
          toast({ title: "User updated", body: `${next.name} · ${ROLE_SHORT[next.role]} · ${next.permissions.length ? next.permissions.map(permissionLabel).join(", ") : "no extra permissions"}` });
          setEditing(null);
        }}
      />

      <CreateRoleDrawer
        open={roleOpen}
        formKey={roleKey}
        roles={roles}
        matrix={matrix}
        onClose={() => setRoleOpen(false)}
        onCreate={(role, levels) => {
          setRoles((list) => [...list, role]);
          setMatrix((m) => Object.fromEntries(Object.entries(m).map(([cap, row]) => [cap, { ...row, [role.id]: levels[cap] ?? "none" }])));
          const granted = Object.values(levels).filter((l) => l !== "none").length;
          toast({ title: "Role created", body: `${role.name} · based on ${ROLE_SHORT[role.base]} · ${granted} capabilities` });
          setRoleOpen(false);
          setTab("roles");
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ users table */

function UsersTable({
  users,
  selfStaffId,
  onEdit,
  onStatus,
  onResend,
  onInvite,
}: {
  users: PlatformUser[];
  selfStaffId?: string;
  onEdit: (u: PlatformUser) => void;
  onStatus: (ids: string[], status: PlatformUser["status"], verb: string) => void;
  onResend: (ids: string[]) => void;
  onInvite: () => void;
}) {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [org, setOrg] = useState("");

  const rows = useMemo(
    () => users.filter((u) => (!role || u.role === role) && (!status || u.status === status) && (!org || u.organisation === org)),
    [users, role, status, org],
  );

  const columns: DataTableColumn<PlatformUser>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (u) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={u.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">
              {u.name}
              {u.staffId && u.staffId === selfStaffId ? <span className="ml-1.5 text-[11.5px] font-medium text-ink-3">(you)</span> : null}
            </span>
            <span className="block text-[12px] text-ink-3">{u.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: "Login",
      sortable: true,
      sortValue: (u) => ROLE_IDS.indexOf(u.role),
      render: (u) => <Badge tone={u.role === "super-admin" ? "dark" : u.role === "student" ? "neutral" : "info"}>{ROLE_SHORT[u.role]}</Badge>,
    },
    {
      key: "title",
      header: "Title and university",
      sortable: true,
      render: (u) => (
        <span className="block min-w-0">
          <span className="block text-ink-2">{u.title}</span>
          <span className="block text-[12px] text-ink-3">{u.organisation}</span>
        </span>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (u) =>
        u.role === "student" ? (
          <span className="text-[12px] text-ink-3">Own record</span>
        ) : u.permissions.length === 0 ? (
          <span className="text-[12px] text-ink-3">{u.role === "university-admin" ? "View-only" : "Base role"}</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {u.permissions.slice(0, 2).map((p) => (
              <Badge key={p} tone={FINANCE_PERMISSIONS.includes(p) ? "amber" : "neutral"}>
                {FINANCE_PERMISSIONS.includes(p) ? <Lock className="size-3" aria-hidden /> : null}
                {permissionLabel(p)}
              </Badge>
            ))}
            {u.permissions.length > 2 ? <Badge tone="dark">+{u.permissions.length - 2}</Badge> : null}
          </span>
        ),
    },
    { key: "status", header: "Status", sortable: true, render: (u) => <StatusPill status={u.status} /> },
    {
      key: "mfa",
      header: "MFA",
      sortable: true,
      render: (u) => (u.mfa ? <StatusPill status="Enabled" size="sm">On</StatusPill> : <span className="text-[12px] text-ink-3">Off</span>),
    },
    {
      key: "lastActive",
      header: "Last login",
      sortable: true,
      render: (u) => <span className={u.lastActive ? "text-ink-2" : "text-ink-3"}>{lastActiveLabel(u.lastActive)}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (u) => {
        const self = Boolean(u.staffId && u.staffId === selfStaffId);
        if (u.status === "invited")
          return (
            <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); onResend([u.id]); }}>
              <MailPlus className="size-3.5" />
              Resend
            </Button>
          );
        if (u.status === "suspended")
          return (
            <Button size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); onStatus([u.id], "active", "reactivated"); }}>
              <RotateCcw className="size-3.5" />
              Reactivate
            </Button>
          );
        return (
          <span title={self ? "You cannot suspend your own account" : undefined} className="inline-flex">
            <Button size="xs" variant="ghost" disabled={self} onClick={(e) => { e.stopPropagation(); onStatus([u.id], "suspended", "suspended"); }}>
              <UserMinus className="size-3.5" />
              Suspend
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <section className="space-y-4">
      <SectionHead
        title="Manage all platform users"
        sub="Staff across the five staff logins and learner accounts. Open a user to change their login, permissions or status."
      />
      <DataTable
        caption="Platform users"
        rows={rows}
        columns={columns}
        getRowId={(u) => u.id}
        initialSort={{ key: "role", dir: "asc" }}
        search={{ placeholder: "Search name or email", match: (u, q) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(role || status || org)}
            onClear={() => {
              setRole("");
              setStatus("");
              setOrg("");
            }}
          >
            <FilterSelect label="Login" allLabel="All six logins" value={role} onChange={setRole} options={ROLE_IDS.map((r) => ({ value: r, label: ROLE_SHORT[r] }))} />
            <FilterSelect
              label="Status"
              allLabel="Any status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "active", label: "Active" },
                { value: "invited", label: "Invited" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
            <FilterSelect label="University" allLabel="All organisations" value={org} onChange={setOrg} options={ORGANISATIONS} />
          </FilterBar>
        }
        toolbar={
          <Button size="sm" variant="secondary" onClick={onInvite}>
            <Plus className="size-4" />
            Invite
          </Button>
        }
        selectable
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" variant="inverse" onClick={() => { onResend(ids); clear(); }}>
              <MailPlus className="size-3.5" />
              Resend invitation
            </Button>
            <Button size="sm" variant="inverse" onClick={() => { onStatus(ids, "active", "reactivated"); clear(); }}>
              <RotateCcw className="size-3.5" />
              Reactivate
            </Button>
            <Button size="sm" variant="danger" onClick={() => { onStatus(ids, "suspended", "suspended"); clear(); }}>
              <UserMinus className="size-3.5" />
              Suspend
            </Button>
          </>
        )}
        onRowClick={onEdit}
        rowLabel={(u) => `Edit ${u.name}`}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ roles panel */

function RolesPanel({
  roles,
  users,
  setUsers,
  matrix,
  setMatrix,
  onCreateRole,
}: {
  roles: RoleCol[];
  users: PlatformUser[];
  setUsers: React.Dispatch<React.SetStateAction<PlatformUser[]>>;
  matrix: Record<string, Record<string, AccessLevel>>;
  setMatrix: React.Dispatch<React.SetStateAction<Record<string, Record<string, AccessLevel>>>>;
  onCreateRole: () => void;
}) {
  const [group, setGroup] = useState("");
  const [grant, setGrant] = useState<AccessLevel>("view");
  const groups = [...new Set(capabilities.map((c) => c.group))];
  const programmeAdmins = users.filter((u) => u.role === "programme-admin");

  return (
    <section className="space-y-5">
      <SectionHead
        title="Create roles and permissions"
        sub="Roles set what each login can reach. Tick a capability to grant it at the chosen level; untick to remove it."
        action={
          <Button size="sm" variant="secondary" onClick={onCreateRole}>
            <Plus className="size-4" />
            Create role
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id} className="min-w-0 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{r.name}</p>
              {r.custom ? <Badge tone="cta">Custom</Badge> : null}
              {r.seatLimit ? (
                <Badge tone="dark">
                  {users.filter((u) => u.role === "super-admin" && u.status !== "suspended").length} of {r.seatLimit} seats
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[12.5px] text-ink-3">{r.description}</p>
            <p className="mt-2 text-[12.5px] text-ink-2">
              <span className="font-semibold text-ink tnum">{r.custom ? "No users yet" : `${r.users} users`}</span> · {r.scope}
            </p>
          </Card>
        ))}
      </div>

      <Card className="min-w-0">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Lock className="size-4 text-amber" aria-hidden />
              Finance is a restricted permission within Programme Admin
            </span>
          }
          sub="Programme Admins do not see fee status, payment plans or ACCA-related payments unless granted View finance. Recording payments needs Record finance as well."
        />
        <div className="px-5 pb-5">
          <Matrix
            caption="Programme Admin permissions"
            corner="Programme Admin user"
            dense
            rows={programmeAdmins.map((u) => ({ id: u.id, label: u.name, sub: u.title }))}
            cols={PROGRAMME_PERMISSIONS.map((p) => ({ id: p, label: permissionLabel(p), sub: FINANCE_PERMISSIONS.includes(p) ? "Restricted" : p }))}
            cell={(rowId, colId) => {
              const u = programmeAdmins.find((x) => x.id === rowId);
              if (!u) return null;
              const on = u.permissions.includes(colId);
              const needsView = colId === "finance:record" && !u.permissions.includes("finance:view") && !on;
              return (
                <MatrixCheck
                  checked={on}
                  label={`${u.name}: ${permissionLabel(colId)}`}
                  disabled={needsView}
                  disabledReason="Grant View finance first"
                  onChange={(next) => {
                    setUsers((list) =>
                      list.map((x) => {
                        if (x.id !== u.id) return x;
                        let perms = next ? [...x.permissions, colId] : x.permissions.filter((p) => p !== colId);
                        if (!next && colId === "finance:view") perms = perms.filter((p) => p !== "finance:record");
                        return { ...x, permissions: PROGRAMME_PERMISSIONS.filter((p) => perms.includes(p)) };
                      }),
                    );
                    toast({
                      title: `${next ? "Granted" : "Removed"} ${permissionLabel(colId)}`,
                      body: `${u.name}${!next && colId === "finance:view" ? " · Record finance removed too" : ""} · logged in the audit log`,
                      tone: FINANCE_PERMISSIONS.includes(colId) ? "warning" : "success",
                    });
                  }}
                />
              );
            }}
          />
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MiniLabel>Roles and permissions matrix</MiniLabel>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {capabilities.length} capabilities × {roles.length} roles. Super Admin permissions are fixed by the platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label="Group" allLabel="All groups" value={group} onChange={setGroup} options={groups} />
            <span className="text-[12px] font-semibold text-ink-3">Tick grants</span>
            <Segmented
              size="sm"
              value={grant}
              onChange={(v) => setGrant(v as AccessLevel)}
              items={[
                { id: "view", label: "View" },
                { id: "edit", label: "Edit" },
                { id: "full", label: "Full" },
              ]}
            />
          </div>
        </div>
        <Matrix
          caption="Roles and permissions"
          corner="Capability"
          dense
          maxHeight="36rem"
          rows={capabilities
            .filter((c) => !group || c.group === group)
            .map((c) => ({
              id: c.id,
              label: c.label,
              sub: FINANCE_CAPABILITIES.includes(c.id) ? `${c.group} · restricted within Programme Admin` : c.group,
            }))}
          cols={roles.map((r) => ({ id: r.id, label: r.short, sub: r.custom ? "Custom" : r.id === "super-admin" ? "Fixed" : undefined }))}
          cell={(capId, roleId) => {
            const level = matrix[capId]?.[roleId] ?? "none";
            const cap = capabilities.find((c) => c.id === capId);
            const role = roles.find((r) => r.id === roleId);
            return (
              <span className="inline-grid justify-items-center gap-0.5">
                <MatrixCheck
                  checked={level !== "none"}
                  label={`${role?.short}: ${cap?.label}`}
                  disabled={roleId === "super-admin"}
                  disabledReason="Super Admin permissions are fixed"
                  onChange={(next) => {
                    const value: AccessLevel = next ? grant : "none";
                    setMatrix((m) => ({ ...m, [capId]: { ...m[capId], [roleId]: value } }));
                    toast({ title: `${role?.short}: ${cap?.label}`, body: `Set to ${ACCESS_LEVEL_LABELS[value]}`, tone: value === "none" ? "neutral" : "success" });
                  }}
                />
                <span className={cn("text-[10.5px] font-semibold", level === "none" ? "text-ink-3" : level === "full" ? "text-ink" : "text-ink-2")}>
                  {level === "none" ? "None" : ACCESS_LEVEL_LABELS[level]}
                </span>
              </span>
            );
          }}
        />
      </div>

      <Card className="min-w-0">
        <CardHeader title="Permission strings" sub="Fine-grained permissions carried by individual users inside a role" />
        <ul className="divide-y divide-line border-t border-line">
          {permissionDefinitions.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-2.5">
              <code className="w-52 shrink-0 font-mono text-[12px] text-ink-2">{p.id}</code>
              <span className="min-w-0 flex-1 basis-60 text-[13px]">
                <span className="font-semibold text-ink">{p.label}</span>
                <span className="text-ink-3"> · {p.description}</span>
              </span>
              <span className="flex flex-wrap gap-1">
                {p.roles.map((r) => (
                  <Badge key={r}>{ROLE_SHORT[r]}</Badge>
                ))}
                {FINANCE_PERMISSIONS.includes(p.id) ? <Badge tone="amber">Restricted</Badge> : null}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------------ permission checkboxes */

function PermissionChecks({ role, defaults, name = "permissions" }: { role: AccaRoleId; defaults: string[]; name?: string }) {
  const options = permissionDefinitions.filter((p) => p.roles.includes(role) && p.id !== "platform:all");
  if (role === "super-admin") {
    return <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">Super Admins hold every permission (platform:all).</p>;
  }
  if (options.length === 0) {
    return <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">Learners see their own record only. No extra permissions.</p>;
  }
  return (
    <fieldset>
      <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Permissions</legend>
      <div className="space-y-2.5">
        {options.map((p) => (
          <Checkbox
            key={p.id}
            name={name}
            value={p.id}
            defaultChecked={defaults.includes(p.id)}
            label={
              <span>
                <span className="font-semibold text-ink">{p.label}</span>
                {FINANCE_PERMISSIONS.includes(p.id) ? (
                  <Badge tone="amber" className="ml-1.5 align-middle">
                    Restricted
                  </Badge>
                ) : null}
                <span className="block text-[12px] text-ink-3">{p.description}</span>
              </span>
            }
          />
        ))}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ invite */

function InviteDrawer({
  open,
  formKey,
  seatsFull,
  onClose,
  onInvite,
}: {
  open: boolean;
  formKey: number;
  seatsFull: boolean;
  onClose: () => void;
  onInvite: (user: PlatformUser) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Invite user"
      sub="The user receives an email to set a password and turn on multi-factor authentication."
      submitLabel="Send invitation"
      onSubmit={(data) => {
        const role = String(data.get("role")) as AccaRoleId;
        if (role === "super-admin" && seatsFull) {
          toast({ title: "No Super Admin seats left", body: `All ${SUPER_ADMIN_SEAT_LIMIT} seats are in use.`, tone: "warning" });
          return;
        }
        const name = String(data.get("name")).trim();
        onInvite({
          id: `pu-inv-${slugify(name)}-${formKey}`,
          name,
          email: String(data.get("email")).trim(),
          role,
          title: String(data.get("title")).trim(),
          organisation: String(data.get("organisation")),
          status: "invited",
          lastActive: "",
          mfa: false,
          permissions: role === "super-admin" ? ["platform:all"] : data.getAll("permissions").map(String),
        });
      }}
    >
      <InviteFields key={formKey} seatsFull={seatsFull} />
    </FormDrawer>
  );
}

export function InviteFields({ seatsFull }: { seatsFull: boolean }) {
  const [role, setRole] = useState<AccaRoleId>("programme-admin");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="name" required placeholder="e.g. Sneha Kulkarni" />
        </Field>
        <Field label="Work email">
          <Input name="email" type="email" required placeholder="name@zskillup.com" />
        </Field>
      </div>
      <Field label="Login" hint={seatsFull ? "Super Admin seats are full" : undefined}>
        <Select name="role" value={role} onChange={(e) => setRole(e.target.value as AccaRoleId)}>
          {ROLE_IDS.map((r) => (
            <option key={r} value={r} disabled={r === "super-admin" && seatsFull}>
              {platformRoles.find((x) => x.id === r)?.name}
              {r === "super-admin" && seatsFull ? " (no seats left)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      {role === "super-admin" ? (
        <p className="rounded-[12px] border border-rose/30 bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-ink">
          Super Admin access is for a small number of people. This uses one of the remaining seats.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input name="title" required placeholder="e.g. Academic Operations Executive" />
        </Field>
        <Field label="Organisation">
          <Select name="organisation" key={role} defaultValue={role === "university-admin" ? universities[0].name : "ZSkillup"}>
            {ORGANISATIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>
      </div>
      <PermissionChecks key={role} role={role} defaults={DEFAULT_PERMISSIONS[role]} />
    </>
  );
}

/* ------------------------------------------------------------------ edit user */

function EditUserDrawer({
  user,
  seatsFull,
  isSelf,
  onClose,
  onSave,
}: {
  user: PlatformUser | null;
  seatsFull: boolean;
  isSelf: boolean;
  onClose: () => void;
  onSave: (u: PlatformUser) => void;
}) {
  return (
    <FormDrawer
      open={user != null}
      onClose={onClose}
      title={user?.name ?? "User"}
      sub={user ? `${user.email} · ${user.organisation}` : undefined}
      submitLabel="Save user"
      footerNote="Changes are logged in the audit log"
      onSubmit={(data) => {
        if (!user) return;
        const role = String(data.get("role")) as AccaRoleId;
        if (role === "super-admin" && user.role !== "super-admin" && seatsFull) {
          toast({ title: "No Super Admin seats left", body: `All ${SUPER_ADMIN_SEAT_LIMIT} seats are in use.`, tone: "warning" });
          return;
        }
        onSave({
          ...user,
          role,
          title: String(data.get("title")).trim(),
          status: isSelf ? user.status : (String(data.get("status")) as PlatformUser["status"]),
          mfa: String(data.get("mfa")) === "on",
          permissions: role === "super-admin" ? ["platform:all"] : data.getAll("permissions").map(String),
        });
      }}
    >
      {user ? <EditFields key={user.id} user={user} isSelf={isSelf} /> : null}
    </FormDrawer>
  );
}

export function EditFields({ user, isSelf }: { user: PlatformUser; isSelf: boolean }) {
  const [role, setRole] = useState<AccaRoleId>(user.role);
  const [mfa, setMfa] = useState(user.mfa);
  return (
    <>
      <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3.5">
        <Avatar name={user.name} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-ink">{user.title}</p>
          <p className="truncate text-[12px] text-ink-3">Last login: {lastActiveLabel(user.lastActive)}</p>
        </div>
        <StatusPill status={user.status} size="sm" className="ml-auto" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Login">
          <Select name="role" value={role} onChange={(e) => setRole(e.target.value as AccaRoleId)} disabled={isSelf}>
            {ROLE_IDS.map((r) => (
              <option key={r} value={r}>
                {platformRoles.find((x) => x.id === r)?.name}
              </option>
            ))}
          </Select>
          {isSelf ? <input type="hidden" name="role" value={role} /> : null}
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={user.status} disabled={isSelf}>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </Select>
        </Field>
      </div>
      <Field label="Title">
        <Input name="title" defaultValue={user.title} required />
      </Field>
      <div className="rounded-[12px] border border-line px-3.5 py-3">
        <Switch checked={mfa} onChange={setMfa} label="Multi-factor authentication" sub={user.role === "student" ? "Optional for learners" : "Required for ZSkillup staff"} />
        <input type="hidden" name="mfa" value={mfa ? "on" : "off"} />
      </div>
      <PermissionChecks key={role} role={role} defaults={role === user.role ? user.permissions : DEFAULT_PERMISSIONS[role]} />
      {isSelf ? <p className="text-[12px] text-ink-3">You cannot change your own login or status. Ask the other Super Admin.</p> : null}
    </>
  );
}

/* ------------------------------------------------------------------ create role */

function CreateRoleDrawer({
  open,
  formKey,
  roles,
  matrix,
  onClose,
  onCreate,
}: {
  open: boolean;
  formKey: number;
  roles: RoleCol[];
  matrix: Record<string, Record<string, AccessLevel>>;
  onClose: () => void;
  onCreate: (role: RoleCol, levels: Record<string, AccessLevel>) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Create role"
      sub="Start from an existing role, then add or remove capabilities. The new role appears as a column in the matrix."
      submitLabel="Create role"
      width="w-full max-w-xl"
      onSubmit={(data) => {
        const name = String(data.get("name")).trim();
        const cloneId = String(data.get("clone"));
        const clone = roles.find((r) => r.id === cloneId) ?? roles[1];
        const picked = new Set(data.getAll("caps").map(String));
        if (picked.size === 0) {
          toast({ title: "Choose at least one capability", tone: "warning" });
          return;
        }
        const levels: Record<string, AccessLevel> = {};
        for (const c of capabilities) {
          const source = matrix[c.id]?.[clone.id] ?? "none";
          levels[c.id] = picked.has(c.id) ? (source === "none" ? "view" : source === "full" ? "edit" : source) : "none";
        }
        onCreate(
          {
            id: `role-${slugify(name)}-${formKey}`,
            name,
            short: name.length > 18 ? `${name.slice(0, 17)}…` : name,
            description: String(data.get("description")).trim(),
            users: 0,
            scope: String(data.get("scope")).trim(),
            custom: true,
            base: clone.base,
          },
          levels,
        );
      }}
    >
      <RoleFields key={formKey} roles={roles} matrix={matrix} />
    </FormDrawer>
  );
}

export function RoleFields({ roles, matrix }: { roles: RoleCol[]; matrix: Record<string, Record<string, AccessLevel>> }) {
  const [cloneId, setCloneId] = useState("programme-admin");
  const groups = [...new Set(capabilities.map((c) => c.group))];
  return (
    <>
      <Field label="Role name">
        <Input name="name" required defaultValue="Finance Operations" />
      </Field>
      <Field label="Clone from">
        <Select name="clone" value={cloneId} onChange={(e) => setCloneId(e.target.value)}>
          {roles
            .filter((r) => r.id !== "super-admin")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Description">
          <Textarea name="description" rows={2} required defaultValue="Enrolled-student fees, receipts and reconciliation." />
        </Field>
        <Field label="Scope">
          <Textarea name="scope" rows={2} required defaultValue="All programmes; no academic records" />
        </Field>
      </div>
      <fieldset className="space-y-3" key={cloneId}>
        <legend className="mb-1 text-[12.5px] font-semibold text-ink-2">Capabilities</legend>
        <p className="text-[12px] text-ink-3">Ticked from the cloned role. Full access is reduced to Edit for custom roles.</p>
        {groups.map((g) => (
          <div key={g} className="rounded-[12px] border border-line p-3">
            <MiniLabel>{g}</MiniLabel>
            <div className="mt-2 space-y-2">
              {capabilities
                .filter((c) => c.group === g)
                .map((c) => (
                  <Checkbox
                    key={c.id}
                    name="caps"
                    value={c.id}
                    defaultChecked={(matrix[c.id]?.[cloneId] ?? "none") !== "none"}
                    label={
                      <span>
                        {c.label}
                        {FINANCE_CAPABILITIES.includes(c.id) ? (
                          <Badge tone="amber" className="ml-1.5 align-middle">
                            Restricted
                          </Badge>
                        ) : null}
                      </span>
                    }
                  />
                ))}
            </div>
          </div>
        ))}
      </fieldset>
    </>
  );
}
