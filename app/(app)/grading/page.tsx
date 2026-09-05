import { Clock, GraduationCap, ListChecks, Timer } from "lucide-react";
import { submissions } from "@/lib/data";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { GradingQueue } from "@/components/grading/queue";

export const metadata = { title: "Grading queue" };

export default function GradingPage() {
  const pending = submissions.filter((s) => s.status === "awaiting_review");
  return (
    <div className="mx-auto max-w-[92rem] space-y-7">
      <PageHeader
        eyebrow="Grading"
        title="What is waiting on a person"
        sub="Auto-graded work never reaches this queue. What lands here is essays, projects and any short answer the matcher was not confident about."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Awaiting review"
          value={pending.length}
          tone="amber"
          icon={<ListChecks />}
        />
        <StatTile
          label="Median turnaround"
          value="19h"
          tone="jade"
          delta={{ value: "6h faster" }}
          spark={[38, 34, 31, 29, 26, 24, 22, 20, 19]}
          icon={<Timer />}
        />
        <StatTile
          label="Oldest in queue"
          value="3d"
          tone="ember"
          icon={<Clock />}
        />
        <StatTile
          label="Graded this month"
          value={214}
          icon={<GraduationCap />}
          spark={[110, 128, 141, 156, 168, 180, 192, 203, 214]}
        />
      </div>

      <GradingQueue />
    </div>
  );
}
