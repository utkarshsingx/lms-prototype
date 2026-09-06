import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Lock,
  Target,
  Users,
} from "lucide-react";
import {
  courses,
  lessonCount,
  paths,
  pathBySlug,
  personById,
} from "@/lib/data";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Progress, Ring } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { DataRow, StatTile } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export async function generateStaticParams() {
  return paths.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: pathBySlug(slug)?.title ?? "Path" };
}

export default async function PathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = pathBySlug(slug);
  if (!path) notFound();

  const owner = personById(path.owner);
  const steps = path.steps.map((s) => ({
    ...s,
    course: courses.find((c) => c.id === s.courseId)!,
  }));
  const done = steps.filter((s) => s.course.progress === 100).length;
  const pct = Math.round((done / steps.length) * 100);
  const totalHours = steps.reduce((n, s) => n + s.course.hours, 0);
  const nextStep = steps.find((s) => (s.course.progress ?? 0) < 100);

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <nav className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <Link href="/paths" className="hover:text-ink">
          Learning paths
        </Link>
        <span>/</span>
        <span>{path.kind}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
        <div className="min-w-0 space-y-9">
          <header>
            <Badge tone={path.accent as Tone}>{path.kind} path</Badge>
            <h1 className="mt-3.5 font-display text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.04] tracking-[var(--display-tracking)] text-ink">
              {path.title}
            </h1>
            <p className="mt-3.5 max-w-2xl text-[15.5px] leading-[1.7] text-ink-2">
              {path.purpose}
            </p>
            <p className="mt-3 text-[13px] text-ink-3">
              For {path.audience} · owned by {owner?.name}
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-4">
            <StatTile label="Courses" value={steps.length} icon={<Target />} />
            <StatTile
              label="Total effort"
              value={`${totalHours}h`}
              icon={<Clock />}
              tone="violet"
            />
            <StatTile
              label="Planned over"
              value={`${path.weeks}w`}
              icon={<CalendarClock />}
              tone="ember"
            />
            <StatTile
              label="Peers finishing"
              value={`${path.completionRate}%`}
              icon={<Users />}
              tone="jade"
            />
          </div>

          <section>
            <SectionTitle>Outcomes</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {path.outcomes.map((o) => (
                <div key={o} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-jade" />
                  <p className="text-[13.5px] leading-relaxed text-ink-2">{o}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle
              action={
                <span className="text-[12px] text-ink-3 tnum">
                  {done} of {steps.length} complete
                </span>
              }
            >
              The sequence
            </SectionTitle>

            <ol className="relative space-y-4">
              <span className="absolute top-6 bottom-6 left-[19px] w-px bg-line" />
              {steps.map((s, i) => {
                const progress = s.course.progress ?? 0;
                const state =
                  progress === 100 ? "done" : progress > 0 ? "active" : "todo";
                const blocked =
                  state === "todo" &&
                  i > 0 &&
                  (steps[i - 1].course.progress ?? 0) < 100 &&
                  !!steps[i - 1].gate;

                return (
                  <li key={s.courseId} className="relative flex gap-4">
                    <span
                      className={cn(
                        "relative z-10 mt-2 grid size-10 shrink-0 place-items-center rounded-full border-2 text-[13px] font-semibold tnum",
                        state === "done"
                          ? "border-jade bg-jade text-on-accent"
                          : state === "active"
                            ? "border-brand bg-surface text-brand"
                            : "border-line bg-surface text-ink-3",
                      )}
                    >
                      {state === "done" ? (
                        <Check className="size-4.5" strokeWidth={3} />
                      ) : (
                        i + 1
                      )}
                    </span>

                    <Card
                      className={cn(
                        "flex-1 overflow-hidden",
                        blocked && "opacity-70",
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-4 p-4.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={s.required ? "rose" : "neutral"}
                            >
                              {s.required ? "Required" : "Optional"}
                            </Badge>
                            <span className="text-[12px] text-ink-3 tnum">
                              {s.weeks} week{s.weeks > 1 ? "s" : ""} ·{" "}
                              {s.course.hours}h · {lessonCount(s.course)} lessons
                            </span>
                          </div>
                          <Link
                            href={`/courses/${s.course.slug}`}
                            className="mt-2 block text-[15.5px] font-semibold tracking-[-0.012em] text-ink hover:text-brand hover:underline"
                          >
                            {s.course.title}
                          </Link>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
                            {s.course.subtitle}
                          </p>

                          {s.gate ? (
                            <p className="mt-3 inline-flex items-start gap-2 rounded-[var(--radius-sm)] border border-amber-soft bg-amber-soft px-2.5 py-1.5 text-[12px] leading-snug text-amber">
                              <Lock className="mt-0.5 size-3 shrink-0" />
                              Gate: {s.gate}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          {state !== "todo" ? (
                            <Ring
                              value={progress}
                              size={48}
                              stroke={4}
                              tone={progress === 100 ? "jade" : "brand"}
                            />
                          ) : null}
                          <LinkButton
                            href={`/learn/${s.course.slug}`}
                            variant={state === "active" ? "primary" : "secondary"}
                            size="sm"
                          >
                            {state === "done"
                              ? "Review"
                              : state === "active"
                                ? "Continue"
                                : "Start"}
                          </LinkButton>
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div
              className="h-1.5"
              style={{ backgroundColor: `var(--${path.accent})` }}
            />
            <div className="p-5">
              <div className="flex items-center gap-4">
                <Ring value={pct} size={64} stroke={5} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">
                    Your progress
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3 tnum">
                    {done} of {steps.length} courses complete
                  </p>
                </div>
              </div>

              <Progress value={pct} className="mt-4" height={7} />

              {nextStep ? (
                <div className="mt-5 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
                    Up next
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-medium text-ink">
                    {nextStep.course.title}
                  </p>
                  <LinkButton
                    href={`/learn/${nextStep.course.slug}`}
                    size="sm"
                    className="mt-3 w-full"
                  >
                    Continue <ArrowRight className="size-3.5" />
                  </LinkButton>
                </div>
              ) : (
                <div className="mt-5 rounded-[var(--radius-md)] border border-jade-soft bg-jade-soft p-3.5 text-center">
                  <p className="text-[13.5px] font-medium text-jade">
                    Path complete
                  </p>
                </div>
              )}

              <dl className="mt-5 border-t border-line pt-1">
                <DataRow label="Assignment">
                  {path.kind === "Compliance" || path.kind === "Onboarding"
                    ? "Automatic"
                    : "Self-enrol or manager"}
                </DataRow>
                <DataRow label="Enrolled">
                  <span className="tnum">{path.enrolled.toLocaleString()}</span>
                </DataRow>
                <DataRow label="Median finish">
                  <span className="tnum">{path.weeks + 3} weeks</span>
                </DataRow>
                <DataRow label="Gated steps">
                  <span className="tnum">
                    {path.steps.filter((s) => s.gate).length}
                  </span>
                </DataRow>
              </dl>

              <Button variant="secondary" size="sm" className="mt-4 w-full">
                Share this path
              </Button>
            </div>
          </Card>

          {owner ? (
            <Card className="mt-4 p-4">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
                Path owner
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={owner.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {owner.name}
                  </p>
                  <p className="truncate text-[12px] text-ink-3">
                    {owner.title}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
                Reviews the sequence quarterly. Gate changes go through the
                learning team, not the course author.
              </p>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
