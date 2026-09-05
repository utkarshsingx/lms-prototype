"use client";

import { useState } from "react";
import {
  Captions,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Maximize2,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  RotateCw,
  Terminal,
  Upload,
  Volume2,
} from "lucide-react";
import type { Course, Lesson } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataRow } from "@/components/ui/misc";

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
      <div className="relative aspect-video bg-[#0d0f13]">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, #1d2740 0%, #0d0f13 62%)",
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
                  fill={i < 3 ? "#1f3a6b" : "#171a21"}
                  stroke={i < 3 ? "#7093ff" : "#3a4150"}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={i < 3 ? "#cfdcff" : "#6c737e"}
                  fontSize="11"
                  fontFamily="system-ui"
                >
                  n{i + 1}
                </text>
              </g>
            ))}
            <path
              d="M200 61 L300 75 M300 117 L262 157 M262 178 L138 178 M138 157 L100 117 M100 75 L200 61"
              stroke="#3a4150"
            />
            <path d="M200 61 L300 75 M300 117 L262 157" stroke="#7093ff" strokeWidth="2" />
          </g>
          <text
            x="200"
            y="212"
            textAnchor="middle"
            fill="#7093ff"
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
            <span className="grid size-16 place-items-center rounded-full bg-white/95 text-[#0d0f13] shadow-2xl transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-108">
              <Play className="ml-1 size-6 fill-current" />
            </span>
          </button>
        ) : null}

        {captions ? (
          <p className="absolute inset-x-0 bottom-16 mx-auto max-w-lg rounded-[var(--radius-sm)] bg-black/65 px-3 py-1.5 text-center text-[13px] leading-snug text-white/95">
            …so any two quorums have to overlap. That is the whole idea, and
            everything else is bookkeeping.
          </p>
        ) : null}

        {/* controls */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-10 pb-3">
          <div className="group relative mb-2.5 h-1 cursor-pointer rounded-full bg-white/20">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white/30"
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
                className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-white/70"
                style={{ left: `${c.at}%` }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-white/85">
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              className="grid size-8 place-items-center rounded-full hover:bg-white/12"
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
              className="grid size-8 place-items-center rounded-full hover:bg-white/12"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={() => setPos((p) => Math.min(100, p + 6))}
              aria-label="Forward 10 seconds"
              className="grid size-8 place-items-center rounded-full hover:bg-white/12"
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
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium hover:bg-white/12 tnum"
              >
                <Gauge className="size-3.5" />
                {speed}×
              </button>
              <button
                onClick={() => setCaptions((c) => !c)}
                aria-label="Captions"
                className={cn(
                  "grid size-8 place-items-center rounded-full hover:bg-white/12",
                  captions && "text-brand",
                )}
              >
                <Captions className="size-4" />
              </button>
              <button
                aria-label="Fullscreen"
                className="grid size-8 place-items-center rounded-full hover:bg-white/12"
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
      <h2 className="mt-3 font-display text-[clamp(1.6rem,1.3rem+1.2vw,2.25rem)] leading-[1.12] tracking-[-0.02em] text-ink">
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
            <h3 className="mt-5 font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-neutral-900">
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
            <h3 className="mt-5 font-display text-[clamp(1.5rem,1rem+2.4vw,2.6rem)] leading-[1.1] tracking-[-0.02em] text-ink-inv">
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
                <h3 className="mt-3 font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-ink">
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

export function LabViewer({ lesson }: { lesson: Lesson }) {
  const [ran, setRan] = useState(false);
  return (
    <div className="space-y-4">
      <div className={cn(frame, "p-5 sm:p-6")}>
        <div className="flex items-center gap-2.5">
          <Badge tone="jade">Lab</Badge>
          <span className="text-[12px] text-ink-3 tnum">
            Estimated {lesson.minutes} minutes
          </span>
        </div>
        <h2 className="mt-3 font-display text-[1.6rem] leading-tight tracking-[-0.018em] text-ink">
          {lesson.title}
        </h2>
        <div className="mt-3.5 max-w-[62ch] space-y-3 text-[14px] leading-relaxed text-ink-2">
          <p>
            A follower grants its vote only when the candidate&rsquo;s log is at
            least as up to date as its own. Compare last log <em>terms</em>{" "}
            first; the index only breaks a tie between equal terms.
          </p>
          <p>
            Getting the comparison backwards is the single most common Raft bug
            and it will not show up until an election happens during a partition.
          </p>
        </div>
      </div>

      <div className={frame}>
        <div className="flex items-center gap-1 border-b border-line bg-surface-2 px-2 py-1.5">
          {["raft.go", "log.go", "raft_test.go"].map((f, i) => (
            <span
              key={f}
              className={cn(
                "rounded-[var(--radius-xs)] px-2.5 py-1.5 font-mono text-[12px]",
                i === 0
                  ? "bg-surface text-ink shadow-[var(--shadow-e1)]"
                  : "text-ink-3",
              )}
            >
              {f}
            </span>
          ))}
          <Button
            size="xs"
            className="ml-auto"
            onClick={() => setRan(true)}
          >
            <Terminal className="size-3.5" /> Run tests
          </Button>
        </div>

        <pre className="scrollbar-slim overflow-x-auto bg-[#0d0f13] p-5 font-mono text-[12.5px] leading-[1.7]">
          <code>
            {[
              ["func (n *Node) canGrantVote(", "#e6e9ef"],
              ["\tcandTerm, candLastIdx, candLastTerm int,", "#a5acb7"],
              [") bool {", "#e6e9ef"],
              ["\tif candTerm < n.currentTerm {", "#7093ff"],
              ["\t\treturn false", "#f0803c"],
              ["\t}", "#7093ff"],
              ["\tmyLastTerm := n.log.LastTerm()", "#e6e9ef"],
              ["\tif candLastTerm != myLastTerm {", "#7093ff"],
              ["\t\treturn candLastTerm > myLastTerm", "#45b892"],
              ["\t}", "#7093ff"],
              ["\treturn candLastIdx >= n.log.LastIndex()", "#45b892"],
              ["}", "#e6e9ef"],
            ].map(([line, color], i) => (
              <span key={i} className="flex">
                <span className="mr-4 inline-block w-5 shrink-0 text-right text-[#4a515c] select-none">
                  {i + 1}
                </span>
                <span style={{ color: color as string }}>{line}</span>
              </span>
            ))}
          </code>
        </pre>

        {ran ? (
          <div className="border-t border-line bg-surface-2 px-5 py-3.5 font-mono text-[12px] leading-relaxed">
            <p className="text-jade">ok  raft  TestVoteGrantedHigherTerm  0.02s</p>
            <p className="text-jade">ok  raft  TestVoteDeniedShorterLog   0.01s</p>
            <p className="text-jade">ok  raft  TestVoteTieBrokenByIndex   0.01s</p>
            <p className="mt-2 text-ink-2">
              PASS · 3 of 3 · lesson marked complete
            </p>
          </div>
        ) : null}
      </div>
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
        <h2 className="mt-3 font-display text-[1.6rem] leading-tight tracking-[-0.018em] text-ink">
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
          style={{ background: "radial-gradient(circle,#d6520a,transparent 70%)" }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11.5px] font-medium text-ink-inv/80">
            <LiveDot /> Starts tomorrow, 16:00 IST
          </span>
          <h2 className="mt-5 max-w-lg font-display text-[clamp(1.6rem,1.2rem+1.5vw,2.4rem)] leading-[1.08] tracking-[-0.02em] text-ink-inv">
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
