"use client";

import { useState } from "react";
import {
  CONTENT_TYPE_LABELS,
  cohortWeakTopics,
  contentForPaper,
  formatAccaDate,
  studentsInCohort,
  type Cohort,
  type PaperCode,
} from "@/lib/data/acca";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { MiniLabel, plural } from "./shared";

export type Recommendation = {
  id: string;
  sentOn: string;
  paper: PaperCode;
  cohortId: string;
  audience: string;
  recipients: number;
  topic: string;
  contentTitles: string[];
  due: string;
  completed: number;
};

export type RemedialPreset = {
  cohortId?: string;
  studentIds?: string[];
  topic?: string;
  contentId?: string;
};

const AUDIENCES = [
  { id: "selected", label: "Selected students" },
  { id: "below50", label: "Students below 50 on this topic" },
  { id: "cohort", label: "Whole cohort" },
] as const;

/** "Recommend remedial learning": who, which weak topic, which content items, by when. */
export function RemedialDrawer({
  open,
  onClose,
  paper,
  cohorts,
  preset,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  paper: PaperCode;
  cohorts: Cohort[];
  preset: RemedialPreset;
  onSend: (rec: Recommendation) => void;
}) {
  const [audience, setAudience] = useState<string>(preset.studentIds?.length ? "selected" : "below50");
  const [cohortId, setCohortId] = useState(preset.cohortId ?? cohorts[0]?.id ?? "");
  const topics = cohortWeakTopics.filter((w) => w.paper === paper && w.cohortId === cohortId).flatMap((w) => w.topics);
  const [topic, setTopic] = useState(preset.topic ?? topics[0]?.topic ?? "");
  const roster = studentsInCohort(cohortId);
  const content = contentForPaper(paper).filter((c) => c.status === "published" || c.status === "in-review");
  const cohort = cohorts.find((c) => c.id === cohortId);
  const suggested = preset.contentId ?? topics.find((t) => t.topic === topic)?.contentId;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Recommend remedial learning"
      sub={`${paper} · learners get the items on their dashboard with a due date`}
      submitLabel="Send recommendation"
      footerNote="Mentors of these learners are copied."
      onSubmit={(data) => {
        const picked = data.getAll("content").map(String);
        const titles = content.filter((c) => picked.includes(c.id)).map((c) => c.title);
        if (titles.length === 0) {
          toast({ title: "Choose at least one content item", tone: "warning" });
          return;
        }
        const chosen = data.getAll("students").map(String);
        if (audience === "selected" && chosen.length === 0) {
          toast({ title: "Choose at least one student", tone: "warning" });
          return;
        }
        const weak = topics.find((t) => t.topic === topic);
        const recipients =
          audience === "selected" ? chosen.length : audience === "below50" ? (weak?.studentsBelow50 ?? cohort?.size ?? 0) : (cohort?.size ?? 0);
        const due = String(data.get("due") || "2026-09-21");
        onSend({
          id: `rec-new-${cohortId}-${topic}-${recipients}-${due}`,
          sentOn: "2026-09-14",
          paper,
          cohortId,
          audience: AUDIENCES.find((a) => a.id === audience)?.label ?? audience,
          recipients,
          topic: topic || "General revision",
          contentTitles: titles,
          due,
          completed: 0,
        });
        toast({
          title: "Remedial learning recommended",
          body: `${plural(recipients, "learner")} · ${titles[0]}${titles.length > 1 ? ` and ${titles.length - 1} more` : ""} · due ${formatAccaDate(due)}`,
        });
        onClose();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cohort">
          <Select
            name="cohort"
            value={cohortId}
            onChange={(e) => {
              setCohortId(e.target.value);
              const next = cohortWeakTopics.filter((w) => w.paper === paper && w.cohortId === e.target.value).flatMap((w) => w.topics);
              setTopic(next[0]?.topic ?? "");
            }}
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Recommend to">
          <Select name="audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
            {AUDIENCES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {audience === "selected" ? (
        <fieldset className="rounded-[var(--radius-md)] border border-line p-3.5">
          <legend className="px-1 text-[12.5px] font-semibold text-ink-2">Students ({roster.length} learner records)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {roster.map((s) => (
              <Checkbox
                key={`${cohortId}-${s.id}`}
                name="students"
                value={s.id}
                defaultChecked={preset.studentIds ? preset.studentIds.includes(s.id) : false}
                label={`${s.name} · readiness ${s.readiness.byPaper[paper] ?? "not rated"}`}
              />
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="rounded-[var(--radius-md)] bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
          {audience === "cohort"
            ? `Goes to all ${cohort?.size ?? 0} learners in ${cohort?.name}.`
            : `Goes to the ${topics.find((t) => t.topic === topic)?.studentsBelow50 ?? "listed"} learners scoring below 50 on this topic in their latest mock or test.`}
        </p>
      )}

      <Field label="Weak topic">
        <Select name="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {topics.map((t) => (
            <option key={t.topic} value={t.topic}>
              {t.area} · {t.topic} (average {t.avgScore})
            </option>
          ))}
          <option value="">General revision</option>
        </Select>
      </Field>

      <fieldset>
        <MiniLabel className="mb-2">Content items</MiniLabel>
        <div className="space-y-2 rounded-[var(--radius-md)] border border-line p-3.5">
          {content.map((c) => (
            <Checkbox
              key={`${topic}-${c.id}`}
              name="content"
              value={c.id}
              defaultChecked={c.id === suggested}
              label={
                <>
                  <span className="font-semibold text-ink">{c.title}</span>
                  <span className="text-ink-3">
                    {" "}
                    · {CONTENT_TYPE_LABELS[c.type]} · {c.size}
                    {c.status === "in-review" ? " · in review" : ""}
                  </span>
                </>
              }
            />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due date">
          <Input name="due" type="date" defaultValue="2026-09-21" min="2026-09-14" />
        </Field>
        <Field label="Follow-up">
          <Select name="followup" defaultValue="retake">
            <option value="retake">Retake the topic test after</option>
            <option value="session">Discuss in the doubt-clearing session</option>
            <option value="none">No follow-up</option>
          </Select>
        </Field>
      </div>

      <Field label="Note to learners" hint="Optional">
        <Textarea
          name="note"
          rows={3}
          defaultValue={topic ? `Your recent scores on ${topic.toLowerCase()} are below the pass mark. Work through these before the next class.` : ""}
          key={`note-${topic}`}
        />
      </Field>
    </FormDrawer>
  );
}
