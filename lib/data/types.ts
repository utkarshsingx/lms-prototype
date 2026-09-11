export type Role = "learner" | "instructor" | "admin";

export type LessonType =
  | "video"
  | "article"
  | "pdf"
  | "slides"
  | "scorm"
  | "xapi"
  | "quiz"
  | "assignment"
  | "live"
  | "lab";

export type LessonState =
  | "completed"
  | "in_progress"
  | "not_started"
  | "locked";

export type Lesson = {
  id: string;
  title: string;
  type: LessonType;
  minutes: number;
  state: LessonState;
  preview?: boolean;
  /** Standards-package metadata, only present on scorm/xapi lessons. */
  packageMeta?: { version: string; size: string; completionRule: string };
};

export type Module = {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
};

export type CourseStatus = "draft" | "in_review" | "published" | "archived";

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: string;
  level: "Foundational" | "Intermediate" | "Advanced";
  hours: number;
  rating: number;
  ratings: number;
  enrolled: number;
  status: CourseStatus;
  instructorId: string;
  updated: string;
  tags: string[];
  /** Token name (jade/brand/ember/violet/amber/rose) used for the course chip. */
  accent: string;
  outcomes: string[];
  requirements: string[];
  /** Learner-side progress, 0-100. Absent for courses not enrolled in. */
  progress?: number;
  modules: Module[];
  certificate: boolean;
  compliance?: { mandatory: boolean; recertifyMonths: number };
};

export type Person = {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  department: string;
  location: string;
  joined: string;
  streak: number;
  points: number;
  /** Courses completed / enrolled. */
  completed: number;
  enrolled: number;
  status: "active" | "invited" | "suspended";
};

export type PathStep = {
  courseId: string;
  required: boolean;
  gate?: string;
  weeks: number;
};

export type LearningPath = {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  audience: string;
  kind: "Role" | "Skill" | "Onboarding" | "Compliance";
  accent: string;
  owner: string;
  enrolled: number;
  completionRate: number;
  weeks: number;
  steps: PathStep[];
  outcomes: string[];
};

export type QuestionType =
  | "mcq"
  | "multi"
  | "truefalse"
  | "short"
  | "code"
  | "essay"
  | "match";

export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options?: string[];
  /** Index (mcq/truefalse) or indices (multi). */
  answer?: number | number[];
  /** Match questions only. Each left item's correct partner is the `right` on
   *  the same row; the runner shuffles the right-hand column for display. */
  pairs?: { left: string; right: string }[];
  /** Diagnostic questions only: the curriculum module (0-based) this tests. */
  moduleIndex?: number;
  explanation?: string;
  starter?: string;
  rubricId?: string;
};

export type Assessment = {
  id: string;
  title: string;
  courseId: string;
  kind: "Quiz" | "Graded exam" | "Assignment" | "Project" | "Diagnostic";
  minutes: number;
  attempts: number;
  passMark: number;
  autoGraded: boolean;
  proctored: boolean;
  status: "open" | "scheduled" | "closed" | "draft";
  dueAt: string;
  submissions: number;
  cohortSize: number;
  averageScore: number;
  questions: Question[];
  rubricId?: string;
};

export type RubricLevel = { label: string; points: number; descriptor: string };

export type Rubric = {
  id: string;
  name: string;
  total: number;
  criteria: {
    id: string;
    name: string;
    weight: number;
    levels: RubricLevel[];
  }[];
};

export type Submission = {
  id: string;
  assessmentId: string;
  personId: string;
  submittedAt: string;
  score: number | null;
  status: "graded" | "awaiting_review" | "in_progress" | "late" | "missing";
  minutesSpent: number;
  attempt: number;
  flags: string[];
};

export type ChatMessage = {
  id: string;
  /** "system" is an event in the thread (a hand-off, an escalation). It is
   *  shown to the team only and never delivered to the learner. */
  from: "learner" | "bot" | "agent" | "system";
  text: string;
  at: string;
  /** Who wrote an agent message, shown above the bubble. */
  author?: string;
  /** Sources the assistant cited, rendered as chips under the reply. */
  citations?: { label: string; href: string }[];
  /** Tool the assistant invoked to answer. */
  action?: string;
};

export type Conversation = {
  id: string;
  channel: "web" | "whatsapp";
  personId: string;
  phone?: string;
  topic: string;
  status: "resolved" | "open" | "escalated" | "awaiting";
  lastAt: string;
  unread: number;
  csat?: number;
  handledBy: "bot" | "human";
  /** WhatsApp only. Free-form replies are allowed for 24 hours after the
   *  learner's last message; outside that window only approved templates send. */
  windowOpen?: boolean;
  windowClosesAt?: string;
  /** Messages still to arrive, played back when the thread is opened so the
   *  inbox shows an assistant conversation happening live. */
  pending?: ChatMessage[];
  /** The draft the assistant offers a person who has taken over. */
  suggestedReply?: string;
  messages: ChatMessage[];
};

export type CallTurn = { speaker: "agent" | "learner"; text: string; at: string };

export type VoiceCall = {
  id: string;
  personId: string;
  direction: "outbound" | "inbound";
  intent: string;
  startedAt: string;
  seconds: number;
  outcome:
    | "completed"
    | "no_answer"
    | "callback"
    | "escalated"
    | "voicemail";
  sentiment: "positive" | "neutral" | "negative";
  agent: string;
  transcript: CallTurn[];
  /** What the agent changed in the LMS as a result of the call. */
  effects: string[];
};

export type Campaign = {
  id: string;
  name: string;
  goal: string;
  channel: "voice" | "whatsapp";
  status: "running" | "paused" | "scheduled" | "done";
  audience: string;
  reached: number;
  target: number;
  connectRate: number;
  conversion: number;
  agent: string;
};
