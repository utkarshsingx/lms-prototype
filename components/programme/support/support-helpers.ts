import {
  daysBetween,
  escalationMatrix,
  faculty,
  faqs,
  staffById,
  staffName,
  studentById,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/data/acca";
import type { StatusTone } from "@/components/ui/status";

/** Fixed demo clock for SLA ages: Monday 14 Sep 2026, 15:00 IST. */
export const SUPPORT_NOW = "2026-09-14T15:00";

/** A new event stamp, n minutes after SUPPORT_NOW, so live actions stay ordered. */
export function stampAfter(n: number) {
  const h = 15 + Math.floor(n / 60);
  const m = n % 60;
  return `2026-09-14T${String(Math.min(h, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hoursBetween(from: string, to: string) {
  const mins = (s: string) => (s.length > 10 ? Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16)) : 0);
  return (daysBetween(from, to) * 1440 + mins(to) - mins(from)) / 60;
}

export function formatHours(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${Math.round(h)}h`;
  const d = Math.floor(h / 24);
  const r = Math.round(h - d * 24);
  return r ? `${d}d ${r}h` : `${d}d`;
}

export function formatMins(m: number) {
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function median(xs: number[]) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type SlaState = { label: string; tone: StatusTone; breached: boolean; hoursLeft: number };

export function slaState(t: Ticket): SlaState {
  if (t.status === "resolved") {
    const met = (t.resolutionHours ?? 0) <= t.slaHours;
    return { label: met ? "SLA met" : "SLA missed", tone: met ? "jade" : "rose", breached: false, hoursLeft: 10_000 };
  }
  const left = t.slaHours - hoursBetween(t.created, SUPPORT_NOW);
  if (t.status === "waiting-on-student") {
    return { label: "Paused · waiting", tone: "neutral", breached: false, hoursLeft: 5_000 + left };
  }
  if (left < 0) return { label: `Breached · ${formatHours(-left)} over`, tone: "rose", breached: true, hoursLeft: left };
  if (left <= t.slaHours * 0.25) return { label: `${formatHours(left)} left`, tone: "amber", breached: false, hoursLeft: left };
  return { label: `${formatHours(left)} left`, tone: "info", breached: false, hoursLeft: left };
}

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_TONES: Record<TicketPriority, StatusTone> = {
  urgent: "rose",
  high: "amber",
  medium: "info",
  low: "neutral",
};

export const PRIORITY_ORDER: Record<TicketPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  "waiting-on-student": "Waiting on learner",
  escalated: "Escalated",
  resolved: "Resolved",
};

export const CHANNEL_LABELS: Record<Ticket["channel"], string> = {
  portal: "Portal",
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
};

export type QueueId = "all" | "registration-exemption" | "operational" | "academic";

export const QUEUES: { id: QueueId; label: string; categories: TicketCategory[] | null }[] = [
  { id: "all", label: "All tickets", categories: null },
  { id: "registration-exemption", label: "Registration and exemption queries", categories: ["Registration", "Exemption"] },
  { id: "operational", label: "Operational queries", categories: ["Exam booking", "Payments", "Technical", "Career"] },
  { id: "academic", label: "Academic questions", categories: ["Academic"] },
];

export function inQueue(t: Ticket, queue: QueueId) {
  const q = QUEUES.find((x) => x.id === queue);
  return !q?.categories || q.categories.includes(t.category);
}

/** People who work the support queue, with the team they sit in. */
export const SUPPORT_ASSIGNEES = ["st-imran", "st-priya", "st-deepa", "st-arjun", "st-rahul", "st-meera"].map((id) => ({
  id,
  name: staffName(id),
  title: staffById(id)?.title ?? "",
}));

export function assigneeLabel(id: string | null) {
  return id ? staffName(id) : "Unassigned";
}

export type EscalationTarget = { id: string; label: string };

/** Academic questions go to paper faculty; everything else follows the escalation matrix, plus the learner's mentor. */
export function escalationTargets(t: Ticket): EscalationTarget[] {
  if (t.category === "Academic") {
    return faculty.map((f) => ({ id: f.id, label: `${f.name} · faculty, ${f.focusPapers.join(", ")}` }));
  }
  const rule = escalationMatrix.find((r) => r.category === t.category);
  const levels = (rule?.levels ?? [])
    .filter((l) => l.ownerId !== t.assigneeId)
    .map((l) => ({ id: l.ownerId, label: `${staffName(l.ownerId)} · level ${l.level}, ${l.team}` }));
  const mentorId = studentById(t.studentId)?.mentorId;
  if (mentorId && !levels.some((l) => l.id === mentorId)) {
    levels.push({ id: mentorId, label: `${staffName(mentorId)} · the learner's mentor` });
  }
  return levels;
}

export type CannedResponse = { id: string; label: string; body: string };

const CATEGORY_CANNED: Partial<Record<TicketCategory, CannedResponse[]>> = {
  Registration: [
    {
      id: "reg-review",
      label: "Registration documents with ACCA",
      body: "Your registration documents are with ACCA for verification, which usually takes 5 to 10 working days. We will add your ACCA student ID to your record as soon as ACCA confirms.",
    },
  ],
  Exemption: [
    {
      id: "exm-fee",
      label: "Exemption fee is paid to ACCA",
      body: "Exemption fees are paid to ACCA on the ACCA portal, one fee per exempt paper. Once paid, reply with the ACCA reference and we will record it against your exemptions.",
    },
  ],
  "Exam booking": [
    {
      id: "exam-window",
      label: "Dec 2026 entry windows",
      body: "Dec 2026 early entry closes 5 Oct 2026, standard entry 2 Nov 2026 and late entry 16 Nov 2026. Book on the ACCA portal and we will record the booking on Exams and results.",
    },
  ],
  Payments: [
    {
      id: "pay-recorded",
      label: "Payment recorded, receipt issued",
      body: "We have recorded your payment and the receipt is on your Payments page. If the status has not changed within 48 hours, reply here with your bank or UPI reference.",
    },
  ],
  Technical: [
    {
      id: "tech-steps",
      label: "Browser and device steps",
      body: "Please use Chrome or Edge, allow camera and microphone, close other apps that use the camera and restart the browser. If it still fails, reply with a screenshot of the error.",
    },
  ],
  Career: [
    {
      id: "career-team",
      label: "Passed to the placement team",
      body: "I have shared this with the placement team. Rahul Verma's team will reply here within one working day.",
    },
  ],
};

const GENERIC_CANNED: CannedResponse[] = [
  {
    id: "ack",
    label: "Acknowledge and set expectations",
    body: "Thanks for raising this. I am looking into it now and will update you here within one working day.",
  },
  {
    id: "more-info",
    label: "Ask for more information",
    body: "Could you share a screenshot and any reference number you were given? That lets us check your record straight away.",
  },
  {
    id: "to-faculty",
    label: "Academic question passed to faculty",
    body: "This is an academic question, so I have passed it to your paper faculty. They will answer in this ticket, usually within two working days.",
  },
];

export function cannedResponsesFor(category: TicketCategory): CannedResponse[] {
  const faqAnswers = faqs
    .filter((f) => f.category === category && f.status === "published")
    .map((f) => ({ id: f.id, label: `FAQ: ${f.question}`, body: f.answer }));
  return [...(CATEGORY_CANNED[category] ?? []), ...faqAnswers, ...GENERIC_CANNED];
}

export function learnerLine(studentId: string) {
  const s = studentById(studentId);
  if (!s) return "";
  if (s.type === "undergraduate") return `Undergraduate${s.semester ? ` · Semester ${s.semester}` : ""}`;
  return "Graduate";
}
