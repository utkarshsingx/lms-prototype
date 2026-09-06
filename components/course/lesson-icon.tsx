import {
  BookOpen,
  Check,
  CircleDot,
  FileText,
  FlaskConical,
  ListChecks,
  Lock,
  Package,
  Play,
  Presentation,
  Radio,
  Upload,
} from "lucide-react";
import type { LessonState, LessonType } from "@/lib/data";
import { cn } from "@/lib/cn";

const icons: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  video: Play,
  article: BookOpen,
  pdf: FileText,
  slides: Presentation,
  scorm: Package,
  xapi: Package,
  quiz: ListChecks,
  assignment: Upload,
  live: Radio,
  lab: FlaskConical,
};

export function LessonTypeIcon({
  type,
  className,
}: {
  type: LessonType;
  className?: string;
}) {
  const Icon = icons[type];
  return <Icon className={cn("size-3.5", className)} />;
}

/** The bullet in a curriculum list: state first, type second. */
export function LessonBullet({
  type,
  state,
}: {
  type: LessonType;
  state: LessonState;
}) {
  if (state === "completed")
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-jade text-on-accent">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (state === "in_progress")
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-brand text-brand">
        <CircleDot className="size-3" strokeWidth={2.5} />
      </span>
    );
  if (state === "locked")
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-ink-3">
        <Lock className="size-3" />
      </span>
    );
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-3">
      <LessonTypeIcon type={type} className="size-3" />
    </span>
  );
}
