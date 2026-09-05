import Link from "next/link";
import { Clock, Star, Users } from "lucide-react";
import type { Course } from "@/lib/data";
import { lessonCount, personById } from "@/lib/data";
import { Badge, type Tone } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

/** The cover: no stock photography. A generated field keyed to the course
 *  accent, so twelve cards in a grid never look like twelve identical boxes. */
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
        "relative overflow-hidden rounded-t-[calc(var(--radius-lg)-1px)]",
        className,
      )}
      style={{ backgroundColor: `var(--${course.accent}-soft)` }}
    >
      <svg
        viewBox="0 0 320 120"
        preserveAspectRatio="none"
        className="size-full"
        aria-hidden
      >
        <g stroke={`var(--${course.accent})`} fill="none" opacity="0.45">
          {Array.from({ length: 9 }, (_, i) => {
            const y = 12 + i * 13;
            const amp = 6 + ((seed + i * 7) % 11);
            const phase = ((seed * (i + 3)) % 20) / 3;
            return (
              <path
                key={i}
                d={`M-10 ${y} C 60 ${y - amp + phase}, 120 ${y + amp}, 180 ${y - amp / 2} S 280 ${y + amp / 1.5}, 330 ${y}`}
                strokeWidth={i % 3 === 0 ? 1.4 : 0.7}
                opacity={0.3 + (i % 4) * 0.18}
              />
            );
          })}
        </g>
      </svg>
      <span
        className="absolute inset-x-0 bottom-0 h-14"
        style={{
          background: `linear-gradient(to top, var(--${course.accent}-soft), transparent)`,
        }}
      />
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
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e1)] transition-[box-shadow,border-color,transform] duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-e3)]"
    >
      <CourseCover course={course} className="h-[104px]" />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <Badge tone={course.accent as Tone}>{course.category}</Badge>
          {course.compliance?.mandatory ? (
            <Badge tone="rose" dot>
              Required
            </Badge>
          ) : null}
        </div>

        <h3 className="text-[15px] leading-snug font-semibold tracking-[-0.012em] text-ink transition-colors group-hover:text-brand">
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
            <Users className="size-3.5" /> {course.enrolled.toLocaleString()}
          </span>
        </div>

        <div className="mt-auto pt-4">
          {showProgress && enrolled ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11.5px] font-medium text-ink-2 tnum">
                  {course.progress}% complete
                </span>
                <span className="text-[11.5px] text-ink-3">{course.level}</span>
              </div>
              <Progress
                value={course.progress!}
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
