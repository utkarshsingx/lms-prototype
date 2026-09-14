import {
  BookOpen,
  Check,
  CircleDot,
  FileSpreadsheet,
  FileText,
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
  // A lab is a CBE spreadsheet workspace in the ACCA papers.
  lab: FileSpreadsheet,
};

export function LessonTypeIcon({
  type,
  className,
}: {
  type: LessonType;
  className?: string;
}) {
  const Icon = icons[type] ?? BookOpen;
  return <Icon className={cn("size-3.5", className)} />;
}

/** The bullet in a lesson list: state first, type second. */
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
        <span className="sr-only">Complete</span>
      </span>
    );
  if (state === "in_progress")
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-cta bg-cta-soft text-ink">
        <CircleDot className="size-3" strokeWidth={2.5} />
        <span className="sr-only">In progress</span>
      </span>
    );
  if (state === "locked")
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-ink-3">
        <Lock className="size-3" />
        <span className="sr-only">Locked</span>
      </span>
    );
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-3">
      <LessonTypeIcon type={type} className="size-3" />
    </span>
  );
}
