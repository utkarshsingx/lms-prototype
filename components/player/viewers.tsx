"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Gauge,
  Lightbulb,
  LoaderCircle,
  Lock,
  Maximize2,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  RotateCw,
  Send,
  Terminal,
  TriangleAlert,
  Upload,
  Volume2,
} from "lucide-react";
import type { Course, Lesson } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataRow } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";

const frame =
  "relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e2)]";

/* ---------------------------------------------------------------- video */

const CHAPTERS = [
  { at: 0, label: "Why quorums overlap" },
  { at: 28, label: "The R + W > N inequality" },
  { at: 54, label: "Sizing for two failures" },
  { at: 78, label: "What goes wrong at W=2" },
];

export function VideoViewer({ lesson }: { lesson: Lesson }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(34);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);

  const total = lesson.minutes * 60;
  const clock = (pct: number) => {
    const s = Math.round((pct / 100) * total);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <div className={frame}>
      {/* stage */}
      <div className="relative aspect-video bg-stage">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, var(--stage-2) 0%, var(--stage) 62%)",
          }}
        />
        <div className="grain absolute inset-0 opacity-40" />

        {/* a still frame stand-in: the diagram the lesson is about */}
        <svg
          viewBox="0 0 400 220"
          className="absolute inset-0 m-auto h-[62%] w-auto opacity-90"
          aria-hidden
        >
          <g fill="none" strokeWidth="1.4">
            {[
              [200, 40],
              [300, 96],
              [262, 178],
              [138, 178],
              [100, 96],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="21"
                  fill={i < 3 ? "var(--stage-brand-soft)" : "var(--stage-2)"}
                  stroke={i < 3 ? "var(--stage-brand)" : "var(--stage-line-strong)"}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={i < 3 ? "var(--stage-brand)" : "var(--stage-ink-3)"}
                  fontSize="11"
                  fontFamily="system-ui"
                >
                  n{i + 1}
                </text>
              </g>
            ))}
            <path
              d="M200 61 L300 75 M300 117 L262 157 M262 178 L138 178 M138 157 L100 117 M100 75 L200 61"
              stroke="var(--stage-line-strong)"
            />
            <path d="M200 61 L300 75 M300 117 L262 157" stroke="var(--stage-brand)" strokeWidth="2" />
          </g>
          <text
            x="200"
            y="212"
            textAnchor="middle"
            fill="var(--stage-brand)"
            fontSize="11"
            fontFamily="system-ui"
          >
            quorum = 3 of 5
          </text>
        </svg>

        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 grid place-items-center"
            aria-label="Play"
          >
            <span className="grid size-16 place-items-center rounded-full bg-stage-ink/95 text-stage shadow-2xl transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-108">
              <Play className="ml-1 size-6 fill-current" />
            </span>
          </button>
        ) : null}

        {captions ? (
          <p className="absolute inset-x-0 bottom-16 mx-auto max-w-lg rounded-[var(--radius-sm)] bg-stage/65 px-3 py-1.5 text-center text-[13px] leading-snug text-stage-ink/95">
            …so any two quorums have to overlap. That is the whole idea, and
            everything else is bookkeeping.
          </p>
        ) : null}

        {/* controls */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stage/85 to-transparent px-4 pt-10 pb-3">
          <div className="group relative mb-2.5 h-1 cursor-pointer rounded-full bg-stage-ink/20">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-stage-ink/30"
              style={{ width: "72%" }}
            />
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-brand"
              style={{ width: `${pos}%` }}
            />
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100"
              style={{ left: `${pos}%` }}
            />
            {CHAPTERS.map((c) => (
              <span
                key={c.at}
                title={c.label}
                className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-stage-ink/70"
                style={{ left: `${c.at}%` }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-stage-ink/85">
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              className="grid size-8 place-items-center rounded-full hover:bg-stage-ink/12"
            >
              {playing ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
            </button>
            <button
              onClick={() => setPos((p) => Math.max(0, p - 6))}
              aria-label="Back 10 seconds"
              className="grid size-8 place-items-center rounded-full hover:bg-stage-ink/12"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={() => setPos((p) => Math.min(100, p + 6))}
              aria-label="Forward 10 seconds"
              className="grid size-8 place-items-center rounded-full hover:bg-stage-ink/12"
            >
              <RotateCw className="size-4" />
            </button>
            <Volume2 className="ml-1 size-4" />
            <span className="ml-1.5 text-[12px] tnum">
              {clock(pos)} / {clock(100)}
            </span>
            <span className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setSpeed((s) => (s >= 2 ? 0.75 : s + 0.25))}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium hover:bg-stage-ink/12 tnum"
              >
                <Gauge className="size-3.5" />
                {speed}×
              </button>
              <button
                onClick={() => setCaptions((c) => !c)}
                aria-label="Captions"
                className={cn(
                  "grid size-8 place-items-center rounded-full hover:bg-stage-ink/12",
                  captions && "text-brand",
                )}
              >
                <Captions className="size-4" />
              </button>
              <button
                aria-label="Fullscreen"
                className="grid size-8 place-items-center rounded-full hover:bg-stage-ink/12"
              >
                <Maximize2 className="size-4" />
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* chapters */}
      <div className="scrollbar-none flex gap-2 overflow-x-auto border-t border-line px-4 py-3">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.at}
            onClick={() => setPos(c.at + 1)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              pos >= c.at && (CHAPTERS[i + 1] ? pos < CHAPTERS[i + 1].at : true)
                ? "border-brand-line bg-brand-soft text-brand"
                : "border-line bg-surface text-ink-3 hover:text-ink",
            )}
          >
            <span className="mr-1.5 tnum opacity-60">{clock(c.at)}</span>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- article */

export function ArticleViewer({ lesson }: { lesson: Lesson }) {
  return (
    <article className={cn(frame, "px-6 py-8 sm:px-10 sm:py-11")}>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
        Reading · {lesson.minutes} min
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.6rem,1.3rem+1.2vw,2.25rem)] leading-[1.12] tracking-[var(--display-tracking)] text-ink">
        {lesson.title}
      </h2>

      <div className="mt-6 max-w-[62ch] space-y-5 text-[15.5px] leading-[1.75] text-ink-2">
        <p className="first-letter:float-left first-letter:mt-1 first-letter:mr-2.5 first-letter:font-display first-letter:text-[3.3rem] first-letter:leading-[0.82] first-letter:text-ink">
          Every distributed system that has ever lost data lost it in the gap
          between what the design assumed about the network and what the network
          actually did. The assumptions are rarely written down, which is
          precisely why they survive review.
        </p>
        <p>
          The eight fallacies were written in 1994 and people quote them as if
          they were a historical curiosity. They are not. The network is still
          not reliable, latency is still not zero, and bandwidth is still finite
          — the numbers moved, the shape did not.
        </p>

        <blockquote className="my-7 border-l-2 border-brand pl-5 font-display text-[1.35rem] leading-[1.45] text-ink">
          A failure detector cannot be both complete and accurate in an
          asynchronous network. Every production system picks one and lives with
          the consequence of the other.
        </blockquote>

        <p>
          Here is the practical version. Your health check has a timeout. Set it
          short and you will evict healthy nodes during a GC pause. Set it long
          and a dead node keeps taking traffic. There is no third option, and
          the interesting engineering is entirely in what you do about it.
        </p>

        <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 font-mono text-[12.5px] leading-relaxed text-ink-2">
{`// Phi-accrual: report suspicion as a number, not a boolean.
// The caller decides the threshold, because the caller knows
// the cost of being wrong in each direction.
func (d *Detector) Suspicion(now time.Time) float64 {
    delta := now.Sub(d.lastHeartbeat).Seconds()
    return -math.Log10(1 - d.dist.CDF(delta))
}`}
        </pre>

        <p>
          Returning a number instead of a boolean is the whole trick. A load
          balancer can act at suspicion 2. A leader election, where being wrong
          costs you a split brain, waits until 8.
        </p>
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button variant="secondary" size="sm">
          <Download className="size-3.5" /> Save as PDF
        </Button>
        <Button variant="ghost" size="sm">
          <ExternalLink className="size-3.5" /> Original paper
        </Button>
        <span className="ml-auto text-[12px] text-ink-3">
          Est. reading time {lesson.minutes} minutes
        </span>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ pdf */

export function PdfViewer({ lesson }: { lesson: Lesson }) {
  const [page, setPage] = useState(1);
  const pages = 14;
  return (
    <div className={frame}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <FileText className="size-4 shrink-0 text-rose" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
          {lesson.title}.pdf
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
            className="grid size-7 place-items-center rounded-[var(--radius-xs)] text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[12px] text-ink-2 tnum">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            aria-label="Next page"
            className="grid size-7 place-items-center rounded-[var(--radius-xs)] text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <Button variant="secondary" size="xs">
          <Download className="size-3.5" /> Download
        </Button>
      </div>

      <div className="grid gap-0 bg-surface-2 sm:grid-cols-[10rem_1fr]">
        <div className="scrollbar-slim hidden max-h-[36rem] gap-2 overflow-y-auto border-r border-line p-3 sm:flex sm:flex-col">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={cn(
                "shrink-0 rounded-[6px] border-2 bg-surface p-1.5 text-left transition-colors",
                page === i + 1 ? "border-brand" : "border-transparent hover:border-line-strong",
              )}
            >
              <span className="block aspect-[1/1.3] rounded-[3px] bg-surface-2 p-2">
                <span className="block h-1 w-2/3 rounded-full bg-line-strong" />
                <span className="mt-1.5 block h-0.5 w-full rounded-full bg-line" />
                <span className="mt-1 block h-0.5 w-full rounded-full bg-line" />
                <span className="mt-1 block h-0.5 w-4/5 rounded-full bg-line" />
              </span>
              <span className="mt-1 block text-center text-[10.5px] text-ink-3 tnum">
                {i + 1}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-8">
          <div className="mx-auto aspect-[1/1.294] w-full max-w-[34rem] rounded-[4px] bg-white p-8 shadow-[var(--shadow-e3)] sm:p-11">
            <p className="font-mono text-[10px] tracking-[0.14em] text-neutral-400 uppercase">
              Northwind Learning · page {page}
            </p>
            <h3 className="mt-5 font-display text-[1.5rem] leading-tight tracking-[var(--display-tracking)] text-neutral-900">
              Quorum sizing cheat sheet
            </h3>
            <p className="mt-3 text-[12.5px] leading-relaxed text-neutral-600">
              Read and write quorums must intersect. For a cluster of N nodes,
              pick R and W so that R + W &gt; N, and W &gt; N/2 if you also want
              write-write conflict freedom.
            </p>
            <table className="mt-5 w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="py-1.5 font-medium">N</th>
                  <th className="py-1.5 font-medium">W</th>
                  <th className="py-1.5 font-medium">R</th>
                  <th className="py-1.5 font-medium">Tolerates</th>
                </tr>
              </thead>
              <tbody className="text-neutral-700">
                {[
                  [3, 2, 2, 1],
                  [5, 3, 3, 2],
                  [7, 4, 4, 3],
                ].map((r) => (
                  <tr key={r[0]} className="border-b border-neutral-200">
                    {r.map((v, i) => (
                      <td key={i} className="py-1.5 tabular-nums">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">
              Note: tolerance counts node failures, not partitions. A 5-node
              cluster split 3/2 keeps serving from the majority side only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- slides */

export function SlidesViewer({ lesson }: { lesson: Lesson }) {
  const slides = [
    { t: "Component review checklist", s: "Six questions before a component ships" },
    { t: "1. Does it own its own layout?", s: "Margins belong to the parent" },
    { t: "2. Can it be themed without a fork?", s: "Semantic tokens only" },
    { t: "3. Is the accessible name derivable?", s: "From props, not from children" },
    { t: "4. How many variants exist?", s: "Finite, enumerated, documented" },
    { t: "5. What happens with no data?", s: "Empty state is part of the API" },
    { t: "6. Who owns the next change?", s: "Contribution path, in writing" },
  ];
  const [i, setI] = useState(0);
  return (
    <div className={frame}>
      <div className="relative aspect-[16/9] bg-surface-inv">
        <div className="absolute inset-0 grid place-items-center px-10 text-center sm:px-16">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-inv/45 uppercase">
              {lesson.title}
            </p>
            <h3 className="mt-5 font-display text-[clamp(1.5rem,1rem+2.4vw,2.6rem)] leading-[1.1] tracking-[var(--display-tracking)] text-ink-inv">
              {slides[i].t}
            </h3>
            <p className="mt-4 text-[14.5px] text-ink-inv/55">{slides[i].s}</p>
          </div>
        </div>
        <span className="absolute right-5 bottom-4 text-[11.5px] text-ink-inv/40 tnum">
          {i + 1} / {slides.length}
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <button
          onClick={() => setI((n) => Math.max(0, n - 1))}
          aria-label="Previous slide"
          className="grid size-8 place-items-center rounded-[var(--radius-sm)] border border-line text-ink-2 hover:bg-surface-2"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="scrollbar-none flex flex-1 gap-1.5 overflow-x-auto">
          {slides.map((s, n) => (
            <button
              key={s.t}
              onClick={() => setI(n)}
              title={s.t}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                n === i ? "bg-brand" : n < i ? "bg-line-strong" : "bg-surface-3",
              )}
            />
          ))}
        </div>
        <button
          onClick={() => setI((n) => Math.min(slides.length - 1, n + 1))}
          aria-label="Next slide"
          className="grid size-8 place-items-center rounded-[var(--radius-sm)] border border-line text-ink-2 hover:bg-surface-2"
        >
          <ChevronRight className="size-4" />
        </button>
        <Button variant="secondary" size="xs">
          <Download className="size-3.5" /> Deck
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- scorm and xapi */

export function PackageViewer({ lesson }: { lesson: Lesson }) {
  const meta = lesson.packageMeta;
  const isXapi = lesson.type === "xapi";
  const [launched, setLaunched] = useState(false);

  return (
    <div className="space-y-4">
      <div className={frame}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
          <Package className="size-4 shrink-0 text-violet" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
            {meta?.version ?? "SCORM 2004"} package
          </span>
          <Badge tone={launched ? "jade" : "neutral"} dot>
            {launched ? "Attempt open" : "Not launched"}
          </Badge>
          <Button variant="secondary" size="xs">
            <ExternalLink className="size-3.5" /> New window
          </Button>
        </div>

        <div className="relative aspect-video bg-surface-2">
          {launched ? (
            <div className="absolute inset-0 grid place-items-center p-8">
              <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-center shadow-[var(--shadow-e2)]">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                  Interaction 3 of 8
                </p>
                <h3 className="mt-3 font-display text-[1.5rem] leading-tight tracking-[var(--display-tracking)] text-ink">
                  A customer asks you to delete their support history
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  Some of it is needed for an open fraud investigation. What do
                  you do first?
                </p>
                <div className="mt-4 grid gap-2 text-left">
                  {[
                    "Delete everything, the request is absolute",
                    "Confirm identity, then scope the erasure against the legal hold",
                    "Refuse, because there is an investigation",
                  ].map((o, i) => (
                    <button
                      key={o}
                      className="rounded-[var(--radius-md)] border border-line bg-surface px-3.5 py-2.5 text-left text-[13px] text-ink-2 transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                    >
                      <span className="mr-2 font-mono text-[11.5px] text-ink-3">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setLaunched(true)}
              className="group absolute inset-0 grid place-items-center"
            >
              <span className="flex flex-col items-center">
                <span className="grid size-14 place-items-center rounded-full bg-surface-inv text-ink-inv shadow-[var(--shadow-e3)] transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-108">
                  <Play className="ml-0.5 size-5 fill-current" />
                </span>
                <span className="mt-4 text-[13.5px] font-medium text-ink">
                  Launch package
                </span>
                <span className="mt-1 text-[12px] text-ink-3 tnum">
                  {meta?.size} · opens in a sandboxed frame
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* The runtime panel is what separates a real LMS from a video site. */}
      <div className={cn(frame, "p-4.5")}>
        <p className="text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
          {isXapi ? "xAPI statements" : "SCORM runtime data"}
        </p>
        <dl className="mt-2.5">
          {isXapi ? (
            <>
              <DataRow label="Endpoint">
                <span className="font-mono text-[12px]">lrs.northwind.co/xapi</span>
              </DataRow>
              <DataRow label="Statements this attempt">
                <span className="tnum">{launched ? 4 : 0}</span>
              </DataRow>
              <DataRow label="Completion verb">
                <span className="font-mono text-[11.5px]">{meta?.completionRule}</span>
              </DataRow>
              <DataRow label="Actor">
                <span className="font-mono text-[12px]">mbox:anaya.rao@northwind.co</span>
              </DataRow>
            </>
          ) : (
            <>
              <DataRow label="cmi.completion_status">
                <span className="font-mono text-[12px]">
                  {launched ? "incomplete" : "not attempted"}
                </span>
              </DataRow>
              <DataRow label="cmi.success_status">
                <span className="font-mono text-[12px]">unknown</span>
              </DataRow>
              <DataRow label="cmi.score.scaled">
                <span className="font-mono text-[12px] tnum">
                  {launched ? "0.375" : "—"}
                </span>
              </DataRow>
              <DataRow label="cmi.suspend_data">
                <span className="font-mono text-[12px] tnum">
                  {launched ? "1.2 KB of 64 KB" : "empty"}
                </span>
              </DataRow>
              <DataRow label="Completion rule">
                <span className="font-mono text-[11.5px]">{meta?.completionRule}</span>
              </DataRow>
            </>
          )}
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
          Progress is committed on every interaction, not on exit. Closing the
          tab mid-attempt keeps everything you have answered so far.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ lab */

/* The guided lab grades what the learner typed, not a canned transcript. A
   prototype has no Go toolchain, so each test is a structural check on the
   editor text with comments stripped and whitespace collapsed. The starter
   fails all three, the reference passes all three, and comparing the index
   before the term fails the ordering test, as the real suite would. */

const LAB_STARTER = `package raft

func (n *Node) canGrantVote(candTerm, candLastIdx, candLastTerm int) bool {
\tif candTerm < n.currentTerm {
\t\treturn false
\t}
\t// TODO: implement the log up-to-date check
\treturn false
}
`;

const LAB_SOLUTION = `package raft

func (n *Node) canGrantVote(candTerm, candLastIdx, candLastTerm int) bool {
\tif candTerm < n.currentTerm {
\t\treturn false
\t}
\tmyLastTerm := n.log.LastTerm()
\tif candLastTerm != myLastTerm {
\t\treturn candLastTerm > myLastTerm
\t}
\treturn candLastIdx >= n.log.LastIndex()
}
`;

const LAB_TEST_FILE = `package raft

import "testing"

// Every log below ends at index 4. Only the terms in it change.

func TestVoteGrantedHigherTerm(t *testing.T) {
\tn := newNode(5, logOf(1, 1, 2, 2))
\tif !n.canGrantVote(5, 2, 3) {
\t\tt.Fatal("denied a candidate whose last term is higher")
\t}
}

func TestVoteDeniedShorterLog(t *testing.T) {
\tn := newNode(5, logOf(1, 2, 2, 2))
\tif n.canGrantVote(5, 3, 2) {
\t\tt.Fatal("granted a vote to a candidate with a shorter log")
\t}
\tif !n.canGrantVote(5, 4, 2) {
\t\tt.Fatal("denied a candidate whose log is exactly as long")
\t}
}

func TestVoteTieBrokenByIndex(t *testing.T) {
\tn := newNode(5, logOf(1, 1, 3, 3))
\tif n.canGrantVote(5, 9, 2) {
\t\tt.Fatal("a longer log with a lower last term won the vote")
\t}
\tif !n.canGrantVote(5, 5, 3) {
\t\tt.Fatal("equal last terms and a longer log, yet the vote was denied")
\t}
}`;

type LabTestName =
  | "TestVoteGrantedHigherTerm"
  | "TestVoteDeniedShorterLog"
  | "TestVoteTieBrokenByIndex";

type LabTest = { name: LabTestName; secs: string; pass: boolean; failure?: string };
type LabReport = { tests: LabTest[]; buildError?: string };

const LAB_TESTS: { name: LabTestName; secs: string }[] = [
  { name: "TestVoteGrantedHigherTerm", secs: "0.02s" },
  { name: "TestVoteDeniedShorterLog", secs: "0.01s" },
  { name: "TestVoteTieBrokenByIndex", secs: "0.01s" },
];

/** A t.Fatal message prefixed with its line, the way go test prints it. */
function labFatal(msg: string) {
  const line = LAB_TEST_FILE.split("\n").findIndex((l) => l.includes(msg)) + 1;
  return `raft_test.go:${line}: ${msg}`;
}

function normaliseGo(src: string) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The body of canGrantVote, or null when it is missing or never closes. */
function voteBody(code: string) {
  const sig = code.search(/\bfunc\s*\([^)]*\)\s*canGrantVote\s*\(/);
  const open = sig < 0 ? -1 : code.indexOf("{", sig);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}" && --depth === 0) return code.slice(open + 1, i).trim();
  }
  return null;
}

/** The node's own last term or index: the call itself, or a local holding it. */
function ownRef(body: string, method: "LastTerm" | "LastIndex", names: string[]) {
  const call = `\\w+\\.log\\.${method}\\(\\)`;
  const assigned = new RegExp(`\\b(\\w+)(?:\\s+int)?\\s*:?=\\s*${call}`, "g");
  const locals = Array.from(body.matchAll(assigned), (m) => m[1]);
  return `(?:${call}|${[...names, ...locals].map((n) => `\\b${n}\\b`).join("|")})`;
}

function gradeLab(src: string): LabReport {
  const code = normaliseGo(src);
  const body = voteBody(code);
  if (body === null) {
    return {
      tests: [],
      buildError: code.includes("canGrantVote")
        ? "./raft.go: syntax error: unexpected EOF, expected }"
        : "./raft.go: n.canGrantVote undefined",
    };
  }

  const op = "(?:==|!=|>=|<=|>|<)";
  const term = ownRef(body, "LastTerm", ["myLastTerm"]);
  const index = ownRef(body, "LastIndex", ["myLastIdx", "myLastIndex"]);
  const deny = "\\)?\\s*\\{\\s*return false\\b";

  // Any comparison of the two last terms counts. Whether it runs early
  // enough is the ordering test's job.
  const termAt = body.search(
    new RegExp(`\\bcandLastTerm\\s*${op}\\s*${term}|${term}\\s*${op}\\s*candLastTerm\\b`),
  );
  // The index must grant on >= or deny on <. A strict > turns away an
  // equally long log, which is its own bug.
  const indexAt = body.search(
    new RegExp(
      [
        `\\bcandLastIdx\\s*>=\\s*${index}`,
        `${index}\\s*<=\\s*candLastIdx\\b`,
        `\\bcandLastIdx\\s*<\\s*${index}${deny}`,
        `${index}\\s*>\\s*candLastIdx\\b${deny}`,
      ].join("|"),
    ),
  );
  const endsDenying = /\breturn false;?$/.test(body);
  const indexFirst = indexAt >= 0 && (termAt < 0 || indexAt < termAt);

  const pass: Record<LabTestName, boolean> = {
    TestVoteGrantedHigherTerm: termAt >= 0,
    TestVoteDeniedShorterLog: indexAt >= 0,
    TestVoteTieBrokenByIndex: termAt >= 0 && indexAt > termAt && !endsDenying,
  };
  const failure: Record<LabTestName, string> = {
    TestVoteGrantedHigherTerm: labFatal("denied a candidate whose last term is higher"),
    TestVoteDeniedShorterLog: labFatal("denied a candidate whose log is exactly as long"),
    TestVoteTieBrokenByIndex: labFatal(
      indexFirst
        ? "a longer log with a lower last term won the vote"
        : "equal last terms and a longer log, yet the vote was denied",
    ),
  };
  return {
    tests: LAB_TESTS.map((t) => ({ ...t, pass: pass[t.name], failure: failure[t.name] })),
  };
}

const LAB_STEPS: { test: LabTestName; title: string; detail: string }[] = [
  {
    test: "TestVoteGrantedHigherTerm",
    title: "Compare last log terms",
    detail: "A candidate whose last term is higher wins, however short its log.",
  },
  {
    test: "TestVoteDeniedShorterLog",
    title: "Use the index only on a tie",
    detail: "With equal terms, grant only if its log is at least as long as yours.",
  },
  {
    test: "TestVoteTieBrokenByIndex",
    title: "Check the term first",
    detail: "Term before index, with no placeholder return false left at the end.",
  },
];

/* Backticks mark inline code; LabHints renders them as <code>. */
const LAB_HINTS = [
  "Read your own last term with `n.log.LastTerm()` and compare it with `candLastTerm`. If they differ, the higher term wins outright.",
  "Only equal terms reach the index. Grant when `candLastIdx >= n.log.LastIndex()`, so a log exactly as long as yours still gets the vote.",
  "Order is the whole exercise: `if candLastTerm != myLastTerm { return candLastTerm > myLastTerm }`, then return the index check.",
];

const LAB_PANES = [
  { id: "yours", label: "Your result" },
  { id: "expected", label: "Expected result" },
];

const LAB_EXPECTED: LabReport = { tests: LAB_TESTS.map((t) => ({ ...t, pass: true })) };

export function LabViewer({ lesson }: { lesson: Lesson }) {
  // Keyed by lesson so moving to the next lab starts a clean attempt instead
  // of inheriting this one's code, hints and practice flag.
  return <GuidedLab key={lesson.id} lesson={lesson} />;
}

function GuidedLab({ lesson }: { lesson: Lesson }) {
  const [file, setFile] = useState<"raft.go" | "raft_test.go">("raft.go");
  const [code, setCode] = useState(LAB_STARTER);
  const [queued, setQueued] = useState<string | null>(null);
  const [run, setRun] = useState<{ code: string; report: LabReport } | null>(null);
  const [pane, setPane] = useState("yours");
  const [hints, setHints] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [practice, setPractice] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const escaped = useRef(false);
  const helpId = useId();

  // A run grades the code as it was when Run was pressed, so typing during
  // the delay changes nothing. Clearing `queued` (reset, show answer,
  // unmount) cancels the timer.
  useEffect(() => {
    if (queued === null) return;
    const t = window.setTimeout(() => {
      setRun({ code: queued, report: gradeLab(queued) });
      setQueued(null);
    }, 600);
    return () => window.clearTimeout(t);
  }, [queued]);

  const running = queued !== null;
  const report = run?.report;
  const total = LAB_TESTS.length;
  const passing = report?.tests.filter((t) => t.pass).length ?? 0;
  // Green tests unlock submit only for the code they actually ran against.
  const stale = run !== null && run.code !== code;
  const canSubmit = passing === total && !stale && !running && !submitted;
  const lines = code.split("\n").length;
  const passed = (test: LabTestName) =>
    report?.tests.some((t) => t.name === test && t.pass) ?? false;

  const clearRun = () => {
    setRun(null);
    setQueued(null);
    setConfirming(false);
    setFile("raft.go");
    setPane("yours");
  };
  const reset = () => {
    setCode(LAB_STARTER);
    clearRun();
  };
  const showAnswer = () => {
    setCode(LAB_SOLUTION);
    setPractice(true);
    clearRun();
  };

  // Tab indents. Escape first hands Tab back to the browser so keyboard users
  // are never trapped in the editor.
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && !e.shiftKey && !escaped.current && !submitted) {
      e.preventDefault();
      const el = e.currentTarget;
      el.setRangeText("\t", el.selectionStart, el.selectionEnd, "end");
      setCode(el.value);
    }
    escaped.current = e.key === "Escape";
  };

  return (
    <div className="@container">
      <div className={cn(frame, "grid @4xl:grid-cols-[19rem_minmax(0,1fr)]")}>
        {/* instructions */}
        <section className="min-w-0 border-b border-line p-5 @4xl:border-r @4xl:border-b-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="jade">Guided lab</Badge>
            {submitted ? (
              <Badge tone="jade" dot>
                Submitted
              </Badge>
            ) : null}
            {practice ? (
              <Badge tone="amber" dot>
                Practice · no points
              </Badge>
            ) : null}
            <span className="text-[12px] text-ink-3 tnum">{lesson.minutes} min</span>
          </div>
          <h2 className="mt-3.5 font-display text-[1.4rem] leading-[1.15] tracking-[var(--display-tracking)] text-ink">
            Grant a vote only to an up-to-date log
          </h2>
          <div className="mt-2.5 space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
            <p>
              Implement <LabCode>canGrantVote</LabCode>. A follower votes only for
              a candidate whose log is at least as up to date as its own. Compare
              last log <em>terms</em> first. The index only breaks a tie.
            </p>
            <p>
              Getting this backwards is the most common Raft bug, and it hides
              until an election runs during a partition.
            </p>
          </div>

          <p className="mt-5 text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
            Steps
          </p>
          <ol className="mt-2.5 space-y-3">
            {LAB_STEPS.map((s, i) => {
              const done = passed(s.test);
              return (
                <li key={s.test} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors tnum",
                      done ? "bg-jade text-on-accent" : "border border-line-strong text-ink-3",
                    )}
                  >
                    {done ? <Check className="size-3" strokeWidth={3.5} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-ink">
                      {s.title}
                      <span className="sr-only">{done ? ", passing" : ", not passing yet"}</span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">
                      {s.detail}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-ink-3">
                      {s.test}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          <LabHints
            count={hints}
            showEmpty
            className="mt-5 hidden border-t border-line pt-4 @4xl:block"
          />
        </section>

        {/* editor, actions and result */}
        <div className="flex min-w-0 flex-col">
          <div className="scrollbar-none flex items-center gap-1 overflow-x-auto border-b border-line bg-surface-2 px-2 py-1.5">
            {(["raft.go", "raft_test.go"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFile(f)}
                aria-pressed={file === f}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1.5 font-mono text-[12px] transition-colors",
                  file === f
                    ? "bg-surface text-ink shadow-[var(--shadow-e1)]"
                    : "text-ink-3 hover:text-ink",
                )}
              >
                {f === "raft_test.go" ? <Lock className="size-3" /> : null}
                {f}
                {f === "raft.go" && code !== LAB_STARTER ? (
                  <span className="size-1.5 rounded-full bg-brand" title="Edited" />
                ) : null}
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 pr-1.5 text-[11.5px] text-ink-3 @md:block">
              {file === "raft_test.go" || submitted ? "Read only" : "Go 1.23 · Tab indents"}
            </span>
          </div>

          {file === "raft.go" ? (
            <div className="flex bg-stage focus-within:shadow-[inset_0_0_0_1px_var(--stage-brand)]">
              <LabGutter count={lines} />
              <textarea
                aria-label="raft.go"
                aria-describedby={helpId}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={onKeyDown}
                readOnly={submitted}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                wrap="off"
                rows={Math.max(lines + 1, 12)}
                className="scrollbar-slim block min-w-0 flex-1 resize-none overflow-x-auto overflow-y-hidden bg-transparent py-4 pr-4 font-mono text-[12.5px] leading-[1.7] whitespace-pre text-stage-ink caret-stage-brand [tab-size:4] focus:outline-none"
              />
              <p id={helpId} className="sr-only">
                Tab inserts a tab. Press Escape, then Tab, to leave the editor.
              </p>
            </div>
          ) : (
            <div className="scrollbar-slim flex max-h-[26rem] overflow-y-auto bg-stage">
              <LabGutter count={LAB_TEST_FILE.split("\n").length} />
              <pre className="scrollbar-slim min-w-0 flex-1 overflow-x-auto py-4 pr-4 font-mono text-[12.5px] leading-[1.7] text-stage-ink-2 [tab-size:4]">
                {LAB_TEST_FILE}
              </pre>
            </div>
          )}

          <div aria-live="polite" className="border-t border-line px-3 py-2.5">
            {submitted ? (
              <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-jade-soft px-3.5 py-3">
                <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-jade" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink tnum">
                    Answer submitted · {total} of {total} tests passing
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
                    {practice
                      ? "Saved as a practice attempt because the answer was shown, so no points were awarded."
                      : "Lesson marked complete. Your code and its test output are saved with the attempt."}
                  </p>
                </div>
              </div>
            ) : confirming ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[var(--radius-md)] bg-amber-soft px-3.5 py-2.5">
                <TriangleAlert className="size-4 shrink-0 text-amber" />
                <p className="min-w-0 flex-1 basis-52 text-[13px] leading-snug text-ink">
                  <span className="font-semibold">Show the answer?</span> This
                  attempt becomes practice only and earns no points.
                </p>
                <div className="ml-auto flex gap-2">
                  <Button size="xs" variant="ghost" onClick={() => setConfirming(false)}>
                    Keep trying
                  </Button>
                  <Button size="xs" variant="secondary" onClick={showAnswer}>
                    <Eye className="size-3.5" /> Show answer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                <Button size="xs" variant="ghost" onClick={reset}>
                  <RotateCcw className="size-3.5" /> Reset
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setHints((h) => Math.min(LAB_HINTS.length, h + 1))}
                  disabled={hints >= LAB_HINTS.length}
                >
                  <Lightbulb className="size-3.5" /> Help me
                  <span className="text-ink-3 tnum">
                    {hints}/{LAB_HINTS.length}
                  </span>
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  // Once the answer has been seen there is nothing left to warn about.
                  onClick={practice ? showAnswer : () => setConfirming(true)}
                >
                  <Eye className="size-3.5" /> Show answer
                </Button>
                <div className="ml-auto flex gap-2">
                  {/* The filled button is always the next useful step. */}
                  <Button
                    size="xs"
                    variant={canSubmit ? "secondary" : "primary"}
                    onClick={() => {
                      setPane("yours");
                      setQueued(code);
                    }}
                    disabled={running}
                  >
                    {running ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Terminal className="size-3.5" />
                    )}
                    {running ? "Running…" : "Run tests"}
                  </Button>
                  <Button
                    size="xs"
                    variant={canSubmit ? "primary" : "secondary"}
                    onClick={() => setSubmitted(true)}
                    disabled={!canSubmit}
                  >
                    <Send className="size-3.5" /> Submit answer
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Stacked, the instructions are a screen away; show hints beside the code. */}
          <LabHints count={hints} className="border-t border-line px-4 py-3.5 @4xl:hidden" />

          <div className="border-t border-line px-4 pt-3 pb-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Segmented size="sm" items={LAB_PANES} value={pane} onChange={setPane} />
              {pane === "yours" && report && !running ? (
                <span className="ml-auto flex items-center gap-2">
                  {stale ? (
                    <span className="text-[12px] text-ink-3">Edited since this run</span>
                  ) : null}
                  <Badge
                    tone={
                      report.buildError || passing === 0
                        ? "rose"
                        : passing === total
                          ? "jade"
                          : "amber"
                    }
                    dot
                  >
                    <span className="tnum">
                      {report.buildError ? "Build failed" : `${passing} of ${total} passing`}
                    </span>
                  </Badge>
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              {pane === "expected" ? (
                <>
                  <LabOutput report={LAB_EXPECTED} />
                  <p className="mt-2 text-[12px] text-ink-3">
                    A correct canGrantVote prints this. Match it, then submit.
                  </p>
                </>
              ) : running ? (
                <div
                  role="status"
                  className="min-h-[8.5rem] rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 font-mono text-[12px] leading-relaxed"
                >
                  <p className="text-ink-3">$ go test -run TestVote ./raft</p>
                  <p className="mt-1.5 flex items-center gap-2 text-ink-2">
                    <LoaderCircle className="size-3.5 animate-spin text-brand" /> Running
                    tests…
                  </p>
                </div>
              ) : report ? (
                <LabOutput report={report} />
              ) : (
                <div className="grid place-items-center rounded-[var(--radius-md)] border border-dashed border-line-strong bg-surface-2/50 px-5 py-7 text-center">
                  <span className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-[var(--shadow-e1)]">
                    <Terminal className="size-4" />
                  </span>
                  <p className="mt-3 text-[13.5px] font-medium text-ink">No result yet</p>
                  <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-ink-3">
                    Run the tests to check your code. Submit answer unlocks when
                    all three pass.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[var(--radius-xs)] bg-surface-3 px-1 py-px font-mono text-[12px] text-ink">
      {children}
    </code>
  );
}

function LabGutter({ count }: { count: number }) {
  return (
    <div
      aria-hidden
      className="shrink-0 py-4 pr-3 pl-4 text-right font-mono text-[12.5px] leading-[1.7] text-stage-ink-3 select-none tnum"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="min-w-[2ch]">
          {i + 1}
        </div>
      ))}
    </div>
  );
}

function LabHints({
  count,
  showEmpty = false,
  className,
}: {
  count: number;
  showEmpty?: boolean;
  className?: string;
}) {
  if (count === 0 && !showEmpty) return null;
  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
        <Lightbulb className="size-3.5" /> Hints
      </p>
      {count === 0 ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          Stuck? Help me reveals one hint at a time. Hints are free, showing the
          answer is not.
        </p>
      ) : (
        <ol className="mt-2.5 space-y-2">
          {LAB_HINTS.slice(0, count).map((hint, i) => (
            <li
              key={i}
              className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5"
            >
              <p className="text-[11.5px] font-semibold text-amber tnum">
                Hint {i + 1} of {LAB_HINTS.length}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
                {hint
                  .split("`")
                  .map((part, j) => (j % 2 ? <LabCode key={j}>{part}</LabCode> : part))}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** go test output, one row per test. */
function LabOutput({ report }: { report: LabReport }) {
  const ok = !report.buildError && report.tests.every((t) => t.pass);
  return (
    <div className="scrollbar-slim overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 font-mono text-[12px] leading-relaxed">
      <p className="whitespace-nowrap text-ink-3">$ go test -run TestVote ./raft</p>
      {report.buildError ? (
        <p className="mt-1.5 whitespace-pre text-rose">{`# raft\n${report.buildError}`}</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {report.tests.map((t) => (
            <li key={t.name}>
              <p
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  t.pass ? "text-jade" : "text-rose",
                )}
              >
                {t.pass ? (
                  <CircleCheck className="size-3.5 shrink-0" />
                ) : (
                  <CircleX className="size-3.5 shrink-0" />
                )}
                <span>
                  --- {t.pass ? "PASS" : "FAIL"}: {t.name}
                </span>
                <span className="text-ink-3 tnum">({t.secs})</span>
              </p>
              {t.pass ? null : (
                <p className="pl-5.5 text-ink-2 [overflow-wrap:anywhere]">{t.failure}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p
        className={cn(
          "mt-2 border-t border-line pt-2 whitespace-pre tnum",
          ok ? "text-jade" : "text-rose",
        )}
      >
        {ok
          ? "ok    raft  0.04s"
          : report.buildError
            ? "FAIL  raft  [build failed]"
            : "FAIL  raft  0.04s"}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- assignment */

export function AssignmentViewer({
  lesson,
  course,
}: {
  lesson: Lesson;
  course: Course;
}) {
  const [file, setFile] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className={cn(frame, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="violet">Assignment</Badge>
          <span className="text-[12px] text-ink-3">
            Due 28 September, 23:59 IST
          </span>
          <span className="ml-auto text-[12px] text-ink-3 tnum">
            1 attempt · graded against a rubric
          </span>
        </div>
        <h2 className="mt-3 font-display text-[1.6rem] leading-tight tracking-[var(--display-tracking)] text-ink">
          {lesson.title}
        </h2>
        <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          Submit a design document for the replicated key-value store you built
          in module 3. Cover the consistency model you chose, behaviour under a
          network partition, the operational signals you would alert on, and one
          alternative you considered and rejected.
        </p>

        <div className="mt-5 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
          <p className="text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
            How this is marked
          </p>
          <ul className="mt-2.5 space-y-2">
            {[
              ["Correctness under partition", 12],
              ["Trade-off reasoning", 10],
              ["Operability", 10],
              ["Communication", 8],
            ].map(([name, pts]) => (
              <li
                key={name as string}
                className="flex items-baseline justify-between text-[13px]"
              >
                <span className="text-ink-2">{name}</span>
                <span className="text-ink-3 tnum">{pts} pts</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-2.5 text-[12px] text-ink-3">
            Pass mark {course.certificate ? 70 : 60}% · full rubric visible
            before you submit, not after
          </p>
        </div>
      </div>

      <label
        className={cn(
          frame,
          "grid cursor-pointer place-items-center border-dashed px-6 py-12 text-center transition-colors hover:border-brand hover:bg-brand-soft/40",
        )}
      >
        <input
          type="file"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0]?.name ?? "design-doc.pdf")}
        />
        <Upload className="size-6 text-ink-3" />
        <p className="mt-3 text-[14px] font-medium text-ink">
          {file ?? "Drop your document here"}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-3">
          PDF, Markdown or a link to a doc · up to 25 MB
        </p>
        {file ? (
          <span className="mt-4">
            <Button size="sm">Submit for grading</Button>
          </span>
        ) : null}
      </label>
    </div>
  );
}

/* ----------------------------------------------------------------- live */

export function LiveViewer({ lesson }: { lesson: Lesson }) {
  return (
    <div className={frame}>
      <div className="relative overflow-hidden bg-surface-inv px-6 py-10 sm:px-10 sm:py-14">
        <div className="grain absolute inset-0" />
        <div
          className="absolute -top-24 -right-16 size-80 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle,var(--stage-ember),transparent 70%)" }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-stage-ink/15 bg-stage-ink/8 px-3 py-1 text-[11.5px] font-medium text-ink-inv/80">
            <LiveDot /> Starts tomorrow, 16:00 IST
          </span>
          <h2 className="mt-5 max-w-lg font-display text-[clamp(1.6rem,1.2rem+1.5vw,2.4rem)] leading-[1.08] tracking-[var(--display-tracking)] text-ink-inv">
            {lesson.title}
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-inv/55">
            Marcus walks through a real split-brain incident from the metrics
            outward: what paged, what it looked like, and the three decisions
            that turned a 12-minute outage into a 4-hour one.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" variant="inverse">
              <Radio className="size-4" /> Add to calendar
            </Button>
            <span className="text-[12.5px] text-ink-inv/45 tnum">
              60 minutes · 42 registered · recorded
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
            Agenda
          </p>
          <ol className="mt-2.5 space-y-2">
            {[
              "The page: what the dashboard showed at 03:12",
              "Reconstructing the partition from three logs",
              "The decision that doubled the outage",
              "Open questions from the cohort",
            ].map((a, i) => (
              <li key={a} className="flex gap-2.5 text-[13.5px] text-ink-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-3 tnum">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
            Before you join
          </p>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
            Finish module 3. The session assumes you have implemented log
            replication and have opinions about the commit index.
          </p>
          <p className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-3">
            Cannot make it? The recording lands in this lesson within two hours
            and still counts for completion.
          </p>
        </div>
      </div>
    </div>
  );
}
