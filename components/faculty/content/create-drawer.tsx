"use client";

import { useState } from "react";
import type { LessonType } from "@/lib/data";
import {
  ACCA_TODAY,
  CONTENT_TYPE_LABELS,
  accaPapers,
  bankQuestions,
  examSessions,
  paperByCode,
  questionBanks,
  staffName,
  type ContentItem,
  type ContentType,
  type PaperCode,
} from "@/lib/data/acca";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { toast } from "@/components/ui/toast";
import {
  CREATE_CONTENT,
  CREATE_STRUCTURE,
  LESSON_TYPE_OPTIONS,
  type CreateKind,
  type OutlineLesson,
  type OutlineModule,
  type PaperOutline,
} from "./outline";
import { MiniLabel, SubjectPicker, SyllabusAreaPicker, plural, type useAuthor } from "./shared";

type Author = ReturnType<typeof useAuthor>;

export type CreateRequest = { kind: CreateKind; open: boolean; outlineId?: string; nonce: number };

const PREFERRED: Partial<Record<ContentType, LessonType[]>> = {
  video: ["video"],
  "study-material": ["article", "pdf", "slides"],
  transcript: ["video"],
  "examiner-report": ["pdf", "live"],
  "model-answer": ["assignment", "lab", "quiz"],
  "revision-notes": ["pdf", "article"],
  "practice-activity": ["quiz", "lab"],
};

const NEEDS_FILE: ContentType[] = ["video", "study-material", "transcript", "examiner-report", "model-answer"];

const FILE_RULES: Partial<Record<ContentType, { accept: string; hint: string }>> = {
  video: { accept: ".mp4,.mov", hint: "Up to 2 GB. Captions are generated after upload." },
  "study-material": { accept: ".pdf,.docx,.pptx,.xlsx", hint: "Notes, slides or worked examples. Up to 50 MB." },
  transcript: { accept: ".vtt,.srt,.txt,.docx", hint: "Timed captions (VTT or SRT) show in the player." },
  "examiner-report": { accept: ".pdf,.docx", hint: "Paraphrase examiner comments and link the ACCA source." },
  "model-answer": { accept: ".pdf,.docx,.xlsx", hint: "Workings in the CBE spreadsheet layout where possible." },
  "revision-notes": { accept: ".pdf,.docx", hint: "Optional if you write the notes above." },
};

const EDITIONS = ["Revision and question practice", "Full paper course", "Fast track", "Reattempt"];
const FUTURE_SESSIONS = examSessions.filter((s) => !s.past && s.status !== "results-pending");
const PAST_SESSIONS = examSessions.filter((s) => s.past || s.status === "results-released");

function isContentKind(kind: CreateKind): kind is ContentType {
  return kind !== "paper" && kind !== "module" && kind !== "lesson";
}

function defaultsFor(outline: PaperOutline | undefined, kind: CreateKind) {
  if (!outline) return { moduleId: "", lessonId: "" };
  const prefs = isContentKind(kind) ? (PREFERRED[kind] ?? []) : [];
  const mods =
    kind === "examiner-report" || kind === "revision-notes" ? [...outline.modules].reverse() : outline.modules;
  for (const t of prefs) {
    for (const m of mods) {
      const l = m.lessons.find((x) => x.type === t);
      if (l) return { moduleId: m.id, lessonId: l.id };
    }
  }
  const m = mods[0];
  return { moduleId: m?.id ?? "", lessonId: m?.lessons[0]?.id ?? "" };
}

function suggestedTitle(kind: ContentType, code: string, mod?: OutlineModule, lesson?: OutlineLesson) {
  const lt = lesson?.title ?? mod?.title ?? code;
  switch (kind) {
    case "video":
      return lt;
    case "study-material":
      return `${lt}: study notes`;
    case "transcript":
      return `${lt}: transcript`;
    case "examiner-report":
      return `${code} examiner report notes · Jun 2026 session`;
    case "model-answer":
      return `Model answer: ${lt}`;
    case "revision-notes":
      return `${mod?.title ?? code} revision notes`;
    case "practice-activity":
      return `${mod?.title ?? code} practice set`;
  }
}

export function CreateDrawer({
  request,
  onClose,
  outlines,
  items,
  author,
  onCreatePaper,
  onCreateModule,
  onCreateLesson,
  onCreateItems,
}: {
  request: CreateRequest;
  onClose: () => void;
  outlines: PaperOutline[];
  items: ContentItem[];
  author: Author;
  onCreatePaper: (outline: PaperOutline) => void;
  onCreateModule: (outlineId: string, module: OutlineModule, position: number) => void;
  onCreateLesson: (outlineId: string, moduleId: string, lesson: OutlineLesson) => void;
  onCreateItems: (items: ContentItem[]) => void;
}) {
  const { kind } = request;
  const meta = [...CREATE_STRUCTURE, ...CREATE_CONTENT].find((c) => c.kind === kind)!;
  const content = isContentKind(kind);

  const firstOutline = outlines.find((o) => o.id === request.outlineId) ?? outlines[0];
  const firstDefaults = defaultsFor(firstOutline, kind);
  const [outlineId, setOutlineId] = useState(firstOutline?.id ?? "");
  const [moduleId, setModuleId] = useState(firstDefaults.moduleId);
  const [lessonId, setLessonId] = useState(firstDefaults.lessonId);

  const outline = outlines.find((o) => o.id === outlineId) ?? firstOutline;
  const code = (outline?.code ?? author.papers[0]) as PaperCode;
  const mod = outline?.modules.find((m) => m.id === moduleId);
  const lesson = mod?.lessons.find((l) => l.id === lessonId);

  const [area, setArea] = useState<string[]>(
    firstOutline?.modules.find((m) => m.id === firstDefaults.moduleId)?.areas.slice(0, 1) ?? [],
  );
  const [moduleAreas, setModuleAreas] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [autoTranscript, setAutoTranscript] = useState(true);
  const [timed, setTimed] = useState(true);

  /* paper */
  const [pCode, setPCode] = useState<PaperCode>(author.papers[0]);
  const [edition, setEdition] = useState(EDITIONS[0]);
  const [session, setSession] = useState<string>(FUTURE_SESSIONS[1]?.id ?? FUTURE_SESSIONS[0]?.id ?? "");
  const [paperTitle, setPaperTitle] = useState<string | null>(null);
  const [fromAreas, setFromAreas] = useState(true);
  const sessionLabel = examSessions.find((s) => s.id === session)?.label ?? "";
  const autoPaperTitle = `${pCode} ${edition} · ${sessionLabel}`;

  const changeOutline = (id: string) => {
    const o = outlines.find((x) => x.id === id);
    const d = defaultsFor(o, kind);
    setOutlineId(id);
    setModuleId(d.moduleId);
    setLessonId(d.lessonId);
    setArea(o?.modules.find((m) => m.id === d.moduleId)?.areas.slice(0, 1) ?? []);
    setSubjects([]);
  };
  const changeModule = (id: string) => {
    const m = outline?.modules.find((x) => x.id === id);
    setModuleId(id);
    setLessonId(m?.lessons[0]?.id ?? "");
    if (m?.areas.length) setArea(m.areas.slice(0, 1));
  };

  const submitLabel =
    kind === "paper" ? "Create paper" : kind === "module" ? "Create module" : kind === "lesson" ? "Create lesson" : author.publishLabel;

  const reviewer = staffName(author.reviewerId);

  const onSubmit = (data: FormData) => {
    if (kind === "paper") {
      const p = paperByCode(pCode)!;
      const title = (paperTitle ?? autoPaperTitle).trim() || autoPaperTitle;
      const count = Math.max(1, Math.min(12, Number(data.get("count")) || 4));
      const base = `md-new-${outlines.length + 1}`;
      const modules: OutlineModule[] = fromAreas
        ? p.syllabusAreas.map((a, i) => ({ id: `${base}-${i + 1}`, title: a.title, summary: `Syllabus area ${a.code}.`, areas: [a.code], lessons: [] }))
        : Array.from({ length: count }, (_, i) => ({ id: `${base}-${i + 1}`, title: `Module ${i + 1}`, summary: "Describe what this module covers.", areas: [], lessons: [] }));
      onCreatePaper({
        id: `ol-new-${outlines.length + 1}`,
        code: pCode,
        title,
        slug: null,
        courseId: p.courseId,
        status: "draft",
        edition: `${edition} · ${sessionLabel} exam session`,
        modules,
      });
      toast({ title: "Paper created", body: `${title} · ${plural(modules.length, "module")}${fromAreas ? " from the syllabus areas" : ""}` });
      onClose();
      return;
    }

    if (!outline) return;
    const title = String(data.get("title") ?? "").trim();

    if (kind === "module") {
      if (moduleAreas.length === 0) {
        toast({ title: "Tag at least one syllabus area", tone: "warning" });
        return;
      }
      const position = String(data.get("position") ?? "end");
      const at = position === "end" ? outline.modules.length : Number(position) + 1;
      onCreateModule(
        outline.id,
        { id: `md-new-${outline.id}-${outline.modules.length + 1}`, title, summary: String(data.get("summary") ?? "").trim() || "Describe what this module covers.", areas: moduleAreas, lessons: [] },
        at,
      );
      toast({ title: "Module created", body: `${outline.code} · Module ${at + 1}: ${title} · tagged ${moduleAreas.join(", ")}` });
      onClose();
      return;
    }

    if (area.length === 0) {
      toast({ title: "Choose a syllabus area", body: "Every lesson and content item is tagged to one.", tone: "warning" });
      return;
    }

    if (kind === "lesson") {
      if (!mod) {
        toast({ title: "Create a module first", tone: "warning" });
        return;
      }
      const ltype = String(data.get("ltype")) as LessonType;
      const minutes = Number(data.get("minutes")) || 10;
      const count = outline.modules.reduce((n, m) => n + m.lessons.length, 0);
      onCreateLesson(outline.id, mod.id, { id: `ls-new-${outline.id}-${count + 1}`, title, type: ltype, minutes, area: area[0], subjects });
      toast({
        title: "Lesson created",
        body: `Added to ${mod.title} · ${code} ${area[0]}${subjects.length ? ` · mapped to ${plural(subjects.length, "university subject")}` : ""}`,
      });
      onClose();
      return;
    }

    // Content items
    if (NEEDS_FILE.includes(kind) && files.length === 0) {
      toast({ title: "Add a file first", body: `${meta.label} needs at least one file.`, tone: "warning" });
      return;
    }
    if (kind === "revision-notes" && !String(data.get("notes") ?? "").trim() && files.length === 0) {
      toast({ title: "Write the notes or attach a file", tone: "warning" });
      return;
    }
    const draft = data.get("draft") === "on";
    const status: ContentItem["status"] = draft ? "draft" : author.canPublish ? "published" : "in-review";
    const size =
      kind === "video"
        ? `${Number(data.get("minutes")) || 20} min`
        : kind === "practice-activity"
          ? `${Number(data.get("count")) || 10} questions`
          : `${Number(data.get("pages")) || 6} pages`;

    const make = (id: string, t: string, type: ContentType, s: ContentItem["status"], sz: string, summary: string): ContentItem => ({
      id,
      title: t,
      paper: code,
      courseId: outline.courseId,
      module: mod?.title ?? "Paper level",
      lesson: lesson?.title ?? "Module level",
      type,
      syllabusArea: area[0],
      universitySubjectIds: subjects,
      variant: null,
      status: s,
      version: "v1.0",
      versions: [{ version: "v1.0", date: ACCA_TODAY, authorId: author.staffId, summary, status: s }],
      authorId: author.staffId,
      reviewerId: s === "in-review" ? author.reviewerId : null,
      updated: ACCA_TODAY,
      size: sz,
      views: 0,
    });

    const summary = status === "published" ? "First published version" : status === "in-review" ? "Submitted for review" : "Working draft";
    const created = [make(`ct-new-${items.length + 1}`, title, kind, status, size, summary)];
    if (kind === "video" && autoTranscript) {
      created.push(make(`ct-new-${items.length + 2}`, `${title}: transcript`, "transcript", "draft", "Auto-generated", "Generated from the video captions"));
    }
    onCreateItems(created);

    const where = `${CONTENT_TYPE_LABELS[kind]} · ${code} ${area[0]}${subjects.length ? ` · mapped to ${plural(subjects.length, "university subject")}` : ""}`;
    toast(
      status === "published"
        ? { title: `Published: ${title}`, body: `${where}${created.length > 1 ? " · draft transcript generated" : ""}` }
        : status === "in-review"
          ? { title: "Submitted for review", body: `${reviewer} is asked to review ${title}. ${where}`, tone: "info" }
          : { title: "Saved as draft", body: where, tone: "neutral" },
    );
    onClose();
  };

  const bank = questionBanks.find((b) => b.paper === code);
  const linkedQuestions = bankQuestions.filter((q) => q.paper === code && (q.type === "CR" || q.type === "MTQ"));
  const videos = [
    ...items.filter((i) => i.paper === code && i.type === "video").map((i) => i.title),
    ...(outline?.modules.flatMap((m) => m.lessons.filter((l) => l.type === "video").map((l) => l.title)) ?? []),
  ];
  const rule = content ? FILE_RULES[kind] : undefined;

  return (
    <FormDrawer
      open={request.open}
      onClose={onClose}
      title={meta.label}
      sub={
        kind === "paper"
          ? "Start a paper course or edition. You add lessons and content once the outline exists."
          : "Tag it to an ACCA syllabus area and map it to the university subjects it supports."
      }
      submitLabel={submitLabel}
      width="w-full max-w-xl"
      onSubmit={onSubmit}
      footerNote={
        content && !author.canPublish
          ? `Goes to ${reviewer} for review`
          : content
            ? "Learners see it once published"
            : undefined
      }
    >
      {kind === "paper" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ACCA paper">
              <Select name="code" value={pCode} onChange={(e) => setPCode(e.target.value as PaperCode)}>
                {accaPapers.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} · {p.name}
                    {author.papers.includes(p.code) ? " (your paper)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target exam session">
              <Select name="session" value={session} onChange={(e) => setSession(e.target.value)}>
                {FUTURE_SESSIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Edition">
            <Select name="edition" value={edition} onChange={(e) => setEdition(e.target.value)}>
              {EDITIONS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </Select>
          </Field>
          <Field label="Paper title" hint="Shown to learners on their Papers page">
            <Input name="title" value={paperTitle ?? autoPaperTitle} onChange={(e) => setPaperTitle(e.target.value)} required />
          </Field>
          <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
            <Switch
              checked={fromAreas}
              onChange={setFromAreas}
              label="One module per ACCA syllabus area"
              sub={`${plural(paperByCode(pCode)?.syllabusAreas.length ?? 0, "module")}, each tagged to its area: ${(paperByCode(pCode)?.syllabusAreas ?? [])
                .map((a) => a.code)
                .join(", ")}`}
            />
            {!fromAreas ? (
              <Field label="Number of blank modules" className="mt-3">
                <Input name="count" type="number" min={1} max={12} defaultValue={4} />
              </Field>
            ) : null}
          </div>
          <p className="text-[12.5px] text-ink-3">
            {paperByCode(pCode)?.examStructure} · {paperByCode(pCode)?.durationLabel} · pass mark 50%
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paper">
              <Select value={outlineId} onChange={(e) => changeOutline(e.target.value)}>
                {outlines.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} · {o.title}
                  </option>
                ))}
              </Select>
            </Field>
            {kind === "module" ? (
              <Field label="Position">
                <Select name="position" key={outlineId} defaultValue="end">
                  <option value="end">At the end</option>
                  {outline?.modules.map((m, i) => (
                    <option key={m.id} value={i}>
                      After module {i + 1}: {m.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Module">
                <Select value={moduleId} onChange={(e) => changeModule(e.target.value)} disabled={!outline?.modules.length}>
                  {outline?.modules.length ? null : <option value="">No modules yet</option>}
                  {outline?.modules.map((m, i) => (
                    <option key={m.id} value={m.id}>
                      {i + 1}. {m.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          {content ? (
            <Field label="Lesson">
              <Select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                <option value="">Module level (not tied to a lesson)</option>
                {mod?.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {kind === "module" ? (
            <>
              <Field label="Module title">
                <Input name="title" required placeholder="e.g. Exam technique and question practice" />
              </Field>
              <Field label="Summary" hint="One or two sentences">
                <Textarea name="summary" rows={2} placeholder="What learners can do after this module" />
              </Field>
              <div>
                <MiniLabel className="mb-2">Syllabus areas</MiniLabel>
                <SyllabusAreaPicker paper={code} multiple value={moduleAreas} onChange={setModuleAreas} name="areas" />
              </div>
            </>
          ) : null}

          {kind === "lesson" ? (
            <>
              <Field label="Lesson title">
                <Input name="title" required placeholder="e.g. Disposal of a subsidiary: gain on disposal" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lesson type">
                  <Select name="ltype" defaultValue="video">
                    {LESSON_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Length" hint="minutes">
                  <Input name="minutes" type="number" min={1} defaultValue={15} />
                </Field>
              </div>
            </>
          ) : null}

          {content ? (
            <Field label="Title">
              <Input key={`${kind}-${moduleId}-${lessonId}`} name="title" required defaultValue={suggestedTitle(kind, code, mod, lesson)} />
            </Field>
          ) : null}

          {kind === "video" ? (
            <>
              <FileDrop label="Upload videos" accept={rule?.accept} hint={rule?.hint} onFiles={(all) => setFiles(all)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Duration" hint="minutes">
                  <Input name="minutes" type="number" min={1} defaultValue={lesson?.minutes ?? 20} key={lessonId} />
                </Field>
                <Field label="Chapter markers" hint="Optional">
                  <Input name="chapters" placeholder="e.g. 00:00 Intro, 06:30 Worked example" />
                </Field>
              </div>
              <Switch checked={autoTranscript} onChange={setAutoTranscript} label="Generate a draft transcript" sub="Created from the captions as a draft you can correct" />
            </>
          ) : null}

          {kind === "study-material" ? (
            <>
              <FileDrop label="Upload study material" accept={rule?.accept} hint={rule?.hint} onFiles={(all) => setFiles(all)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Material">
                  <Select name="materialKind" defaultValue="Study notes">
                    {["Study notes", "Slides", "Worked examples", "Formulae sheet", "Reading list"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Pages">
                  <Input name="pages" type="number" min={1} defaultValue={12} />
                </Field>
              </div>
              <Checkbox name="download" defaultChecked label="Learners can download a copy" />
            </>
          ) : null}

          {kind === "transcript" ? (
            <>
              <Field label="For video">
                <Select name="video" defaultValue={lesson?.type === "video" ? lesson.title : videos[0]}>
                  {Array.from(new Set(videos)).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </Field>
              <FileDrop label="Add transcripts" accept={rule?.accept} hint={rule?.hint} onFiles={(all) => setFiles(all)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Language">
                  <Select name="language" defaultValue="English">
                    <option>English</option>
                    <option>English with Hindi glossary</option>
                  </Select>
                </Field>
                <Field label="Pages">
                  <Input name="pages" type="number" min={1} defaultValue={8} />
                </Field>
              </div>
              <Checkbox name="captions" defaultChecked label="Show as captions in the lesson player" />
            </>
          ) : null}

          {kind === "examiner-report" ? (
            <>
              <Field label="Exam session reported on">
                <Select name="session" defaultValue={PAST_SESSIONS[PAST_SESSIONS.length - 1]?.id}>
                  {[...PAST_SESSIONS].reverse().map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <FileDrop label="Add examiner reports" accept={rule?.accept} hint={rule?.hint} onFiles={(all) => setFiles(all)} />
              <Field label="Key points for learners">
                <Textarea name="points" rows={3} placeholder="e.g. Section C answers listed ratios without explaining the cause from the scenario." />
              </Field>
              <Field label="Pages">
                <Input name="pages" type="number" min={1} defaultValue={6} />
              </Field>
            </>
          ) : null}

          {kind === "model-answer" ? (
            <>
              <Field label="Question it answers">
                <Select name="question" defaultValue={linkedQuestions[0]?.id ?? ""}>
                  <option value="">Not linked to a bank question</option>
                  {linkedQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.id} · {q.topic} ({q.marks} marks)
                    </option>
                  ))}
                </Select>
              </Field>
              <FileDrop label="Add model answers" accept={rule?.accept} hint={rule?.hint} onFiles={(all) => setFiles(all)} />
              <Field label="Marking notes">
                <Textarea name="marking" rows={3} placeholder="Where the marks are, and the common ways learners lose them" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Checkbox name="release" defaultChecked label="Release after the mock exam closes" />
                <Field label="Pages">
                  <Input name="pages" type="number" min={1} defaultValue={5} />
                </Field>
              </div>
            </>
          ) : null}

          {kind === "revision-notes" ? (
            <>
              <Field label="Revision notes" hint="Markdown headings and lists work">
                <Textarea
                  name="notes"
                  rows={6}
                  key={moduleId}
                  defaultValue={`Key points for ${mod?.title ?? code}\n\n1. \n2. \n3. \n\nCommon exam errors\n- `}
                />
              </Field>
              <FileDrop label="Attach a PDF version" accept={rule?.accept} hint={rule?.hint} onFiles={(all) => setFiles(all)} />
              <Field label="Pages">
                <Input name="pages" type="number" min={1} defaultValue={4} />
              </Field>
            </>
          ) : null}

          {kind === "practice-activity" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Question source">
                  <Select name="source" defaultValue={bank?.id ?? "none"}>
                    {bank ? (
                      <option value={bank.id}>
                        {bank.name} · {plural(bank.questionIds.length, "question")}
                      </option>
                    ) : null}
                    <option value="new">Write new questions</option>
                  </Select>
                </Field>
                <Field label="Number of questions">
                  <Input name="count" type="number" min={1} max={40} defaultValue={10} />
                </Field>
              </div>
              <Field label="Difficulty">
                <Select name="difficulty" defaultValue="Mixed">
                  {["Mixed", "Foundation", "Intermediate", "Exam standard"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </Field>
              <Switch checked={timed} onChange={setTimed} label="Timed" sub="1.8 minutes a mark, the CBE pace" />
            </>
          ) : null}

          {kind !== "module" ? (
            <div>
              <MiniLabel className="mb-2">Syllabus area</MiniLabel>
              <SyllabusAreaPicker paper={code} value={area} onChange={setArea} />
            </div>
          ) : null}

          {kind !== "module" ? (
            <div>
              <MiniLabel className="mb-2">Map to university subjects</MiniLabel>
              <SubjectPicker paper={code} area={area[0]} value={subjects} onChange={setSubjects} />
            </div>
          ) : null}

          {content ? (
            <Checkbox
              name="draft"
              label={author.canPublish ? "Save as draft instead of publishing" : "Save as draft instead of submitting for review"}
            />
          ) : null}
        </>
      )}
    </FormDrawer>
  );
}
