import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Building2,
  Download,
  Flame,
  Link2,
  Mail,
  MapPin,
  Trophy,
} from "lucide-react";
import {
  activityHeat,
  courses,
  currentUser,
  enrolledCourses,
  paths,
} from "@/lib/data";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HeatGrid } from "@/components/ui/charts";
import { Button } from "@/components/ui/button";
import { StatTile, DataRow } from "@/components/ui/misc";

export const metadata = { title: "Profile" };

const BADGES = [
  { name: "First certificate", tone: "jade", detail: "Security Foundations, Aug 2026" },
  { name: "30-day streak", tone: "ember", detail: "Longest run: 31 days" },
  { name: "Path finisher", tone: "brand", detail: "New Joiner Onboarding" },
  { name: "Top 5% of cohort", tone: "violet", detail: "Distributed Systems, module 3" },
  { name: "Helpful answer", tone: "amber", detail: "12 accepted replies in Q&A" },
];

export default function ProfilePage() {
  const completed = enrolledCourses.filter((c) => c.progress === 100);
  const certs = completed.filter((c) => c.certificate);
  const myPath = paths[0];

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <Card className="overflow-hidden">
        <div className="relative h-28 bg-stage">
          <div className="grain absolute inset-0" />
          <div
            className="absolute -top-16 right-10 size-64 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle,var(--stage-brand),transparent 70%)" }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-5 px-6 pb-5">
          <span className="-mt-10">
            <Avatar
              name={currentUser.name}
              size="xl"
              className="size-24 text-[28px] ring-4 ring-surface"
            />
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="font-display text-[2rem] leading-tight tracking-[var(--display-tracking)] text-ink">
              {currentUser.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5" /> {currentUser.title} ·{" "}
                {currentUser.department}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {currentUser.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {currentUser.email}
              </span>
            </p>
          </div>
          <div className="flex gap-2.5 pb-1">
            <Button variant="secondary" size="sm">
              <Link2 className="size-3.5" /> Public profile
            </Button>
            <Button size="sm">Edit profile</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Certificates"
          value={certs.length}
          tone="jade"
          icon={<BadgeCheck />}
        />
        <StatTile
          label="Courses completed"
          value={currentUser.completed}
          icon={<Award />}
        />
        <StatTile
          label="Points"
          value={currentUser.points.toLocaleString()}
          tone="ember"
          icon={<Trophy />}
          spark={[3100, 3400, 3550, 3700, 3980, 4100, 4300, 4620, 4820]}
        />
        <StatTile
          label="Longest streak"
          value="31 days"
          tone="violet"
          icon={<Flame />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Certificates"
              sub="Verifiable and shareable. Compliance certificates carry an expiry."
            />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {certs.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)]"
                    style={{
                      backgroundColor: `var(--${c.accent}-soft)`,
                      color: `var(--${c.accent})`,
                    }}
                  >
                    <Award className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {c.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3 tnum">
                      Credential ID MRD-{c.id.toUpperCase().slice(2)}-4471 ·
                      issued 28 Aug 2026
                    </p>
                  </div>
                  {c.compliance?.recertifyMonths ? (
                    <Badge tone="amber">Expires 28 Aug 2027</Badge>
                  ) : (
                    <Badge tone="jade">No expiry</Badge>
                  )}
                  <Button variant="secondary" size="xs">
                    <Download className="size-3.5" /> PDF
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Badges" sub="Earned, not bought" />
            <div className="flex flex-wrap gap-2.5 border-t border-line px-5 py-4">
              {BADGES.map((b) => (
                <span
                  key={b.name}
                  title={b.detail}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 shadow-[var(--shadow-e1)]"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: `var(--${b.tone})` }}
                  />
                  <span className="text-[12.5px] font-medium text-ink">
                    {b.name}
                  </span>
                  <span className="text-[11.5px] text-ink-3">{b.detail}</span>
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity" sub="Last 26 weeks" />
            <div className="border-t border-line px-5 py-4">
              <HeatGrid values={activityHeat} weeks={26} />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Current path" sub={myPath.title} />
            <div className="border-t border-line px-5 py-4">
              {myPath.steps.map((s) => {
                const c = courses.find((x) => x.id === s.courseId)!;
                return (
                  <div key={s.courseId} className="mb-3.5 last:mb-0">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <Link
                        href={`/courses/${c.slug}`}
                        className="truncate text-[12.5px] text-ink-2 hover:text-brand hover:underline"
                      >
                        {c.title}
                      </Link>
                      <span className="shrink-0 text-[11.5px] text-ink-3 tnum">
                        {c.progress ?? 0}%
                      </span>
                    </div>
                    <Progress
                      value={c.progress ?? 0}
                      height={4}
                      tone={c.progress === 100 ? "jade" : "brand"}
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Record" />
            <dl className="border-t border-line px-5 py-1">
              <DataRow label="Joined">4 November 2024</DataRow>
              <DataRow label="Manager">Grace Whitfield</DataRow>
              <DataRow label="Compliance">
                <span className="text-amber">1 item outstanding</span>
              </DataRow>
              <DataRow label="Learning time, all time">
                <span className="tnum">146 hours</span>
              </DataRow>
              <DataRow label="Q&A answers accepted">
                <span className="tnum">12</span>
              </DataRow>
            </dl>
          </Card>

          <Card className="p-4.5">
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              Your manager can see which courses you completed and whether you
              passed. They cannot see your answers, your chat with the
              assistant, or how many attempts you took.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
