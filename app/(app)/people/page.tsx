"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Mail,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { completionByDept, courses, people } from "@/lib/data";
import { PageHeader, StatTile, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/tabs";

const statusTone: Record<string, Tone> = {
  active: "jade",
  invited: "amber",
  suspended: "rose",
};

export default function PeoplePage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All departments");
  const [seg, setSeg] = useState("all");

  const depts = useMemo(
    () => ["All departments", ...Array.from(new Set(people.map((p) => p.department)))],
    [],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return people.filter((p) => {
      if (dept !== "All departments" && p.department !== dept) return false;
      if (seg === "risk" && p.streak > 2 && p.enrolled - p.completed < 3)
        return false;
      if (seg === "instructors" && p.role === "learner") return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.email.toLowerCase().includes(needle) ||
        p.title.toLowerCase().includes(needle)
      );
    });
  }, [q, dept, seg]);

  const atRisk = people.filter((p) => p.streak === 0 || p.status !== "active");
  const compliant = courses.filter((c) => c.compliance?.mandatory).length;

  return (
    <div className="mx-auto max-w-[92rem] space-y-7">
      <PageHeader
        eyebrow="People"
        title="Who is learning, and who has stalled"
        sub="Managers see completion and pass or fail. They do not see answers, attempt counts or anything a learner said to the assistant."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Download className="size-3.5" /> Export
            </Button>
            <Button size="sm">
              <UserPlus className="size-4" /> Invite people
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="People" value={people.length} icon={<Users />} />
        <StatTile
          label="Active this week"
          value={people.filter((p) => p.streak > 0).length}
          tone="jade"
        />
        <StatTile
          label="Stalled or blocked"
          value={atRisk.length}
          tone="ember"
          icon={<AlertTriangle />}
        />
        <StatTile
          label="Mandatory courses"
          value={compliant}
          tone="rose"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <Input
            icon={<Search />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email or title…"
          />
        </div>
        <div className="w-48">
          <Select value={dept} onChange={(e) => setDept(e.target.value)}>
            {depts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </div>
        <Segmented
          value={seg}
          onChange={setSeg}
          items={[
            { id: "all", label: "Everyone" },
            { id: "risk", label: "At risk" },
            { id: "instructors", label: "Instructors" },
          ]}
        />
        <span className="ml-auto text-[12.5px] text-ink-3 tnum">
          {rows.length} people
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="Nobody matches that"
          sub="Try a different department or clear the search."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem]">
              <thead>
                <tr className="border-b border-line text-left">
                  {[
                    "Person",
                    "Role",
                    "Department",
                    "Enrolled",
                    "Completed",
                    "Streak",
                    "Points",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-semibold tracking-[0.1em] whitespace-nowrap text-ink-3 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.map((p) => (
                  <tr key={p.id} className="group hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-ink">
                            {p.name}
                          </p>
                          <p className="truncate text-[11.5px] text-ink-3">
                            {p.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          p.role === "admin"
                            ? "violet"
                            : p.role === "instructor"
                              ? "brand"
                              : "neutral"
                        }
                      >
                        {p.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] whitespace-nowrap text-ink-2">
                      {p.department}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-2 tnum">
                      {p.enrolled}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <Progress
                          value={
                            (p.completed / Math.max(1, p.completed + p.enrolled)) *
                            100
                          }
                          className="w-14"
                          height={4}
                          tone="jade"
                        />
                        <span className="text-[12.5px] text-ink-2 tnum">
                          {p.completed}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-2 tnum">
                      {p.streak === 0 ? (
                        <span className="text-ink-3">—</span>
                      ) : (
                        `${p.streak}d`
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-2 tnum">
                      {p.points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Badge tone={statusTone[p.status]} dot>
                          {p.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Mail className="size-3.5" />
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <section>
        <SectionTitle>Compliance by department</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {completionByDept.map((d) => (
            <Card key={d.label} className="p-4.5">
              <p className="text-[13px] font-medium text-ink">{d.label}</p>
              <p className="mt-2.5 text-[24px] leading-none font-semibold tracking-[-0.03em] text-ink tnum">
                {d.value}%
              </p>
              <Progress
                value={d.value}
                className="mt-3"
                height={5}
                tone={d.value >= 80 ? "jade" : d.value >= 65 ? "brand" : "ember"}
              />
              <p className="mt-2.5 text-[11.5px] text-ink-3 tnum">
                {d.headcount} people ·{" "}
                {Math.round((d.headcount * (100 - d.value)) / 100)} outstanding
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
