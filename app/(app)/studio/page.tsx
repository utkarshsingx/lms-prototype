import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Copy,
  MoreHorizontal,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { courses, lessonCount, personById } from "@/lib/data";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Course studio" };

const statusTone: Record<string, Tone> = {
  published: "jade",
  in_review: "amber",
  draft: "neutral",
  archived: "neutral",
};
const statusLabel: Record<string, string> = {
  published: "Published",
  in_review: "In review",
  draft: "Draft",
  archived: "Archived",
};

const TEMPLATES = [
  {
    name: "Blank course",
    detail: "One module, one lesson. Build it however you like.",
    accent: "brand",
  },
  {
    name: "Compliance certification",
    detail: "Scenario module, final exam at 80%, annual recertification, audit export.",
    accent: "rose",
  },
  {
    name: "Technical deep dive",
    detail: "Video, reading, hands-on lab, capstone graded against a rubric.",
    accent: "violet",
  },
  {
    name: "Onboarding track",
    detail: "Day one, week one, month one. Auto-assigned on start date.",
    accent: "jade",
  },
];

export default function StudioPage() {
  const published = courses.filter((c) => c.status === "published");
  const drafts = courses.filter((c) => c.status !== "published");
  const totalLearners = courses.reduce((n, c) => n + c.enrolled, 0);

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <PageHeader
        eyebrow="Course studio"
        title="Author, review, publish"
        sub="Every course is versioned. Publishing a change does not disturb learners mid-attempt — they finish on the version they started."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Copy className="size-3.5" /> Import SCORM
            </Button>
            <Button size="sm">
              <Plus className="size-4" /> New course
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Published" value={published.length} tone="jade" />
        <StatTile label="Draft or in review" value={drafts.length} tone="amber" />
        <StatTile
          label="Total enrolments"
          value={totalLearners.toLocaleString()}
          spark={[8200, 9100, 9800, 10400, 11200, 12000, 12400, 12600, 12800]}
        />
        <StatTile
          label="Median rating"
          value="4.7"
          tone="violet"
          icon={<Star />}
        />
      </div>

      <section>
        <SectionTitle>Start from a template</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              className="group rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[var(--shadow-e3)]"
            >
              <span
                className="grid size-9 place-items-center rounded-[var(--radius-sm)]"
                style={{
                  backgroundColor: `var(--${t.accent}-soft)`,
                  color: `var(--${t.accent})`,
                }}
              >
                <Plus className="size-4" />
              </span>
              <p className="mt-3 text-[13.5px] font-semibold text-ink transition-colors group-hover:text-brand">
                {t.name}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
                {t.detail}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          action={
            <span className="text-[12px] text-ink-3 tnum">
              {courses.length} courses
            </span>
          }
        >
          All courses
        </SectionTitle>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem]">
              <thead>
                <tr className="border-b border-line text-left">
                  {[
                    "Course",
                    "Status",
                    "Author",
                    "Structure",
                    "Learners",
                    "Rating",
                    "Updated",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {courses.map((c) => {
                  const author = personById(c.instructorId);
                  return (
                    <tr key={c.id} className="group hover:bg-surface-2">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="size-8 shrink-0 rounded-[var(--radius-sm)]"
                            style={{
                              backgroundColor: `var(--${c.accent}-soft)`,
                            }}
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/studio/${c.slug}`}
                              className="block max-w-[18rem] truncate text-[13.5px] font-medium text-ink hover:text-brand hover:underline"
                            >
                              {c.title}
                            </Link>
                            <p className="mt-0.5 text-[11.5px] text-ink-3">
                              {c.category} · {c.level}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={statusTone[c.status]} dot>
                          {statusLabel[c.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {author ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={author.name} size="xs" />
                            <span className="text-[12.5px] whitespace-nowrap text-ink-2">
                              {author.name}
                            </span>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px] whitespace-nowrap text-ink-2 tnum">
                        {c.modules.length}m · {lessonCount(c)}l · {c.hours}h
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-2">
                          <Users className="size-3.5 text-ink-3" />
                          <span className="text-[12.5px] text-ink-2 tnum">
                            {c.enrolled.toLocaleString()}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-2">
                          <Progress
                            value={(c.rating / 5) * 100}
                            className="w-12"
                            height={4}
                            tone="ink"
                          />
                          <span className="text-[12.5px] text-ink-2 tnum">
                            {c.rating}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px] whitespace-nowrap text-ink-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {new Date(c.updated).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <LinkButton
                            href={`/studio/${c.slug}`}
                            variant="secondary"
                            size="xs"
                          >
                            Edit
                          </LinkButton>
                          <LinkButton
                            href={`/courses/${c.slug}`}
                            variant="ghost"
                            size="xs"
                          >
                            <ArrowUpRight className="size-3.5" />
                          </LinkButton>
                          <Button variant="ghost" size="xs">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
