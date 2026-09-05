"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, BookOpen, Clock, Download, Flame } from "lucide-react";
import { courses, currentUser, enrolledCourses, lessonCount } from "@/lib/data";
import { CourseCard } from "@/components/course/course-card";
import { PageHeader, EmptyState, StatTile } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";

export default function MyLearningPage() {
  const inProgress = enrolledCourses.filter(
    (c) => (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100,
  );
  const completed = enrolledCourses.filter((c) => c.progress === 100);
  const assigned = courses.filter(
    (c) => c.compliance?.mandatory && c.progress !== 100,
  );

  const [tab, setTab] = useState("progress");
  const shown =
    tab === "progress" ? inProgress : tab === "done" ? completed : assigned;

  const totalHours = enrolledCourses.reduce(
    (n, c) => n + (c.hours * (c.progress ?? 0)) / 100,
    0,
  );

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="My learning"
        title="Your shelf"
        sub="Everything you have started, finished or been assigned. Certificates issue automatically once every completion criterion is met."
        actions={
          <LinkButton href="/catalog" variant="secondary" size="sm">
            Find something new
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Courses completed"
          value={currentUser.completed}
          spark={[2, 3, 3, 4, 5, 5, 6, 7, 7]}
          tone="jade"
          icon={<Award />}
        />
        <StatTile
          label="Hours of learning"
          value={`${Math.round(totalHours)}h`}
          spark={[4, 9, 12, 16, 19, 22, 26, 29, 33]}
          icon={<Clock />}
        />
        <StatTile
          label="Current streak"
          value={`${currentUser.streak} days`}
          tone="ember"
          spark={[3, 5, 8, 10, 12, 14, 16, 17, 18]}
          icon={<Flame />}
        />
        <StatTile
          label="Certificates held"
          value={completed.filter((c) => c.certificate).length}
          tone="violet"
          icon={<BookOpen />}
        />
      </div>

      <div>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "progress", label: "In progress", count: inProgress.length },
            { id: "done", label: "Completed", count: completed.length },
            { id: "assigned", label: "Assigned to me", count: assigned.length },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="Nothing here yet"
          sub="When you enrol in a course or your manager assigns one, it lands here."
          action={
            <LinkButton href="/catalog" size="sm">
              Browse the catalog
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((c) => (
            <CourseCard key={c.id} course={c} showProgress />
          ))}
        </div>
      )}

      {tab === "done" && completed.length > 0 ? (
        <Card>
          <CardHeader
            title="Certificates"
            sub="Verifiable, with a public link and an expiry where the course requires recertification"
          />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {completed
              .filter((c) => c.certificate)
              .map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-4"
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)]"
                    style={{
                      backgroundColor: `var(--${c.accent}-soft)`,
                      color: `var(--${c.accent})`,
                    }}
                  >
                    <Award className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {c.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3 tnum">
                      Issued 28 Aug 2026 · {lessonCount(c)} lessons ·
                      {c.compliance?.recertifyMonths
                        ? ` expires 28 Aug 2027`
                        : " no expiry"}
                    </p>
                  </div>
                  {c.compliance?.recertifyMonths ? (
                    <Badge tone="amber">Recertify yearly</Badge>
                  ) : (
                    <Badge tone="jade">Permanent</Badge>
                  )}
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand hover:underline"
                  >
                    <Download className="size-3.5" /> PDF
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
