import Link from "next/link";
import { ArrowRight, Lock, Users } from "lucide-react";
import { courses, paths, personById } from "@/lib/data";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AvatarStack } from "@/components/ui/avatar";

export const metadata = { title: "Learning paths" };

export default function PathsPage() {
  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <PageHeader
        eyebrow="Learning paths"
        title="Sequences, not shelves"
        sub="A path ties courses to a role, a skill or a moment — joining, being promoted, being certified. Steps unlock in order, and a gated step needs evidence rather than attendance."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {paths.map((p) => {
          const owner = personById(p.owner);
          const stepCourses = p.steps
            .map((s) => courses.find((c) => c.id === s.courseId))
            .filter(Boolean);
          const myDone = stepCourses.filter(
            (c) => c && c.progress === 100,
          ).length;
          const myProgress = Math.round((myDone / p.steps.length) * 100);
          const gates = p.steps.filter((s) => s.gate).length;

          return (
            <Link
              key={p.id}
              href={`/paths/${p.slug}`}
              className="group block"
            >
              <Card
                interactive
                className="flex h-full flex-col overflow-hidden"
              >
                <div
                  className="h-1"
                  style={{ backgroundColor: `var(--${p.accent})` }}
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={p.accent as Tone}>{p.kind}</Badge>
                    <span className="text-[12px] text-ink-3 tnum">
                      {p.steps.length} courses · {p.weeks} weeks
                    </span>
                    {gates ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                        <Lock className="size-3" /> {gates} gated
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-[18px] leading-snug font-semibold tracking-[-0.015em] text-ink transition-colors group-hover:text-brand">
                    {p.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">
                    {p.purpose}
                  </p>

                  {/* Step strip — the path shape at a glance */}
                  <div className="mt-4 flex items-center gap-1">
                    {p.steps.map((s, i) => {
                      const c = courses.find((x) => x.id === s.courseId);
                      const state =
                        c?.progress === 100
                          ? "done"
                          : (c?.progress ?? 0) > 0
                            ? "active"
                            : "todo";
                      return (
                        <span key={s.courseId} className="flex flex-1 items-center gap-1">
                          <span
                            title={c?.title}
                            className={
                              "h-1.5 flex-1 rounded-full " +
                              (state === "done"
                                ? "bg-jade"
                                : state === "active"
                                  ? "bg-brand"
                                  : "bg-surface-3")
                            }
                          />
                          {s.gate && i < p.steps.length - 1 ? (
                            <Lock className="size-2.5 shrink-0 text-amber" />
                          ) : null}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5">
                    <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-3 tnum">
                      <Users className="size-3.5" />
                      {p.enrolled.toLocaleString()} enrolled
                    </span>
                    <span className="text-[12.5px] text-ink-3 tnum">
                      {p.completionRate}% finish
                    </span>
                    {owner ? (
                      <span className="ml-auto flex items-center gap-2">
                        <AvatarStack names={[owner.name]} size="xs" />
                        <span className="text-[12px] text-ink-3">
                          {owner.name}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t border-line pt-3.5">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[11.5px] text-ink-3">
                        Your progress
                      </span>
                      <span className="text-[11.5px] font-medium text-ink tnum">
                        {myDone} of {p.steps.length} done
                      </span>
                    </div>
                    <Progress value={myProgress} height={5} />
                  </div>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand">
                    Open path
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
