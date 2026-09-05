import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  RefreshCw,
  Timer,
} from "lucide-react";
import {
  assessments,
  courseById,
  submissions,
  totalPoints,
} from "@/lib/data";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Assessments" };

const daysTo = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.parse("2026-09-05T12:00:00+05:30")) / 86400000);

export default function AssessmentsPage() {
  const open = assessments.filter((a) => a.status === "open");
  const mine = submissions.filter((s) => s.personId === "u-anaya");

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <PageHeader
        eyebrow="Assessments"
        title="What you have to prove"
        sub="Quizzes are practice. Graded exams and projects decide certification, and a project is marked against a rubric you can read before you start, not after."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open to you" value={open.length} icon={<ClipboardCheck />} />
        <StatTile
          label="Due within 14 days"
          value={open.filter((a) => daysTo(a.dueAt) <= 14).length}
          tone="ember"
          icon={<Timer />}
        />
        <StatTile
          label="Passed"
          value={mine.filter((s) => (s.score ?? 0) >= 70).length + 6}
          tone="jade"
          icon={<CheckCircle2 />}
        />
        <StatTile
          label="Average score"
          value="88%"
          tone="violet"
          delta={{ value: "4 pts" }}
          spark={[72, 76, 74, 80, 83, 85, 84, 87, 88]}
        />
      </div>

      <section>
        <SectionTitle>Open</SectionTitle>
        <div className="space-y-3">
          {open.map((a) => {
            const course = courseById(a.courseId);
            const days = daysTo(a.dueAt);
            const urgent = days <= 14;
            return (
              <Card key={a.id} interactive className="overflow-hidden">
                <Link
                  href={`/assessments/${a.id}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5"
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)]"
                    style={{
                      backgroundColor: `var(--${course?.accent ?? "brand"}-soft)`,
                      color: `var(--${course?.accent ?? "brand"})`,
                    }}
                  >
                    <ClipboardCheck className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={a.autoGraded ? "brand" : "violet"}>
                        {a.kind}
                      </Badge>
                      {a.proctored ? <Badge tone="amber">Proctored</Badge> : null}
                      {a.rubricId ? <Badge tone="neutral">Rubric</Badge> : null}
                    </div>
                    <p className="mt-2 text-[15px] font-semibold tracking-[-0.012em] text-ink">
                      {a.title}
                    </p>
                    <p className="mt-1 truncate text-[12.5px] text-ink-3">
                      {course?.title}
                    </p>
                  </div>

                  <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                    {[
                      ["Questions", `${a.questions.length}`],
                      ["Points", `${totalPoints(a)}`],
                      ["Time", a.minutes ? `${a.minutes} min` : "Untimed"],
                      ["Pass", `${a.passMark}%`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[11px] text-ink-3">{k}</dt>
                        <dd className="mt-0.5 text-[13px] font-medium text-ink tnum">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="shrink-0 text-right">
                    <p
                      className={
                        "inline-flex items-center gap-1.5 text-[12.5px] font-medium tnum " +
                        (urgent ? "text-ember" : "text-ink-3")
                      }
                    >
                      {urgent ? (
                        <AlertTriangle className="size-3.5" />
                      ) : (
                        <CalendarClock className="size-3.5" />
                      )}
                      Due in {days} days
                    </p>
                    <p className="mt-1 text-[11.5px] text-ink-3 tnum">
                      {a.attempts} attempt{a.attempts > 1 ? "s" : ""} allowed
                    </p>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle
          action={
            <span className="text-[12px] text-ink-3">
              Scores are visible to you and your instructor; your manager sees
              pass or fail only
            </span>
          }
        >
          Your history
        </SectionTitle>
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                {["Assessment", "Course", "Attempt", "Score", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {[
                ["Retrieval design check", "Building With LLMs", 1, 94, "Passed"],
                ["Security foundations certification", "Security Foundations", 1, 93, "Passed"],
                ["Consensus and replication", "Distributed Systems", 1, 68, "Failed"],
                ["Privacy certification 2026", "Data Privacy and GDPR", 1, null, "In progress"],
              ].map(([title, course, attempt, score, status]) => (
                <tr key={title as string} className="hover:bg-surface-2">
                  <td className="px-5 py-3.5 text-[13.5px] font-medium text-ink">
                    {title}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-ink-3">{course}</td>
                  <td className="px-5 py-3.5 text-[13px] text-ink-2 tnum">
                    {attempt}
                  </td>
                  <td className="px-5 py-3.5">
                    {score != null ? (
                      <span className="flex items-center gap-2.5">
                        <span className="text-[13.5px] font-semibold text-ink tnum">
                          {score}%
                        </span>
                        <Progress
                          value={score as number}
                          className="w-16"
                          height={4}
                          tone={(score as number) >= 70 ? "jade" : "ember"}
                        />
                      </span>
                    ) : (
                      <span className="text-[13px] text-ink-3">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      tone={
                        status === "Passed"
                          ? "jade"
                          : status === "Failed"
                            ? "rose"
                            : "amber"
                      }
                      dot
                    >
                      {status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href="/assessments/a-dist-consensus"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand hover:underline"
                    >
                      {status === "Failed" ? (
                        <>
                          <RefreshCw className="size-3.5" /> Retake
                        </>
                      ) : (
                        <>
                          <Eye className="size-3.5" /> Review
                        </>
                      )}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <SectionTitle>Scheduled and draft</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {assessments
            .filter((a) => a.status !== "open")
            .map((a) => (
              <Card key={a.id} className="p-4.5">
                <div className="flex items-center gap-2">
                  <Badge tone={a.status === "scheduled" ? "amber" : "neutral"}>
                    {a.status === "scheduled" ? "Scheduled" : "Draft"}
                  </Badge>
                  <span className="text-[12px] text-ink-3">{a.kind}</span>
                </div>
                <p className="mt-2.5 text-[14px] font-semibold text-ink">
                  {a.title}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-3">
                  {courseById(a.courseId)?.title}
                </p>
                <p className="mt-2.5 text-[12px] text-ink-3">
                  {a.status === "scheduled"
                    ? `Opens when the module unlocks · due ${new Date(a.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                    : "Not published — the course is still in review"}
                </p>
              </Card>
            ))}
        </div>
      </section>

      <div className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-5">
        <p className="text-[13px] leading-relaxed text-ink-2">
          <span className="font-medium text-ink">How grading works.</span>{" "}
          Multiple choice, true/false and code questions are graded on submit.
          Short answers are matched against a reference and sent for review when
          the match is ambiguous. Essays and projects are always marked by a
          person, against the rubric shown on the assessment page. Nothing is
          graded by a model without a human confirming it.
        </p>
      </div>
    </div>
  );
}
