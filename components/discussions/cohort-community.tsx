"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Trophy,
} from "lucide-react";
import {
  cohortById,
  leaderboardFor,
  staffById,
  universityById,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { toast } from "@/components/ui/toast";
import { DEMO_NOW, dayTimeLabel } from "@/components/student/help/shared";

type Role = "Learner" | "Faculty" | "Mentor";
type Reply = { id: string; author: string; role: Role; body: string; at: string };
type Post = {
  id: string;
  author: string;
  role: Role;
  section?: "A" | "B";
  audience: "Whole cohort" | "Section A" | "Section B";
  kind: "Announcement" | "Study group" | "Question" | "Class notes" | "Exams";
  title: string;
  body: string;
  at: string;
  pinned?: boolean;
  likes: number;
  files?: string[];
  replies: Reply[];
};

/* Cohort-only threads for Brightwater · 2025 intake · Semester 3. Authors are
   members of the cohort (leaderboard names), its ACCA faculty and its mentor. */
const SEED: Post[] = [
  {
    id: "cp-1",
    author: "Vikram Joshi",
    role: "Faculty",
    audience: "Whole cohort",
    kind: "Announcement",
    title: "LW classes resume on 28 Sep after internal assessment week",
    body: "There are no ACCA classes from 21 to 25 September while the university runs continuous internal assessment. The breach of contract and remedies recording is up. Use the week to finish the consideration practice set.",
    at: "2026-09-11T17:00",
    pinned: true,
    likes: 24,
    replies: [
      { id: "r1", author: "Meghna Hegde", role: "Learner", body: "Does the practice set count towards leaderboard points?", at: "2026-09-11T18:12" },
      { id: "r2", author: "Vikram Joshi", role: "Faculty", body: "Yes, 40 points if you finish it before 27 September.", at: "2026-09-11T19:05" },
    ],
  },
  {
    id: "cp-2",
    author: "Rohan Iyer",
    role: "Learner",
    section: "A",
    audience: "Section A",
    kind: "Study group",
    title: "FA consolidation study group before mock exam 2",
    body: "Our Corporate Accounting notes only use the proportionate method for NCI. A few of us are meeting in the library on Thursdays at 17:00 to work FA area G questions before the 31 Oct mock. Anyone from Section A is welcome.",
    at: "2026-09-12T20:15",
    likes: 11,
    replies: [
      { id: "r1", author: "Ravi Srinivasan", role: "Learner", body: "Count me in. I have both FA practice sets printed.", at: "2026-09-12T20:41" },
      { id: "r2", author: "Neel Patel", role: "Learner", body: "Can we also cover the suspense account questions from last week?", at: "2026-09-13T09:03" },
    ],
  },
  {
    id: "cp-3",
    author: "Nikhil Bose",
    role: "Mentor",
    audience: "Whole cohort",
    kind: "Exams",
    title: "Book on-demand FA before 20 November",
    body: "University examinations run from 23 Nov to 12 Dec, and no ACCA classes or mocks are scheduled then. If you have not booked FA, pick a date before 20 Nov at the Pune centre, or plan for January. Message me if your date clashes.",
    at: "2026-09-10T12:00",
    pinned: true,
    likes: 19,
    replies: [
      { id: "r1", author: "Omkar Reddy", role: "Learner", body: "I booked 16 Nov. Is that too close to the blackout?", at: "2026-09-10T13:20" },
      { id: "r2", author: "Nikhil Bose", role: "Mentor", body: "16 Nov is fine. Keep the week after it for university revision.", at: "2026-09-10T14:02" },
    ],
  },
  {
    id: "cp-4",
    author: "Omkar Reddy",
    role: "Learner",
    section: "B",
    audience: "Whole cohort",
    kind: "Question",
    title: "Which B.Com subjects overlap with LW?",
    body: "Business Law this semester covers contract, and Company Law next year covers formation of companies. Is it worth reading the ACCA LW notes alongside the university ones?",
    at: "2026-09-13T18:40",
    likes: 7,
    replies: [
      { id: "r1", author: "Divya D'Souza", role: "Learner", body: "The semester roadmap shows Business Law as a partial overlap with LW area B, so yes for contract.", at: "2026-09-13T19:15" },
    ],
  },
  {
    id: "cp-5",
    author: "Meghna Hegde",
    role: "Learner",
    section: "A",
    audience: "Section A",
    kind: "Class notes",
    title: "Offer and acceptance cases from Wednesday's LW class",
    body: "A one-page table of the postal rule, instantaneous communication and counter-offers, with the case names Vikram Joshi used in class.",
    at: "2026-09-09T21:05",
    likes: 18,
    files: ["LW-offer-acceptance-cases.pdf"],
    replies: [],
  },
  {
    id: "cp-6",
    author: "Pooja Jacob",
    role: "Learner",
    section: "A",
    audience: "Whole cohort",
    kind: "Exams",
    title: "FA mock exam 1: what helped you most?",
    body: "I lost time on the longer consolidation questions. What did people do differently on the objective test part?",
    at: "2026-09-14T08:10",
    likes: 5,
    replies: [
      { id: "r1", author: "Tara Kamath", role: "Learner", body: "Flag anything over two minutes and come back to it. I finished with 12 minutes spare.", at: "2026-09-14T08:52" },
    ],
  },
];

type Filter = "all" | "A" | "B" | "staff";

export function CohortCommunity({ s, switcher }: { s: Student; switcher?: React.ReactNode }) {
  const cohortId = s.cohortIds.find((id) => cohortById(id)?.type === "university") ?? s.cohortIds[0];
  const cohort = cohortById(cohortId);
  const uni = universityById(s.universityId);
  const members = useMemo(() => leaderboardFor(cohortId), [cohortId]);
  const mySection = (s.section ?? "A") as "A" | "B";

  const [posts, setPosts] = useState<Post[]>(SEED);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>("cp-2");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeKey, setComposeKey] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSection, setMemberSection] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const staffRows = [
    ...(cohort?.facultyIds ?? []).map((id) => ({ id, role: "Faculty" as Role })),
    ...(cohort?.mentorId ? [{ id: cohort.mentorId, role: "Mentor" as Role }] : []),
  ];

  const visible = posts
    .filter((p) => {
      if (filter === "staff") return p.role !== "Learner";
      if (filter === "A" || filter === "B") return p.audience === `Section ${filter}` || p.section === filter;
      return true;
    })
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.at.localeCompare(a.at));

  const memberList = members.filter(
    (m) =>
      (memberSection === "all" || m.section === memberSection) &&
      (!memberQuery.trim() || m.name.toLowerCase().includes(memberQuery.trim().toLowerCase())),
  );

  function postReply(post: Post) {
    const body = (replyDraft[post.id] ?? "").trim();
    if (!body) return;
    setPosts((list) =>
      list.map((p) =>
        p.id === post.id
          ? { ...p, replies: [...p.replies, { id: `r${p.replies.length + 1}`, author: s.name, role: "Learner", body, at: DEMO_NOW }] }
          : p,
      ),
    );
    setReplyDraft((d) => ({ ...d, [post.id]: "" }));
    toast({ title: "Reply posted", body: post.title });
  }

  return (
    <>
      <PageHeader
        eyebrow="Help"
        title="Community"
        sub={`University cohort community for ${cohort?.name ?? "your cohort"}. Threads here are visible only to your cohort, its ACCA faculty and your mentor.`}
        actions={
          <Button
            onClick={() => {
              setFiles([]);
              setComposeKey((k) => k + 1);
              setComposeOpen(true);
            }}
          >
            <Plus className="size-4" /> Start a cohort thread
          </Button>
        }
      />

      {switcher}

      <section className="flex min-w-0 flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4 sm:p-5">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)] font-display text-[17px] font-bold text-on-accent"
          style={{ backgroundColor: uni?.branding.primary }}
        >
          {uni?.branding.logoInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{cohort?.name}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {uni?.programmeName} · {cohort?.size} members · Sections {cohort?.sections.map((x) => x.name.replace("Section ", "")).join(" and ")} · you are in Section {mySection}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2">
          <Lock className="size-3.5 text-ink-3" /> Cohort only
        </span>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              size="sm"
              value={filter}
              onChange={(id) => setFilter(id as Filter)}
              items={[
                { id: "all", label: "All threads" },
                { id: "A", label: "Section A" },
                { id: "B", label: "Section B" },
                { id: "staff", label: "Faculty and mentor" },
              ]}
            />
            <p className="text-[12.5px] text-ink-3 tnum">{visible.length} threads</p>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={<MessageSquare />} title="No threads in this view" sub="Start one for your section or the whole cohort." />
          ) : (
            <ul className="space-y-3">
              {visible.map((p) => {
                const open = openId === p.id;
                const isLiked = Boolean(liked[p.id]);
                return (
                  <li key={p.id}>
                    <Card className={cn("p-4 sm:p-5", p.pinned && "border-line-strong")}>
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar name={p.author} size="sm" className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[13px] font-semibold text-ink">{p.author}</span>
                            <Badge tone={p.role === "Learner" ? "neutral" : "dark"}>
                              {p.role === "Learner" ? `Section ${p.section}` : p.role}
                            </Badge>
                            <span className="text-[12px] text-ink-3 tnum">{dayTimeLabel(p.at)}</span>
                            {p.pinned ? (
                              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-2">
                                <Pin className="size-3" /> Pinned
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-2 text-[15px] leading-snug font-bold text-ink [overflow-wrap:anywhere]">{p.title}</h3>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{p.body}</p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <Badge tone="cta">{p.kind}</Badge>
                            <Badge>{p.audience}</Badge>
                            {p.files?.map((f) => (
                              <Badge key={f} tone="info">
                                {f}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              aria-pressed={isLiked}
                              onClick={() => setLiked((l) => ({ ...l, [p.id]: !isLiked }))}
                              className={cn(
                                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold tnum transition-colors",
                                isLiked ? "border-cta bg-cta-soft text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong",
                              )}
                            >
                              <Heart className={cn("size-3.5", isLiked && "fill-current")} /> {p.likes + (isLiked ? 1 : 0)}
                            </button>
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => setOpenId(open ? null : p.id)}
                              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink-2 hover:border-line-strong"
                            >
                              <MessageSquare className="size-3.5" /> {p.replies.length} {p.replies.length === 1 ? "reply" : "replies"}
                              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                            </button>
                          </div>

                          {open ? (
                            <div className="mt-3 space-y-3 border-t border-line pt-3">
                              {p.replies.map((r) => (
                                <div key={r.id} className="flex min-w-0 gap-2.5">
                                  <Avatar name={r.author} size="xs" className="mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-x-2 text-[12.5px]">
                                      <span className="font-semibold text-ink">{r.author}</span>
                                      {r.role !== "Learner" ? <Badge tone="dark">{r.role}</Badge> : null}
                                      <span className="text-ink-3 tnum">{dayTimeLabel(r.at)}</span>
                                    </p>
                                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{r.body}</p>
                                  </div>
                                </div>
                              ))}
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  postReply(p);
                                }}
                                className="flex min-w-0 gap-2"
                              >
                                <input
                                  value={replyDraft[p.id] ?? ""}
                                  onChange={(e) => setReplyDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                                  placeholder="Reply to your cohort"
                                  aria-label={`Reply to ${p.title}`}
                                  className="h-9 min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-3 focus:border-ink focus:shadow-[0_0_0_3px_var(--ring-cta)] focus:outline-none"
                                />
                                <Button type="submit" size="sm" disabled={!(replyDraft[p.id] ?? "").trim()}>
                                  <Send className="size-3.5" /> Reply
                                </Button>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Faculty and mentor" sub="They read and answer cohort threads" />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {staffRows.map((r) => {
                const st = staffById(r.id);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={st?.name ?? r.id} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{st?.name}</p>
                      <p className="truncate text-[12px] text-ink-3">{st?.title}</p>
                    </div>
                    <Badge tone="dark">{r.role}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Members" sub={`${members.length} learners in ${cohort?.name.split(" · ")[0] ?? "the cohort"} Semester 3`} />
            <div className="space-y-2.5 border-t border-line px-5 py-3.5">
              <Input
                icon={<Search />}
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search members"
                aria-label="Search cohort members"
              />
              <Segmented
                size="sm"
                value={memberSection}
                onChange={setMemberSection}
                items={[
                  { id: "all", label: "All" },
                  { id: "A", label: "Section A" },
                  { id: "B", label: "Section B" },
                ]}
              />
            </div>
            <ul className="scrollbar-slim max-h-80 divide-y divide-[var(--line)] overflow-y-auto border-t border-line">
              {(showAll ? memberList : memberList.slice(0, 8)).map((m) => (
                <li key={`${m.rank}-${m.name}`} className={cn("flex items-center gap-3 px-5 py-2.5", m.studentId === s.id && "bg-cta-soft")}>
                  <Avatar name={m.name} size="xs" className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                    {m.name}
                    {m.studentId === s.id ? " (you)" : ""}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-3">Section {m.section}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
              {memberList.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                >
                  {showAll ? "Show fewer" : `Show all ${memberList.length}`}
                </button>
              ) : (
                <span className="text-[12.5px] text-ink-3">{memberList.length} shown</span>
              )}
              <Link href="/leaderboard" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-2 hover:text-ink">
                <Trophy className="size-3.5" /> Leaderboard <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>
        </aside>
      </div>

      <FormDrawer
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Start a cohort thread"
        sub={`Visible to ${cohort?.name ?? "your cohort"} only.`}
        submitLabel="Post to cohort"
        onSubmit={(data) => {
          const audience = String(data.get("audience")) as Post["audience"];
          const post: Post = {
            id: `cp-new-${posts.length + 1}`,
            author: s.name,
            role: "Learner",
            section: mySection,
            audience,
            kind: String(data.get("kind")) as Post["kind"],
            title: String(data.get("title") ?? "").trim(),
            body: String(data.get("body") ?? "").trim(),
            at: DEMO_NOW,
            likes: 0,
            files,
            replies: [],
          };
          setPosts((list) => [post, ...list]);
          setFilter("all");
          setOpenId(post.id);
          toast({ title: `Posted to ${uni?.shortName ?? "your"} cohort`, body: `${post.title} · ${audience}` });
          setComposeOpen(false);
        }}
      >
        <Field label="Title">
          <Input name="title" required key={`t-${composeKey}`} placeholder="e.g. LW revision group after the FA exam" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select name="kind" defaultValue="Question" key={`k-${composeKey}`}>
              <option>Question</option>
              <option>Study group</option>
              <option>Class notes</option>
              <option>Exams</option>
            </Select>
          </Field>
          <Field label="Who can see it">
            <Select name="audience" defaultValue="Whole cohort" key={`a-${composeKey}`}>
              <option>Whole cohort</option>
              <option value={`Section ${mySection}`}>My section (Section {mySection})</option>
            </Select>
          </Field>
        </div>
        <Field label="Details">
          <Textarea name="body" required rows={5} key={`b-${composeKey}`} placeholder="What you want to share or ask your cohort" />
        </Field>
        <FileDrop key={`f-${composeKey}`} label="Attach notes" accept=".pdf,.png,.jpg,.docx" onFiles={(all) => setFiles(all)} />
      </FormDrawer>
    </>
  );
}
