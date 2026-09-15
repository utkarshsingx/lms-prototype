"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  SLA_HOURS,
  faculty as facultyStaff,
  formatAccaDate,
  paperByCode,
  staffById,
  staffByKind,
  studentById,
  type ActionPlan,
  type Escalation,
  type MentoringSession,
  type MentorNote,
  type MentorReminder,
  type MessageTemplate,
  type PaperCode,
  type TicketPriority,
} from "@/lib/data/acca";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormDrawer } from "@/components/ui/form-drawer";
import { toast } from "@/components/ui/toast";
import type { MentorScope } from "./scope";
import { CHANNEL_LABELS, TEMPLATE_OPTIONS, TODAY, fillTemplate, firstNameOf, plural } from "./shared";

let seq = 0;
/** Ids for records created in this browser session (event handlers only). */
export function newId(prefix: string) {
  seq += 1;
  return `${prefix}-new-${seq}`;
}

function StudentSelect({
  scope,
  value,
  onChange,
  name = "student",
}: {
  scope: MentorScope;
  value: string;
  onChange: (id: string) => void;
  name?: string;
}) {
  return (
    <Field label="Student">
      <Select name={name} value={value} onChange={(e) => onChange(e.target.value)} required>
        {scope.students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {s.currentPaper ?? "Onboarding"} · {s.type === "graduate" ? "Graduate" : "Undergraduate"}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/* ================================================================== schedule a mentoring session */

export function ScheduleSessionDrawer({
  open,
  onClose,
  scope,
  studentId,
  session,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  scope: MentorScope;
  studentId?: string;
  /** Pass to reschedule an existing session. */
  session?: MentoringSession | null;
  onSave: (session: MentoringSession) => void;
}) {
  const editing = Boolean(session);
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={editing ? "Reschedule mentoring session" : "Schedule mentoring session"}
      sub={editing ? "The learner is notified of the new time." : "Books a slot in your calendar and sends the learner an invite."}
      submitLabel={editing ? "Save new time" : "Schedule session"}
      footerNote="Times are IST."
      onSubmit={(data) => {
        const sid = String(data.get("student"));
        const date = String(data.get("date"));
        const time = String(data.get("time"));
        const next: MentoringSession = {
          id: session?.id ?? newId("ms"),
          studentId: sid,
          mentorId: session?.mentorId ?? studentById(sid)?.mentorId ?? scope.staffId,
          start: `${date}T${time}`,
          durationMins: Number(data.get("duration")),
          mode: String(data.get("mode")) as MentoringSession["mode"],
          agenda: String(data.get("agenda") ?? "").trim() || "Mentoring check-in",
          status: "scheduled",
        };
        onSave(next);
        toast({
          title: editing ? "Mentoring session rescheduled" : "Mentoring session scheduled",
          body: `${studentById(sid)?.name} · ${formatAccaDate(date)}, ${time} IST · ${next.mode}`,
        });
        onClose();
      }}
    >
      <SessionFields scope={scope} studentId={session?.studentId ?? studentId} session={session} />
    </FormDrawer>
  );
}

function SessionFields({ scope, studentId, session }: { scope: MentorScope; studentId?: string; session?: MentoringSession | null }) {
  const [sid, setSid] = useState(studentId ?? scope.students[0]?.id ?? "");
  const s = studentById(sid);
  return (
    <>
      {session ? (
        <input type="hidden" name="student" value={sid} />
      ) : (
        <StudentSelect scope={scope} value={sid} onChange={setSid} />
      )}
      {session && s ? (
        <p className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">{s.name}</span> · currently {formatAccaDate(session.start.slice(0, 10))}, {session.start.slice(11)} IST
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input type="date" name="date" required min={TODAY} defaultValue={session?.start.slice(0, 10) ?? "2026-09-17"} />
        </Field>
        <Field label="Time">
          <Input type="time" name="time" required defaultValue={session?.start.slice(11, 16) ?? "18:30"} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Duration">
          <Select name="duration" defaultValue={String(session?.durationMins ?? 30)}>
            {[20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mode">
          <Select name="mode" defaultValue={session?.mode ?? (s?.type === "undergraduate" ? "In person" : "Video")}>
            <option>Video</option>
            <option>Phone</option>
            <option>In person</option>
          </Select>
        </Field>
      </div>
      <Field label="Agenda" hint={s?.risk.reasons.length ? "Prefilled from risk signals" : undefined}>
        <Textarea
          key={sid}
          name="agenda"
          rows={3}
          defaultValue={session?.agenda ?? (s?.risk.reasons[0] ? `Discuss: ${s.risk.reasons[0].toLowerCase()}` : "Monthly check-in")}
        />
      </Field>
    </>
  );
}

/* ================================================================== authorised reminders */

export function ReminderDrawer({
  open,
  onClose,
  scope,
  studentIds,
  defaultTemplateId = "tpl-mentor-checkin",
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  scope: MentorScope;
  /** Preselected recipients; empty lets the mentor pick one. */
  studentIds: string[];
  defaultTemplateId?: string;
  onSent: (rows: MentorReminder[], template: MessageTemplate) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Send authorised reminder"
      sub="Mentors send approved templates only. Free-text messages go through the programme team."
      submitLabel="Send reminder"
      onSubmit={(data) => {
        const ids = studentIds.length ? studentIds : [String(data.get("student"))];
        const tplId = String(data.get("template"));
        const opt = TEMPLATE_OPTIONS.find((o) => o.template.id === tplId);
        if (!opt?.allowed) {
          toast({ title: "Choose an authorised template", body: "This template is not authorised for the mentor workspace.", tone: "warning" });
          return;
        }
        const channel = String(data.get("channel")) as MentorReminder["channel"];
        const rows: MentorReminder[] = ids.map((id) => {
          const s = studentById(id)!;
          return {
            id: newId("mr"),
            studentId: id,
            mentorId: s.mentorId,
            channel,
            message: fillTemplate(opt.template.body, s, scope.mentorName),
            sentOn: TODAY,
            status: "delivered",
          };
        });
        onSent(rows, opt.template);
        toast({
          title: ids.length === 1 ? `Reminder sent to ${studentById(ids[0])?.name}` : `Reminder sent to ${plural(ids.length, "student")}`,
          body: `${CHANNEL_LABELS[channel]} · ${opt.template.name}`,
        });
        onClose();
      }}
    >
      <ReminderFields scope={scope} studentIds={studentIds} defaultTemplateId={defaultTemplateId} />
    </FormDrawer>
  );
}

function ReminderFields({ scope, studentIds, defaultTemplateId }: { scope: MentorScope; studentIds: string[]; defaultTemplateId: string }) {
  const [sid, setSid] = useState(studentIds[0] ?? scope.students[0]?.id ?? "");
  const [tplId, setTplId] = useState(defaultTemplateId);
  const opt = TEMPLATE_OPTIONS.find((o) => o.template.id === tplId) ?? TEMPLATE_OPTIONS[0];
  const [channel, setChannel] = useState<string>(opt.template.channel);
  const preview = studentById(studentIds[0] ?? sid);
  return (
    <>
      {studentIds.length > 1 ? (
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Recipients · {studentIds.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {studentIds.map((id) => (
              <span key={id} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-ink">
                {studentById(id)?.name}
              </span>
            ))}
          </div>
        </div>
      ) : studentIds.length === 1 ? (
        <p className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2">
          To <span className="font-semibold text-ink">{preview?.name}</span> · {preview?.phone}
        </p>
      ) : (
        <StudentSelect scope={scope} value={sid} onChange={setSid} />
      )}
      <Field label="Authorised template">
        <Select
          name="template"
          value={tplId}
          onChange={(e) => {
            const next = TEMPLATE_OPTIONS.find((o) => o.template.id === e.target.value);
            setTplId(e.target.value);
            if (next) setChannel(next.template.channel);
          }}
        >
          {TEMPLATE_OPTIONS.map((o) => (
            <option key={o.template.id} value={o.template.id} disabled={!o.allowed}>
              {o.template.name}
              {o.allowed ? "" : ` (${o.reason})`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Channel">
        <Select name="channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
          {Array.from(new Set([opt.template.channel, "in-app", "email"])).map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      {preview ? (
        <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
          <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
            Preview for {firstNameOf(preview.name)} · {CHANNEL_LABELS[channel]}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink">{fillTemplate(opt.template.body, preview, scope.mentorName)}</p>
        </div>
      ) : null}
      <p className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-3">
        <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-jade" />
        Approved by the programme team. Instalment reminders are sent by Finance Operations and cannot be sent from here.
      </p>
    </>
  );
}

/* ================================================================== escalations */

export type EscalationKind = Escalation["kind"];
export type EscalationRow = Escalation & { category?: string; updates?: { at: string; body: string }[] };

export const ACADEMIC_CATEGORIES = [
  "Concept clarification",
  "Exam readiness decision",
  "Remedial learning request",
  "Mock or assessment query",
  "Reattempt request",
];

/** Operational category and the programme admin who owns it. */
export const OPERATIONAL_ROUTES: { category: string; ownerId: string }[] = [
  { category: "ACCA registration or subscription", ownerId: "st-imran" },
  { category: "Exemption query", ownerId: "st-priya" },
  { category: "Exam booking", ownerId: "st-imran" },
  { category: "Fees and payments", ownerId: "st-deepa" },
  { category: "Batch or timetable change", ownerId: "st-priya" },
  { category: "University record", ownerId: "st-priya" },
];

const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

export function EscalationDrawer({
  open,
  onClose,
  scope,
  kind,
  studentId,
  paper,
  onRaise,
}: {
  open: boolean;
  onClose: () => void;
  scope: MentorScope;
  kind: EscalationKind;
  studentId?: string;
  paper?: PaperCode;
  onRaise: (row: EscalationRow) => void;
}) {
  const academic = kind === "academic";
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={academic ? "Escalate academic issue" : "Escalate operational issue"}
      sub={academic ? "Goes to faculty for the paper. They reply in Student questions." : "Goes to the Programme Admin team as a support ticket."}
      submitLabel={academic ? "Escalate to faculty" : "Escalate to programme team"}
      onSubmit={(data) => {
        const sid = String(data.get("student"));
        const toId = String(data.get("to"));
        const priority = String(data.get("priority")) as TicketPriority;
        const category = String(data.get("category"));
        const row: EscalationRow = {
          id: newId("mesc"),
          studentId: sid,
          kind,
          subject: String(data.get("subject")).trim(),
          detail: String(data.get("detail")).trim(),
          raisedBy: scope.staffId,
          raisedOn: TODAY,
          toId,
          priority,
          status: "open",
          ticketId: academic ? undefined : `TK-${2100 + seq}`,
          category,
          updates: [],
        };
        onRaise(row);
        toast({
          title: `Escalated to ${staffById(toId)?.name}`,
          body: `${category} · ${priority} urgency · response within ${SLA_HOURS[priority]} hours`,
        });
        onClose();
      }}
    >
      <EscalationFields scope={scope} kind={kind} studentId={studentId} paper={paper} />
    </FormDrawer>
  );
}

function EscalationFields({ scope, kind, studentId, paper }: { scope: MentorScope; kind: EscalationKind; studentId?: string; paper?: PaperCode }) {
  const academic = kind === "academic";
  const [sid, setSid] = useState(studentId ?? scope.students[0]?.id ?? "");
  const s = studentById(sid);
  const focus = paper ?? s?.currentPaper ?? undefined;
  const leadFor = (code?: PaperCode | null) => (code ? paperByCode(code)?.leadFacultyId : undefined) ?? facultyStaff[0].id;
  const [category, setCategory] = useState(academic ? ACADEMIC_CATEGORIES[0] : OPERATIONAL_ROUTES[0].category);
  const [toId, setToId] = useState(academic ? leadFor(focus) : OPERATIONAL_ROUTES[0].ownerId);
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const recipients = academic ? facultyStaff : staffByKind("programme-admin");

  return (
    <>
      <StudentSelect
        scope={scope}
        value={sid}
        onChange={(id) => {
          setSid(id);
          if (academic) setToId(leadFor(studentById(id)?.currentPaper));
        }}
      />
      <Field label="Category">
        <Select
          name="category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            const route = OPERATIONAL_ROUTES.find((r) => r.category === e.target.value);
            if (route) setToId(route.ownerId);
          }}
        >
          {(academic ? ACADEMIC_CATEGORIES : OPERATIONAL_ROUTES.map((r) => r.category)).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={academic ? "Escalate to faculty" : "Escalate to"} hint={academic && focus ? `${focus} lead suggested` : "Routed by category"}>
          <Select name="to" value={toId} onChange={(e) => setToId(e.target.value)}>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Urgency" hint={`Reply within ${SLA_HOURS[priority]}h`}>
          <Select name="priority" value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Subject">
        <Input
          key={`${sid}-${category}`}
          name="subject"
          required
          defaultValue={
            academic
              ? `${focus ?? "Paper"}: ${category.toLowerCase()} for ${s ? firstNameOf(s.name) : "learner"}`
              : `${category} for ${s ? firstNameOf(s.name) : "learner"}`
          }
        />
      </Field>
      <Field label="What is happening">
        <Textarea
          key={sid}
          name="detail"
          rows={4}
          required
          defaultValue={s?.risk.reasons.length ? `${s.risk.reasons.join(". ")}.` : ""}
          placeholder="Context the recipient needs to act without calling you."
        />
      </Field>
    </>
  );
}

/* ================================================================== action plans */

export function ActionPlanDrawer({
  open,
  onClose,
  scope,
  studentId,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  scope: MentorScope;
  studentId?: string;
  onCreate: (plan: ActionPlan) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Create student action plan"
      sub="Goals and tasks the learner sees on My mentor. Tasks can belong to the learner or to you."
      submitLabel="Create action plan"
      footerNote="Shared with the learner"
      onSubmit={(data) => {
        const sid = String(data.get("student"));
        const s = studentById(sid)!;
        const tasks = [0, 1, 2]
          .map((i) => ({
            id: `t${i + 1}`,
            label: String(data.get(`task-${i}`) ?? "").trim(),
            due: String(data.get(`due-${i}`) ?? TODAY),
            owner: String(data.get(`owner-${i}`)) as "student" | "mentor",
            done: false,
          }))
          .filter((t) => t.label);
        const plan: ActionPlan = {
          id: newId("pl"),
          studentId: sid,
          mentorId: s.mentorId,
          title: String(data.get("title")).trim(),
          goal: String(data.get("goal") ?? "").trim(),
          createdOn: TODAY,
          dueOn: String(data.get("due")),
          status: "active",
          tasks,
          alertIds: [],
        };
        onCreate(plan);
        toast({ title: "Action plan created", body: `${s.name} · ${plural(tasks.length, "task")} · due ${formatAccaDate(plan.dueOn)}` });
        onClose();
      }}
    >
      <PlanFields scope={scope} studentId={studentId} />
    </FormDrawer>
  );
}

function PlanFields({ scope, studentId }: { scope: MentorScope; studentId?: string }) {
  const [sid, setSid] = useState(studentId ?? scope.students[0]?.id ?? "");
  const s = studentById(sid);
  const paper = s?.currentPaper ?? "BT";
  const suggestions = [
    { label: `Complete the ${paper} weak-topic practice set`, owner: "student", due: "2026-09-21" },
    { label: "Watch the two most recent class recordings", owner: "student", due: "2026-09-24" },
    { label: "Review progress in a mentoring session", owner: "mentor", due: "2026-09-28" },
  ];
  return (
    <>
      <StudentSelect scope={scope} value={sid} onChange={setSid} />
      <Field label="Plan title">
        <Input key={`t-${sid}`} name="title" required defaultValue={`${paper} readiness to 65 before the mock`} />
      </Field>
      <Field label="Goal">
        <Textarea
          key={`g-${sid}`}
          name="goal"
          rows={2}
          defaultValue={s ? `Raise ${paper} readiness from ${s.readiness.byPaper[paper as PaperCode] ?? s.readiness.overall} to 65 and attend every class for four weeks.` : ""}
        />
      </Field>
      <Field label="Plan due">
        <Input type="date" name="due" min={TODAY} defaultValue="2026-10-12" required />
      </Field>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[12.5px] font-semibold text-ink-2">Tasks</legend>
        {suggestions.map((t, i) => (
          <div key={`${sid}-${i}`} className="grid gap-2 rounded-[var(--radius-md)] border border-line p-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_9.5rem]">
            <Input name={`task-${i}`} defaultValue={t.label} aria-label={`Task ${i + 1}`} />
            <Select name={`owner-${i}`} defaultValue={t.owner} aria-label={`Task ${i + 1} owner`}>
              <option value="student">Learner</option>
              <option value="mentor">Mentor</option>
            </Select>
            <Input type="date" name={`due-${i}`} defaultValue={t.due} min={TODAY} aria-label={`Task ${i + 1} due`} />
          </div>
        ))}
      </fieldset>
    </>
  );
}

/* ================================================================== mentor notes */

export type NoteVisibility = "private" | "shared";
export type NoteRow = MentorNote & { visibility: NoteVisibility };

/** Seeded notes: anything about wellbeing or high risk stays private; progress notes are shared. */
export function seedVisibility(note: MentorNote): NoteVisibility {
  return note.tags.some((t) => t === "High risk" || t === "Work-life") ? "private" : "shared";
}

export const VISIBILITY_LABEL: Record<NoteVisibility, string> = {
  private: "Private",
  shared: "Shared with learner",
};

export function NoteDrawer({
  open,
  onClose,
  scope,
  studentId,
  defaultBody,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  scope: MentorScope;
  studentId?: string;
  defaultBody?: string;
  onSave: (note: NoteRow) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Record mentor note"
      sub="Notes build the learner's mentoring history. Choose who can read each one."
      submitLabel="Save note"
      onSubmit={(data) => {
        const sid = String(data.get("student"));
        const s = studentById(sid)!;
        const picked = data.getAll("tag").map(String);
        const extra = String(data.get("tags-extra") ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const visibility = String(data.get("visibility")) as NoteVisibility;
        const note: NoteRow = {
          id: newId("mn"),
          studentId: sid,
          mentorId: s.mentorId,
          date: TODAY,
          body: String(data.get("body")).trim(),
          tags: Array.from(new Set([...picked, ...extra])),
          visibility,
        };
        onSave(note);
        toast({
          title: "Mentor note recorded",
          body: `${s.name} · ${visibility === "shared" ? "shared with the learner" : "private to mentors and the programme team"}`,
        });
        onClose();
      }}
    >
      <NoteFields scope={scope} studentId={studentId} defaultBody={defaultBody} />
    </FormDrawer>
  );
}

function NoteFields({ scope, studentId, defaultBody }: { scope: MentorScope; studentId?: string; defaultBody?: string }) {
  const [sid, setSid] = useState(studentId ?? scope.students[0]?.id ?? "");
  const s = studentById(sid);
  const tags = Array.from(new Set([s?.currentPaper ?? "Onboarding", "Attendance", "Recovery", "Exam booking", "Wellbeing", "Careers"]));
  return (
    <>
      <StudentSelect scope={scope} value={sid} onChange={setSid} />
      <Field label="Note">
        <Textarea
          name="body"
          rows={5}
          required
          defaultValue={defaultBody}
          placeholder="What you discussed, what the learner agreed to, and what happens next."
        />
      </Field>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Tags</legend>
        <div className="flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <label key={`${sid}-${t}`} className="cursor-pointer">
              <input type="checkbox" name="tag" value={t} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-semibold text-ink-2 transition-colors peer-checked:border-nav-active peer-checked:bg-nav-active peer-checked:text-nav-active-ink peer-focus-visible:shadow-[0_0_0_3px_var(--ring-cta)]">
                {t}
              </span>
            </label>
          ))}
        </div>
        <Input name="tags-extra" placeholder="Other tags, separated by commas" className="mt-2.5" aria-label="Other tags" />
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Who can read it</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["private", "Private", "You, other mentors and the programme team"],
              ["shared", "Shared with learner", `Appears on ${s ? firstNameOf(s.name) : "the learner"}'s My mentor page`],
            ] as const
          ).map(([value, label, sub]) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="visibility" value={value} defaultChecked={value === "private"} className="peer sr-only" />
              <span className="block h-full rounded-[var(--radius-md)] border border-line bg-surface p-3 transition-colors peer-checked:border-nav-active peer-checked:bg-cta-soft peer-focus-visible:shadow-[0_0_0_3px_var(--ring-cta)]">
                <span className="block text-[13px] font-bold text-ink">{label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{sub}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
