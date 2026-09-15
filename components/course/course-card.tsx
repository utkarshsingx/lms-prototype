import Link from "next/link";
import { Clock, Star, Users } from "lucide-react";
import type { Course } from "@/lib/data";
import { lessonCount, personById } from "@/lib/data";
import { Badge, type Tone } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

/** The ACCA paper code a course id carries: c-fr → FR, c-epsm → EPSM. */
export function paperCode(course: Pick<Course, "id">) {
  return course.id.replace(/^c-/, "").toUpperCase();
}

const TONES: Tone[] = ["neutral", "brand", "jade", "ember", "amber", "rose", "violet"];
const toneOf = (accent: string): Tone =>
  TONES.includes(accent as Tone) ? (accent as Tone) : "neutral";

/** The cover: no stock photography. A black band carrying the paper code,
 *  with a generated line field so a grid of papers never looks identical. */
export function CourseCover({
  course,
  className,
}: {
  course: Course;
  className?: string;
}) {
  const seed = course.id.charCodeAt(2) + course.title.length;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-t-[calc(var(--radius-lg)-1px)] bg-surface-inv",
        className,
      )}
    >
      <svg
        viewBox="0 0 320 120"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full text-cta"
        aria-hidden
      >
        <g stroke="currentColor" fill="none">
          {Array.from({ length: 7 }, (_, i) => {
            const y = 18 + i * 15;
            const amp = 6 + ((seed + i * 7) % 11);
            const phase = ((seed * (i + 3)) % 20) / 3;
            return (
              <path
                key={i}
                d={`M-10 ${y} C 60 ${y - amp + phase}, 120 ${y + amp}, 180 ${y - amp / 2} S 280 ${y + amp / 1.5}, 330 ${y}`}
                strokeWidth={i % 3 === 0 ? 1.3 : 0.7}
                opacity={0.1 + (i % 4) * 0.07}
              />
            );
          })}
        </g>
      </svg>
      <span className="absolute bottom-3 left-4 flex items-end gap-2.5">
        <span className="font-display text-[1.9rem] leading-none font-extrabold tracking-[-0.03em] text-ink-inv">
          {paperCode(course)}
        </span>
        <span className="mb-1 h-1.5 w-7 rounded-full bg-cta" />
      </span>
    </div>
  );
}

export function CourseCard({
  course,
  showProgress,
}: {
  course: Course;
  showProgress?: boolean;
}) {
  const instructor = personById(course.instructorId);
  const enrolled = course.progress != null;
  return (
    <Link
      href={enrolled && showProgress ? `/learn/${course.slug}` : `/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface transition-[border-color,transform] duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-line-strong"
    >
      <CourseCover course={course} className="h-[104px]" />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={toneOf(course.accent)}>{course.category}</Badge>
          {course.status !== "published" ? (
            <Badge tone="amber">{course.status === "in_review" ? "In review" : "Draft"}</Badge>
          ) : null}
        </div>

        <h3 className="text-[15px] leading-snug font-bold tracking-[-0.012em] text-ink decoration-cta decoration-2 underline-offset-4 group-hover:underline">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-3">
          {course.subtitle}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12px] text-ink-3">
          <span className="inline-flex items-center gap-1.5 tnum">
            <Clock className="size-3.5" /> {course.hours}h
          </span>
          <span className="tnum">{lessonCount(course)} lessons</span>
          <span className="inline-flex items-center gap-1 tnum">
            <Star className="size-3.5 fill-amber text-amber" /> {course.rating}
          </span>
          <span className="inline-flex items-center gap-1.5 tnum">
            <Users className="size-3.5" /> {course.enrolled.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="mt-auto pt-4">
          {showProgress && enrolled ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11.5px] font-semibold text-ink-2 tnum">
                  {course.progress}% complete
                </span>
                <span className="text-[11.5px] text-ink-3">{course.level}</span>
              </div>
              <Progress
                value={course.progress ?? 0}
                tone={course.progress === 100 ? "jade" : "brand"}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 border-t border-line pt-3">
              {instructor ? (
                <>
                  <Avatar name={instructor.name} size="xs" />
                  <span className="truncate text-[12px] text-ink-3">
                    {instructor.name}
                  </span>
                </>
              ) : null}
              <span className="ml-auto shrink-0 text-[11.5px] text-ink-3">
                {course.level}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
