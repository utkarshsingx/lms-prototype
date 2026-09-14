"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Gauge,
  Lightbulb,
  LoaderCircle,
  Lock,
  Maximize2,
  NotebookPen,
  Package,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Send,
  Sigma,
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
import { toast } from "@/components/ui/toast";
import { parseAmount } from "@/components/assessment/runner";

const frame =
  "relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface";

const sectionLabel =
  "text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase";

/* ---------------------------------------------------------------- video */

const CHAPTERS = [
  { at: 0, label: "Consideration transferred" },
  { at: 26, label: "Measuring NCI at fair value" },
  { at: 50, label: "Net assets at acquisition" },
  { at: 74, label: "Goodwill and the proportionate method" },
];

const STILL_ROWS: [string, string, boolean?][] = [
  ["Consideration (3,000 + 2,200)", "5,200"],
  ["Non-controlling interest at fair value", "1,100"],
  ["Less: net assets at acquisition", "(4,800)"],
  ["Goodwill on acquisition", "1,500", true],
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
      <div className="relative aspect-video bg-stage">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, var(--stage-2) 0%, var(--stage) 62%)",
          }}
        />
        <div className="grain absolute inset-0 opacity-40" />

        {/* A still frame stand-in: the working the tutor is writing up. */}
        <svg
          viewBox="0 0 400 220"
          className="absolute inset-0 m-auto h-[64%] w-auto opacity-95"
          aria-hidden
        >
          <text
            x="40"
            y="34"
            fill="var(--stage-ink-3)"
            fontSize="10"
            fontFamily="system-ui"
            letterSpacing="1.4"
          >
            W3 GOODWILL
          </text>
          <text
            x="360"
            y="34"
            textAnchor="end"
            fill="var(--stage-ink-3)"
            fontSize="10"
            fontFamily="system-ui"
          >
            $000
          </text>
          {STILL_ROWS.map(([label, value, strong], i) => {
            const y = 70 + i * 36 + (strong ? 8 : 0);
            return (
              <g key={label}>
                {strong ? (
                  <path
                    d={`M40 ${y - 24} H360`}
                    stroke="var(--stage-line-strong)"
                    strokeWidth="1"
                  />
                ) : null}
                <text
                  x="40"
                  y={y}
                  fill={strong ? "var(--stage-ink)" : "var(--stage-ink-2)"}
                  fontSize={strong ? 14 : 12.5}
                  fontWeight={strong ? 700 : 400}
                  fontFamily="system-ui"
                >
                  {label}
                </text>
                <text
                  x="360"
                  y={y}
                  textAnchor="end"
                  className={strong ? "fill-cta" : undefined}
                  fill={strong ? undefined : "var(--stage-ink)"}
                  fontSize={strong ? 16 : 13}
                  fontWeight={strong ? 700 : 500}
                  fontFamily="ui-monospace, monospace"
                >
                  {value}
                </text>
              </g>
            );
          })}
        </svg>

        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 grid place-items-center"
            aria-label="Play"
          >
            <span className="grid size-16 place-items-center rounded-full bg-cta text-cta-ink shadow-2xl transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-108">
              <Play className="ml-1 size-6 fill-current" />
            </span>
          </button>
        ) : null}

        {captions ? (
          <p className="absolute inset-x-0 bottom-16 mx-auto max-w-lg rounded-[var(--radius-sm)] bg-stage/70 px-3 py-1.5 text-center text-[13px] leading-snug text-stage-ink/95">
            Goodwill is 5,200 plus 1,100 minus 4,800, so $1,500k. Now watch
            what changes if NCI is measured at its share of net assets.
          </p>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stage/85 to-transparent px-4 pt-10 pb-3">
          <div className="group relative mb-2.5 h-1 cursor-pointer rounded-full bg-stage-ink/20">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-stage-ink/30"
              style={{ width: "72%" }}
            />
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-cta"
              style={{ width: `${pos}%` }}
            />
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stage-ink opacity-0 shadow transition-opacity group-hover:opacity-100"
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
                aria-pressed={captions}
                className={cn(
                  "grid size-8 place-items-center rounded-full hover:bg-stage-ink/12",
                  captions && "text-cta",
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

      <div className="scrollbar-none flex gap-2 overflow-x-auto border-t border-line px-4 py-3">
        {CHAPTERS.map((c, i) => {
          const on =
            pos >= c.at && (CHAPTERS[i + 1] ? pos < CHAPTERS[i + 1].at : true);
          return (
            <button
              key={c.at}
              onClick={() => setPos(c.at + 1)}
              aria-pressed={on}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                on
                  ? "border-cta-strong bg-cta-soft text-ink"
                  : "border-line bg-surface text-ink-3 hover:bg-cta-soft hover:text-ink",
              )}
            >
              <span className="mr-1.5 tnum opacity-60">{clock(c.at)}</span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- article */

export function ArticleViewer({ lesson }: { lesson: Lesson }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className={cn(frame, "px-6 py-8 sm:px-10 sm:py-11")}>
      <p className={sectionLabel}>Reading · {lesson.minutes} min</p>
      <h2 className="mt-3 font-display text-[clamp(1.6rem,1.3rem+1.2vw,2.25rem)] leading-[1.12] tracking-[var(--display-tracking)] text-ink">
        {lesson.title}
      </h2>

      <div className="mt-6 max-w-[62ch] space-y-5 text-[15.5px] leading-[1.75] text-ink-2">
        <p className="first-letter:float-left first-letter:mt-1 first-letter:mr-2.5 first-letter:font-display first-letter:text-[3.3rem] first-letter:leading-[0.82] first-letter:text-ink">
          Every consolidation question in FR rests on one date: the date
          control passes. Goodwill, the non-controlling interest at acquisition
          and the split between pre and post-acquisition profit are all fixed on
          that day, and most lost marks trace back to a figure taken from the
          wrong side of it.
        </p>
        <p>
          IFRS 3 measures the subsidiary&apos;s identifiable net assets at fair
          value on acquisition. If land is worth $500k more than its carrying
          amount, that uplift belongs in net assets at acquisition. Profit the
          subsidiary earns afterwards never changes goodwill. It is shared
          between the group and the non-controlling interest.
        </p>

        <blockquote className="my-7 border-l-4 border-cta pl-5 font-display text-[1.35rem] leading-[1.45] text-ink">
          Goodwill is measured once, at acquisition. After that it can be
          impaired, but it is never amortised and never recalculated.
        </blockquote>

        <p>
          The question tells you how to measure NCI. At fair value, the NCI
          figure is given and goodwill includes the NCI&apos;s share. At the
          proportionate share of net assets, NCI is a percentage of the fair
          value of net assets, uplift included, and goodwill is smaller.
        </p>

        <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 font-mono text-[12.5px] leading-relaxed text-ink-2">
{`W3 Goodwill                                  $000
Consideration: cash                         3,000
Consideration: 1,000k shares at $2.20       2,200
Non-controlling interest at fair value      1,100
                                            6,300
Less: net assets at acquisition (W2)       (4,800)
Goodwill on acquisition                     1,500`}
        </pre>

        <p>
          Lay the working out like this in the spreadsheet response area, with
          every figure labelled. Markers give credit for the right method
          applied to your own earlier figures, so a clear working stops one slip
          from costing you the whole question.
        </p>
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSaved(true);
            toast({ title: "Saved to your notes", body: lesson.title });
          }}
        >
          {saved ? (
            <Check className="size-3.5" />
          ) : (
            <NotebookPen className="size-3.5" />
          )}
          {saved ? "Saved to notes" : "Save to notes"}
        </Button>
        <span className="ml-auto text-[12px] text-ink-3">
          FR syllabus D · Preparation of financial statements
        </span>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ pdf */

const PDF_PAGES: { heading: string; intro: string; rows: [string, string, string][] }[] = [
  {
    heading: "Group accounting",
    intro:
      "Control means consolidating line by line. Significant influence, usually a holding of 20% to 50%, means equity accounting.",
    rows: [
      ["IFRS 3", "Business combinations", "Acquisition costs are expensed; goodwill is tested for impairment, never amortised"],
      ["IFRS 10", "Consolidated financial statements", "Control, not the ownership percentage, decides consolidation"],
      ["IAS 28", "Investments in associates and joint ventures", "Equity method: cost plus share of post-acquisition profit"],
      ["IFRS 13", "Fair value measurement", "Fair value is an exit price between market participants"],
    ],
  },
  {
    heading: "Non-current assets",
    intro:
      "Most marks here come from measurement after recognition: revaluation, impairment and what goes to other comprehensive income.",
    rows: [
      ["IAS 16", "Property, plant and equipment", "Revaluation gains go to other comprehensive income"],
      ["IAS 38", "Intangible assets", "Development costs are capitalised only when every criterion is met"],
      ["IAS 36", "Impairment of assets", "Recoverable amount is the higher of fair value less costs of disposal and value in use"],
      ["IAS 40", "Investment property", "Fair value model changes go to profit or loss"],
      ["IAS 23", "Borrowing costs", "Capitalise borrowing costs on qualifying assets"],
    ],
  },
  {
    heading: "Revenue, liabilities and financing",
    intro:
      "Read the contract terms first. Timing and measurement questions turn on what the entity has actually promised or owes.",
    rows: [
      ["IFRS 15", "Revenue from contracts with customers", "Five steps; revenue as each performance obligation is satisfied"],
      ["IFRS 16", "Leases", "Right-of-use asset and lease liability at the present value of payments"],
      ["IAS 37", "Provisions, contingent liabilities and contingent assets", "Provide for a present obligation when an outflow is probable and measurable"],
      ["IFRS 9", "Financial instruments", "Classification depends on the business model and the cash flows"],
      ["IAS 32", "Financial instruments: presentation", "Split compound instruments into debt and equity"],
    ],
  },
  {
    heading: "Reporting and presentation",
    intro:
      "The standards behind the formats you prepare in Section C, and the adjustments that move figures between periods.",
    rows: [
      ["IAS 1", "Presentation of financial statements", "Current and non-current classification; OCI presented separately"],
      ["IAS 7", "Statement of cash flows", "The indirect method starts from profit before tax"],
      ["IAS 8", "Accounting policies, changes in estimates and errors", "Policy changes and prior period errors apply retrospectively"],
      ["IAS 10", "Events after the reporting period", "Adjusting events give evidence of conditions at the reporting date"],
      ["IAS 33", "Earnings per share", "Basic EPS uses the weighted average number of shares"],
      ["IAS 2", "Inventories", "Lower of cost and net realisable value"],
    ],
  },
];

export function PdfViewer({ lesson }: { lesson: Lesson }) {
  const [page, setPage] = useState(1);
  const pages = PDF_PAGES.length;
  const doc = PDF_PAGES[page - 1];
  const name = lesson.title.replace(/^[^:]+:\s*/, "");
  return (
    <div className={frame}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-inv px-4 py-2.5">
        <FileText className="size-4 shrink-0 text-cta" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-inv">
          {name}.pdf
        </span>
        <div className="flex items-center gap-1 text-ink-inv/70">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
            className="grid size-7 place-items-center rounded-[var(--radius-xs)] hover:bg-ink-inv/10 hover:text-ink-inv"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[12px] text-ink-inv tnum">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            aria-label="Next page"
            className="grid size-7 place-items-center rounded-[var(--radius-xs)] hover:bg-ink-inv/10 hover:text-ink-inv"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <Button
          size="xs"
          onClick={() => toast({ title: "Download started", body: `${name}.pdf · 4 pages` })}
        >
          <Download className="size-3.5" /> Download
        </Button>
      </div>

      <div className="grid gap-0 bg-surface-2 sm:grid-cols-[9rem_1fr]">
        <div className="scrollbar-slim hidden max-h-[40rem] gap-2 overflow-y-auto border-r border-line p-3 sm:flex sm:flex-col">
          {PDF_PAGES.map((p, i) => (
            <button
              key={p.heading}
              onClick={() => setPage(i + 1)}
              aria-label={`Page ${i + 1}: ${p.heading}`}
              className={cn(
                "shrink-0 rounded-[6px] border-2 bg-surface p-1.5 text-left transition-colors",
                page === i + 1 ? "border-cta" : "border-transparent hover:border-line-strong",
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

        <div className="p-4 sm:p-8">
          <div className="mx-auto w-full max-w-[36rem] rounded-[4px] bg-white p-6 shadow-[var(--shadow-e3)] sm:p-10">
            <p className="font-mono text-[10px] tracking-[0.14em] text-neutral-500 uppercase">
              FR · IFRS standards quick reference · page {page} of {pages}
            </p>
            <h3 className="mt-5 font-display text-[1.5rem] leading-tight tracking-[var(--display-tracking)] text-neutral-900">
              {doc.heading}
            </h3>
            <p className="mt-3 text-[12.5px] leading-relaxed text-neutral-600">
              {doc.intro}
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[26rem] border-collapse text-[11.5px]">
                <thead>
                  <tr className="border-b border-neutral-300 text-left text-neutral-500">
                    <th className="py-1.5 pr-3 font-semibold">Standard</th>
                    <th className="py-1.5 pr-3 font-semibold">Subject</th>
                    <th className="py-1.5 font-semibold">Watch for</th>
                  </tr>
                </thead>
                <tbody className="align-top text-neutral-700">
                  {doc.rows.map(([code, subject, note]) => (
                    <tr key={code} className="border-b border-neutral-200">
                      <td className="py-1.5 pr-3 font-mono font-semibold whitespace-nowrap text-neutral-900">
                        {code}
                      </td>
                      <td className="py-1.5 pr-3">{subject}</td>
                      <td className="py-1.5 leading-snug text-neutral-600">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">
              A revision summary, not a substitute for the standards. Check the
              examinable documents list for your exam session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- slides */

const SLIDES = [
  { t: "Group accounts: the five workings", s: "Module 3 · FR syllabus D, preparation of financial statements" },
  { t: "W1 Group structure", s: "Who owns what, and since when: 80%, acquired 1 October 20X5" },
  { t: "W2 Net assets of the subsidiary", s: "At acquisition and at the reporting date, fair value uplifts included" },
  { t: "W3 Goodwill", s: "Consideration plus NCI, less net assets at acquisition, less any impairment" },
  { t: "W4 Non-controlling interest", s: "At acquisition, plus its share of post-acquisition profit, less its share of impairment" },
  { t: "W5 Group retained earnings", s: "Parent's reserves plus its share of the subsidiary's post-acquisition profit" },
  { t: "Exam technique", s: "Proforma first, then each working, then fill the statement as each one finishes" },
];

export function SlidesViewer({ lesson }: { lesson: Lesson }) {
  const [i, setI] = useState(0);
  return (
    <div className={frame}>
      <div className="relative aspect-[16/9] bg-surface-inv">
        <span className="absolute top-0 left-0 h-1.5 w-24 bg-cta" />
        <div className="absolute inset-0 grid place-items-center px-8 text-center sm:px-16">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-ink-inv/55 uppercase">
              {lesson.title}
            </p>
            <h3 className="mt-5 font-display text-[clamp(1.4rem,1rem+2.4vw,2.6rem)] leading-[1.1] tracking-[var(--display-tracking)] text-ink-inv">
              {SLIDES[i].t}
            </h3>
            <p className="mt-4 text-[14.5px] text-ink-inv/65">{SLIDES[i].s}</p>
          </div>
        </div>
        <span className="absolute right-5 bottom-4 text-[11.5px] text-ink-inv/50 tnum">
          {i + 1} / {SLIDES.length}
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <button
          onClick={() => setI((n) => Math.max(0, n - 1))}
          aria-label="Previous slide"
          className="grid size-8 place-items-center rounded-[var(--radius-sm)] border border-line text-ink-2 hover:bg-cta-soft"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="scrollbar-none flex flex-1 gap-1.5 overflow-x-auto">
          {SLIDES.map((s, n) => (
            <button
              key={s.t}
              onClick={() => setI(n)}
              title={s.t}
              aria-label={`Slide ${n + 1}: ${s.t}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                n === i ? "bg-cta" : n < i ? "bg-line-strong" : "bg-surface-3",
              )}
            />
          ))}
        </div>
        <button
          onClick={() => setI((n) => Math.min(SLIDES.length - 1, n + 1))}
          aria-label="Next slide"
          className="grid size-8 place-items-center rounded-[var(--radius-sm)] border border-line text-ink-2 hover:bg-cta-soft"
        >
          <ChevronRight className="size-4" />
        </button>
        <Button
          variant="secondary"
          size="xs"
          onClick={() => toast({ title: "Download started", body: "Module 3 slides.pdf" })}
        >
          <Download className="size-3.5" /> Slides
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- scorm and xapi */

const CASE_OPTIONS = [
  "Recognise all $2.4m on 1 July 20X6, when the contract is signed",
  "Allocate the price between the equipment and the servicing: equipment on delivery, servicing over the two years",
  "Recognise nothing until the two years of servicing are complete",
];
const CASE_ANSWER = 1;

export function PackageViewer({ lesson }: { lesson: Lesson }) {
  const meta = lesson.packageMeta;
  const isXapi = lesson.type === "xapi";
  const [launched, setLaunched] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className={frame}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-inv px-4 py-2.5">
          <Package className="size-4 shrink-0 text-cta" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-inv">
            Case study · {meta?.version ?? "SCORM 2004"} package
          </span>
          <Badge tone={launched ? "jade" : "neutral"} dot>
            {launched ? "Attempt open" : "Not launched"}
          </Badge>
        </div>

        <div className="relative min-h-[22rem] bg-surface-2 sm:aspect-video sm:min-h-0">
          {launched ? (
            <div className="absolute inset-0 grid place-items-center overflow-y-auto p-4 sm:p-8">
              <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-5 sm:p-6">
                <p className={sectionLabel}>Kestrel Engineering · interaction 3 of 8</p>
                <h3 className="mt-3 font-display text-[1.35rem] leading-tight tracking-[var(--display-tracking)] text-ink">
                  One contract, equipment plus two years of servicing
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  Kestrel signs a $2.4m contract on 1 July 20X6. The equipment
                  is delivered and installed that day and servicing runs for two
                  years. How should Kestrel recognise revenue under IFRS 15?
                </p>
                <div className="mt-4 grid gap-2 text-left">
                  {CASE_OPTIONS.map((o, i) => {
                    const show = picked !== null;
                    const right = i === CASE_ANSWER;
                    return (
                      <button
                        key={o}
                        disabled={show}
                        onClick={() => setPicked(i)}
                        className={cn(
                          "rounded-[var(--radius-md)] border px-3.5 py-2.5 text-left text-[13px] transition-colors",
                          show && right
                            ? "border-jade bg-jade-soft text-ink"
                            : show && picked === i
                              ? "border-rose bg-rose-soft text-ink"
                              : "border-line bg-surface text-ink-2 hover:border-cta-strong hover:bg-cta-soft hover:text-ink",
                        )}
                      >
                        <span className="mr-2 font-mono text-[11.5px] text-ink-3">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {o}
                      </button>
                    );
                  })}
                </div>
                {picked !== null ? (
                  <p
                    aria-live="polite"
                    className={cn(
                      "mt-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-2",
                      picked === CASE_ANSWER ? "bg-jade-soft" : "bg-amber-soft",
                    )}
                  >
                    <span className="font-semibold text-ink">
                      {picked === CASE_ANSWER ? "Right. " : "Not quite. "}
                    </span>
                    The equipment and the servicing are separate performance
                    obligations. The price is allocated on relative stand-alone
                    selling prices, equipment revenue is recognised on delivery
                    and servicing revenue over the two years.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setLaunched(true)}
              className="group absolute inset-0 grid place-items-center"
            >
              <span className="flex flex-col items-center px-6 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-cta text-cta-ink transition-transform duration-200 ease-[var(--ease-spring)] group-hover:scale-108">
                  <Play className="ml-0.5 size-5 fill-current" />
                </span>
                <span className="mt-4 text-[13.5px] font-semibold text-ink">
                  Launch case study: revenue at Kestrel Engineering
                </span>
                <span className="mt-1 text-[12px] text-ink-3 tnum">
                  {meta?.size ?? "24.0 MB"} · 8 interactions · opens in a sandboxed frame
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* The runtime panel is what separates a real LMS from a video site. */}
      <div className={cn(frame, "p-4.5")}>
        <p className={sectionLabel}>
          {isXapi ? "xAPI statements" : "SCORM runtime data"}
        </p>
        <dl className="mt-2.5">
          {isXapi ? (
            <>
              <DataRow label="Learning record store">Built in</DataRow>
              <DataRow label="Statements this attempt">
                <span className="tnum">{launched ? (picked === null ? 3 : 4) : 0}</span>
              </DataRow>
              <DataRow label="Completion verb">
                <span className="font-mono text-[11.5px] [overflow-wrap:anywhere]">
                  {meta?.completionRule}
                </span>
              </DataRow>
              <DataRow label="Actor">Anaya Rao · s-anaya</DataRow>
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
                  {launched ? (picked === CASE_ANSWER ? "0.375" : "0.25") : "not set"}
                </span>
              </DataRow>
              <DataRow label="cmi.suspend_data">
                <span className="font-mono text-[12px] tnum">
                  {launched ? "1.2 KB of 64 KB" : "empty"}
                </span>
              </DataRow>
              <DataRow label="Completion rule">
                <span className="font-mono text-[11.5px] [overflow-wrap:anywhere]">
                  {meta?.completionRule}
                </span>
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

/* ------------------------------------------------------ workspace logic */

/* A CBE spreadsheet workspace. The learner types figures or formulas into
   column B; each check compares the evaluated figure with the expected one
   exactly (tolerance 0), and some checks also require a total to follow from
   the learner's own lines, so typing the final answer alone does not pass. */

export type SheetRow =
  | { kind: "section"; label: string }
  | { kind: "given"; id: string; label: string; value: number }
  | {
      kind: "input";
      id: string;
      label: string;
      expected: number;
      /** A "Less:" line, accepted entered as either 4,800 or (4,800). */
      signFree?: boolean;
    };

export type SheetCheck = {
  id: string;
  title: string;
  detail: string;
  cells: string[];
  /** Known wrong figures, keyed by cell, with the mistake each one reveals. */
  traps?: Record<string, { value: number; message: string }[]>;
  /** Runs once the cells match: the learner's own figures must reconcile. */
  rule?: (v: (id: string) => number) => string | null;
};

export type Exercise = {
  id: "goodwill" | "csfp" | "variance";
  sheet: string;
  unit: string;
  title: string;
  brief: string[];
  data: { label: string; rows: [string, string][] }[];
  rows: SheetRow[];
  checks: SheetCheck[];
  hints: string[];
  answer: Record<string, string>;
};

export type SheetCell = { value: number | null; error?: string };
export type CheckResult = { id: string; title: string; pass: boolean; message?: string };

const GOODWILL: Exercise = {
  id: "goodwill",
  sheet: "Goodwill workings",
  unit: "$000",
  title: "Calculate goodwill on acquisition",
  brief: [
    "P acquired 80% of the equity shares of S on 1 October 20X5. Build the W2 net assets and W3 goodwill workings in the spreadsheet, set out the way the FR exam's spreadsheet response area expects.",
    "Type a figure such as 1,500 or a formula such as =B7+B8. Amounts are in $000 and every figure is checked exactly.",
  ],
  data: [
    {
      label: "Consideration",
      rows: [
        ["Cash paid on 1 October 20X5", "$3,000k"],
        ["P shares issued", "1,000k shares"],
        ["Market price of a P share on acquisition", "$2.20"],
        ["Professional fees on the acquisition, charged to profit or loss", "$120k"],
      ],
    },
    {
      label: "S at 1 October 20X5",
      rows: [
        ["Share capital", "$1,000k"],
        ["Retained earnings", "$3,300k"],
        ["Fair value of land above its carrying amount", "$500k"],
        ["Non-controlling interest at fair value", "$1,100k"],
      ],
    },
  ],
  rows: [
    { kind: "section", label: "W2 Net assets of S at acquisition" },
    { kind: "input", id: "sc", label: "Share capital", expected: 1000 },
    { kind: "input", id: "reAcq", label: "Retained earnings at acquisition", expected: 3300 },
    { kind: "input", id: "uplift", label: "Fair value uplift on land", expected: 500 },
    { kind: "input", id: "na", label: "Net assets at acquisition", expected: 4800 },
    { kind: "section", label: "W3 Goodwill" },
    { kind: "input", id: "cash", label: "Cash consideration", expected: 3000 },
    { kind: "input", id: "shares", label: "Shares issued: 1,000k at $2.20", expected: 2200 },
    { kind: "input", id: "cons", label: "Total consideration", expected: 5200 },
    { kind: "input", id: "nci", label: "Non-controlling interest at fair value", expected: 1100 },
    { kind: "input", id: "less", label: "Less: net assets at acquisition (W2)", expected: 4800, signFree: true },
    { kind: "input", id: "gw", label: "Goodwill on acquisition", expected: 1500 },
  ],
  checks: [
    {
      id: "net-assets",
      title: "Net assets at acquisition",
      detail: "Share capital, retained earnings and the land uplift, all at 1 October 20X5.",
      cells: ["sc", "reAcq", "uplift", "na"],
      traps: {
        na: [{ value: 4300, message: "Include the $500k fair value uplift on land." }],
        uplift: [{ value: 0, message: "Land is $500k above its carrying amount, so the uplift is not nil." }],
      },
    },
    {
      id: "consideration",
      title: "Consideration transferred",
      detail: "Cash plus the shares issued, valued at market price.",
      cells: ["cash", "shares", "cons"],
      traps: {
        shares: [
          { value: 1000, message: "That is the number of shares. Value them at the $2.20 market price." },
        ],
        cons: [
          { value: 4000, message: "Value the shares at the $2.20 market price, not one dollar each." },
          { value: 5320, message: "Professional fees are expensed under IFRS 3, never added to consideration." },
        ],
      },
    },
    {
      id: "nci",
      title: "Non-controlling interest",
      detail: "Measured at fair value on acquisition, as the question states.",
      cells: ["nci"],
      traps: {
        nci: [
          { value: 960, message: "That is the proportionate share of net assets (20% of 4,800). This question measures NCI at fair value." },
          { value: 860, message: "That is 20% of net assets without the land uplift, and the wrong method. NCI here is at fair value." },
          { value: 1040, message: "That is 20% of consideration. NCI at fair value is given in the data." },
        ],
      },
    },
    {
      id: "goodwill",
      title: "Goodwill on acquisition",
      detail: "Consideration plus NCI, less net assets, following from your own lines.",
      cells: ["less", "gw"],
      traps: {
        gw: [
          { value: 1360, message: "That uses the proportionate NCI. This question measures NCI at fair value." },
          { value: 2000, message: "Your net assets leave out the $500k land uplift." },
          { value: 400, message: "Goodwill includes the non-controlling interest: add NCI before deducting net assets." },
          { value: 1620, message: "Professional fees are expensed, so they do not increase goodwill." },
        ],
      },
      rule: (v) =>
        Math.abs(v("less")) !== v("na")
          ? "B11 must bring down net assets from W2 (B5)."
          : v("gw") !== v("cons") + v("nci") - Math.abs(v("less"))
            ? "Goodwill does not follow from your workings: B12 should equal B9 plus B10 less B11."
            : null,
    },
  ],
  hints: [
    "Start with W2. Net assets at acquisition are share capital plus retained earnings at acquisition plus the `500` fair value uplift on land.",
    "Value the shares P issued at market price: `=1000*2.2` gives `2,200`. Professional fees are expensed, so they stay out of consideration.",
    "NCI is measured at fair value here, so use the `1,100` given. Goodwill is `=B9+B10-B11`: consideration plus NCI less net assets.",
  ],
  answer: {
    sc: "1,000",
    reAcq: "3,300",
    uplift: "500",
    na: "=SUM(B2:B4)",
    cash: "3,000",
    shares: "=1000*2.2",
    cons: "=B7+B8",
    nci: "1,100",
    less: "=-B5",
    gw: "=B9+B10+B11",
  },
};

const CSFP: Exercise = {
  id: "csfp",
  sheet: "Group SOFP",
  unit: "$000",
  title: "Consolidated statement of financial position",
  brief: [
    "A year on, prepare the P group's consolidated statement of financial position at 30 September 20X6. The Data tab has both entities' figures and this year's goodwill impairment.",
    "Amounts are in $000. Both totals must add up from your own lines, as they would in the exam.",
  ],
  data: [
    {
      label: "Acquisition of S (from the goodwill workspace)",
      rows: [
        ["Holding acquired on 1 October 20X5", "80%"],
        ["Goodwill on acquisition", "$1,500k"],
        ["NCI at fair value on acquisition", "$1,100k"],
        ["S retained earnings at acquisition", "$3,300k"],
        ["Fair value uplift on S's land, not depreciated", "$500k"],
        ["Goodwill impairment at 30 September 20X6", "$300k"],
      ],
    },
    {
      label: "P at 30 September 20X6",
      rows: [
        ["Property, plant and equipment", "$12,000k"],
        ["Investment in S at cost", "$5,200k"],
        ["Current assets", "$4,600k"],
        ["Share capital", "$6,000k"],
        ["Share premium", "$1,200k"],
        ["Retained earnings", "$9,400k"],
        ["Liabilities", "$5,200k"],
      ],
    },
    {
      label: "S at 30 September 20X6",
      rows: [
        ["Property, plant and equipment", "$4,600k"],
        ["Current assets", "$2,300k"],
        ["Share capital", "$1,000k"],
        ["Retained earnings", "$4,100k"],
        ["Liabilities", "$1,800k"],
      ],
    },
  ],
  rows: [
    { kind: "section", label: "Assets" },
    { kind: "input", id: "gw", label: "Goodwill (W3, after impairment)", expected: 1200 },
    { kind: "input", id: "ppe", label: "Property, plant and equipment", expected: 17100 },
    { kind: "input", id: "ca", label: "Current assets", expected: 6900 },
    { kind: "input", id: "ta", label: "Total assets", expected: 25200 },
    { kind: "section", label: "Equity and liabilities" },
    { kind: "given", id: "sc", label: "Share capital", value: 6000 },
    { kind: "given", id: "sp", label: "Share premium", value: 1200 },
    { kind: "input", id: "re", label: "Group retained earnings (W5)", expected: 9800 },
    { kind: "input", id: "nci", label: "Non-controlling interest (W4)", expected: 1200 },
    { kind: "input", id: "liab", label: "Liabilities", expected: 7000 },
    { kind: "input", id: "tel", label: "Total equity and liabilities", expected: 25200 },
  ],
  checks: [
    {
      id: "goodwill",
      title: "Goodwill after impairment",
      detail: "Goodwill on acquisition less this year's impairment.",
      cells: ["gw"],
      traps: {
        gw: [{ value: 1500, message: "That is goodwill at acquisition. Deduct the $300k impairment." }],
      },
    },
    {
      id: "assets",
      title: "Assets line by line",
      detail: "100% of P and S, plus the fair value uplift where it belongs.",
      cells: ["ppe", "ca"],
      traps: {
        ppe: [
          { value: 16600, message: "Add the $500k fair value uplift on S's land." },
          { value: 12000, message: "Consolidate 100% of S's assets alongside P's." },
          { value: 15680, message: "Consolidate 100% of S's assets, not 80%. The other 20% is shown through NCI." },
        ],
        ca: [
          { value: 6440, message: "Consolidate 100% of S's current assets, not 80%." },
          { value: 4600, message: "Add S's current assets to P's." },
        ],
      },
    },
    {
      id: "retained",
      title: "Group retained earnings",
      detail: "P plus 80% of S's post-acquisition profit, less 80% of the impairment.",
      cells: ["re"],
      traps: {
        re: [
          { value: 10040, message: "That leaves out the group's share of the impairment (80% of 300)." },
          { value: 9900, message: "You took 100% of S's post-acquisition profit and impairment. The group's share is 80%." },
          { value: 9740, message: "The whole impairment is charged to the group. With NCI at fair value, 20% of it goes to NCI." },
          { value: 12680, message: "Only post-acquisition profit is consolidated: 4,100 less the 3,300 at acquisition." },
        ],
      },
    },
    {
      id: "nci",
      title: "Non-controlling interest",
      detail: "NCI at acquisition, plus 20% of post-acquisition profit, less 20% of the impairment.",
      cells: ["nci"],
      traps: {
        nci: [
          { value: 1100, message: "That is NCI at acquisition. Add 20% of post-acquisition profit and deduct 20% of the impairment." },
          { value: 1260, message: "NCI also bears 20% of the impairment (60)." },
          { value: 1120, message: "That is 20% of S's net assets at the reporting date, the proportionate method. NCI here is at fair value." },
        ],
      },
    },
    {
      id: "balance",
      title: "Balance the statement",
      detail: "Liabilities of both entities, then two totals that agree.",
      cells: ["liab", "ta", "tel"],
      traps: {
        liab: [{ value: 5200, message: "Add S's liabilities of $1,800k." }],
      },
      rule: (v) =>
        v("ta") !== v("gw") + v("ppe") + v("ca")
          ? "Total assets does not add up from your asset lines: B5 should equal B2 plus B3 plus B4."
          : v("tel") !== v("sc") + v("sp") + v("re") + v("nci") + v("liab")
            ? "Total equity and liabilities does not add up from B7 to B11."
            : null,
    },
  ],
  hints: [
    "Goodwill is the `1,500` from the acquisition less the `300` impairment. Add P and S line by line, and put the `500` land uplift into property, plant and equipment.",
    "Group retained earnings: P's `9,400`, plus 80% of S's post-acquisition profit `(4,100 − 3,300)`, less 80% of the impairment.",
    "With NCI at fair value it takes 20% of both: `=1100+20%*(4100-3300)-20%*300`. Both totals should come to the same figure.",
  ],
  answer: {
    gw: "=1500-300",
    ppe: "=12000+4600+500",
    ca: "=4600+2300",
    ta: "=SUM(B2:B4)",
    re: "=9400+80%*(4100-3300)-80%*300",
    nci: "=1100+20%*(4100-3300)-20%*300",
    liab: "=5200+1800",
    tel: "=SUM(B7:B11)",
  },
};

const VARIANCE: Exercise = {
  id: "variance",
  sheet: "Variance reconciliation",
  unit: "$",
  title: "Flexed budget and variance reconciliation",
  brief: [
    "Flex the budget to the units actually sold, calculate the variances and reconcile budgeted profit to actual profit. The business uses marginal costing and holds no inventory.",
    "Amounts are in $. Enter favourable variances as positive and adverse variances as negative, for example -5,000 or (5,000).",
  ],
  data: [
    {
      label: "Budget",
      rows: [
        ["Units", "10,000"],
        ["Selling price", "$50 a unit"],
        ["Standard variable cost", "$30 a unit"],
        ["Fixed overheads", "$120,000"],
      ],
    },
    {
      label: "Actual",
      rows: [
        ["Units produced and sold", "11,000"],
        ["Sales revenue", "$561,000"],
        ["Variable costs", "$341,000"],
        ["Fixed overheads", "$125,000"],
      ],
    },
  ],
  rows: [
    { kind: "section", label: "Flexed budget at 11,000 units" },
    { kind: "input", id: "rev", label: "Flexed sales revenue", expected: 550000 },
    { kind: "input", id: "vc", label: "Flexed variable costs", expected: 330000 },
    { kind: "input", id: "contrib", label: "Flexed contribution", expected: 220000 },
    { kind: "section", label: "Variances (favourable +, adverse −)" },
    { kind: "input", id: "price", label: "Sales price variance", expected: 11000 },
    { kind: "input", id: "volume", label: "Sales volume contribution variance", expected: 20000 },
    { kind: "input", id: "vcv", label: "Variable cost variance", expected: -11000 },
    { kind: "input", id: "fov", label: "Fixed overhead expenditure variance", expected: -5000 },
    { kind: "section", label: "Reconciliation" },
    { kind: "input", id: "bp", label: "Budgeted profit", expected: 80000 },
    { kind: "input", id: "tv", label: "Total variances", expected: 15000 },
    { kind: "input", id: "ap", label: "Actual profit", expected: 95000 },
  ],
  checks: [
    {
      id: "flex",
      title: "Flex the budget",
      detail: "Actual volume at standard price and standard variable cost.",
      cells: ["rev", "vc", "contrib"],
      traps: {
        rev: [
          { value: 500000, message: "That is the original budget. Flex revenue to the 11,000 units actually sold." },
          { value: 561000, message: "That is actual revenue. A flexed budget uses the $50 standard price." },
        ],
        vc: [
          { value: 300000, message: "Flex variable costs to 11,000 units at $30 a unit." },
          { value: 341000, message: "That is the actual cost. Flex at standard: 11,000 units at $30." },
        ],
        contrib: [
          { value: 200000, message: "Contribution comes from the flexed figures: 550,000 less 330,000." },
        ],
      },
    },
    {
      id: "sales",
      title: "Sales variances",
      detail: "Price against flexed revenue; volume at standard contribution.",
      cells: ["price", "volume"],
      traps: {
        price: [
          { value: 61000, message: "Compare actual revenue with flexed revenue (550,000), not the original budget." },
          { value: -11000, message: "Actual revenue beat flexed revenue, so the variance is favourable: enter it as positive." },
        ],
        volume: [
          { value: 50000, message: "Under marginal costing, value the extra 1,000 units at standard contribution of $20, not the selling price." },
          { value: -20000, message: "More units were sold than budgeted, so the volume variance is favourable." },
        ],
      },
    },
    {
      id: "costs",
      title: "Cost variances",
      detail: "Flexed or budgeted cost less actual cost, so an overspend is negative.",
      cells: ["vcv", "fov"],
      traps: {
        vcv: [
          { value: 11000, message: "Actual variable costs exceeded the flexed budget: adverse, so enter a negative figure." },
          { value: -41000, message: "Compare actual costs with the flexed budget (330,000), not the original 300,000." },
        ],
        fov: [
          { value: 5000, message: "Fixed overheads were over budget: adverse, so enter a negative figure." },
        ],
      },
    },
    {
      id: "reconcile",
      title: "Reconcile to actual profit",
      detail: "Budgeted profit plus total variances equals actual profit.",
      cells: ["bp", "tv", "ap"],
      traps: {
        bp: [
          { value: 200000, message: "Deduct budgeted fixed overheads of $120,000 from budgeted contribution." },
          { value: 100000, message: "Budgeted profit uses the original 10,000 units, not the flexed volume." },
        ],
      },
      rule: (v) =>
        v("tv") !== v("price") + v("volume") + v("vcv") + v("fov")
          ? "Total variances does not add up from your variance lines: B12 should equal B6 to B9."
          : v("ap") !== v("bp") + v("tv")
            ? "Actual profit does not follow from your reconciliation: B13 should equal B11 plus B12."
            : null,
    },
  ],
  hints: [
    "A flexed budget uses actual volume with standard prices and costs: `11,000 × $50` and `11,000 × $30`.",
    "Sales price variance is actual revenue less flexed revenue. The volume variance is `(11,000 − 10,000) × $20` of standard contribution.",
    "Costs are flexed or budgeted less actual, so an overspend is negative. Budgeted profit of `80,000` plus total variances must equal actual profit.",
  ],
  answer: {
    rev: "=11000*50",
    vc: "=11000*30",
    contrib: "=B2-B3",
    price: "=561000-B2",
    volume: "=(11000-10000)*(50-30)",
    vcv: "=B3-341000",
    fov: "=120000-125000",
    bp: "=10000*(50-30)-120000",
    tv: "=SUM(B6:B9)",
    ap: "=B11+B12",
  },
};

export const WORKSPACE_EXERCISES = { goodwill: GOODWILL, csfp: CSFP, variance: VARIANCE };

/** Budget and variance titles get the PM exercise; group SOFP titles the
 *  consolidation; goodwill, and anything unmatched, the goodwill working. */
export function exerciseFor(title: string): Exercise {
  const t = title.toLowerCase();
  if (t.includes("goodwill")) return GOODWILL;
  if (/budget|variance/.test(t)) return VARIANCE;
  if (/financial position|consolidat|sofp/.test(t)) return CSFP;
  return GOODWILL;
}

class SheetError extends Error {}

const roundFigure = (n: number) => Math.round(n * 1e6) / 1e6;

/** Accounting format: grouped digits, negatives in brackets. */
export function formatFigure(n: number) {
  const s = Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
}

/** Evaluates `=` formulas: + - * / ( ) %, SUM(B2:B4, …) and column B refs. */
function evalFormula(
  src: string,
  ref: (row: number, inRange: boolean) => number,
): number {
  const text = src
    .toUpperCase()
    // Grouping commas inside a number, so =3,000+2,200 reads as intended.
    .replace(/(?<![A-Z\d.])\d{1,3}(?:,\d{3})+(?!\d)/g, (m) => m.replace(/,/g, ""));
  const tokens = text.match(/B\d+|SUM|\d+(?:\.\d+)?|[-+*/():,%]|[^\s]/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const take = (want?: string) => {
    const t = tokens[i];
    if (t === undefined || (want !== undefined && t !== want)) throw new SheetError("#VALUE!");
    i++;
    return t;
  };
  const isRef = (t: string | undefined) => t !== undefined && /^B\d+$/.test(t);

  const expr = (): number => {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const rhs = term();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  };
  const term = (): number => {
    let v = unary();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const rhs = unary();
      if (op === "/" && rhs === 0) throw new SheetError("#DIV/0!");
      v = op === "*" ? v * rhs : v / rhs;
    }
    return v;
  };
  const unary = (): number => {
    if (peek() === "-") {
      take();
      return -unary();
    }
    if (peek() === "+") {
      take();
      return unary();
    }
    let v = atom();
    while (peek() === "%") {
      take();
      v /= 100;
    }
    return v;
  };
  const atom = (): number => {
    const t = take();
    if (/^\d/.test(t)) return Number(t);
    if (isRef(t)) return ref(Number(t.slice(1)), false);
    if (t === "(") {
      const v = expr();
      take(")");
      return v;
    }
    if (t === "SUM") {
      take("(");
      let total = 0;
      for (;;) {
        if (isRef(peek()) && tokens[i + 1] === ":") {
          const from = Number(take().slice(1));
          take(":");
          const end = take();
          if (!isRef(end)) throw new SheetError("#VALUE!");
          const to = Number(end.slice(1));
          for (let r = Math.min(from, to); r <= Math.max(from, to); r++) total += ref(r, true);
        } else total += expr();
        if (peek() !== ",") break;
        take();
      }
      take(")");
      return total;
    }
    throw new SheetError(/^[A-Z]/.test(t) ? "#NAME?" : "#VALUE!");
  };

  const v = expr();
  if (i < tokens.length) throw new SheetError("#VALUE!");
  return v;
}

export function evaluateSheet(ex: Exercise, raw: Record<string, string>) {
  const out: Record<string, SheetCell> = {};
  const visiting = new Set<string>();

  const cellOf = (id: string): SheetCell => {
    if (out[id]) return out[id];
    const row = ex.rows.find((r) => r.kind !== "section" && r.id === id);
    if (!row || row.kind === "section") return { value: null, error: "#REF!" };
    if (row.kind === "given") return (out[id] = { value: row.value });
    const text = (raw[id] ?? "").trim();
    if (!text) return (out[id] = { value: null });
    if (!text.startsWith("=")) {
      const n = parseAmount(text);
      return (out[id] = n === null ? { value: null, error: "#VALUE!" } : { value: n });
    }
    if (visiting.has(id)) throw new SheetError("#REF!");
    visiting.add(id);
    try {
      const n = evalFormula(text.slice(1), (rowNo, inRange) => {
        const target = ex.rows[rowNo - 1];
        if (!target) throw new SheetError("#REF!");
        if (target.kind === "section") {
          if (inRange) return 0;
          throw new SheetError("#VALUE!");
        }
        const c = cellOf(target.id);
        if (c.error) throw new SheetError(c.error);
        return c.value ?? 0;
      });
      out[id] = Number.isFinite(n) ? { value: roundFigure(n) } : { value: null, error: "#VALUE!" };
    } catch (e) {
      out[id] = { value: null, error: e instanceof SheetError ? e.message : "#VALUE!" };
    } finally {
      visiting.delete(id);
    }
    return out[id];
  };

  for (const r of ex.rows) if (r.kind !== "section") cellOf(r.id);
  return out;
}

const ERROR_HELP: Record<string, string> = {
  "#VALUE!": "Enter a number such as 1,500 or a formula starting with =.",
  "#REF!": "A formula points outside the sheet or back at itself.",
  "#NAME?": "Formulas can use + - * / %, brackets, SUM and cells in column B.",
  "#DIV/0!": "A formula divides by zero.",
};

/** Submit follows the figures, not the keystrokes: 4800 and =SUM(B2:B4)
 *  are the same answer, so reformatting a cell does not make a check stale. */
export const sheetKey = (ex: Exercise, cells: Record<string, SheetCell>) =>
  ex.rows
    .map((r) => (r.kind === "input" ? (cells[r.id]?.error ?? cells[r.id]?.value ?? "") : ""))
    .join("|");

export const cellRefFor = (ex: Exercise, id: string) =>
  `B${ex.rows.findIndex((r) => r.kind !== "section" && r.id === id) + 1}`;

export function gradeWorkspace(ex: Exercise, raw: Record<string, string>): CheckResult[] {
  const cells = evaluateSheet(ex, raw);
  const figure = (id: string) => cells[id]?.value ?? 0;
  return ex.checks.map((check) => {
    const fail = (message: string): CheckResult => ({
      id: check.id,
      title: check.title,
      pass: false,
      message,
    });
    for (const id of check.cells) {
      const row = ex.rows.find((r) => r.kind === "input" && r.id === id);
      if (!row || row.kind !== "input") continue;
      const ref = cellRefFor(ex, id);
      const cell = cells[id];
      if (cell.error) return fail(`${ref} shows ${cell.error} ${ERROR_HELP[cell.error] ?? ""}`.trim());
      if (cell.value === null) return fail(`${ref} is empty: ${row.label}.`);
      const got = row.signFree ? Math.abs(cell.value) : cell.value;
      if (got === row.expected) continue;
      const trap = check.traps?.[id]?.find((t) => t.value === cell.value);
      return fail(
        trap
          ? `${ref} is ${formatFigure(cell.value)}. ${trap.message}`
          : `${ref} is ${formatFigure(cell.value)}, which is not right yet for ${row.label.toLowerCase()}.`,
      );
    }
    const broken = check.rule?.(figure);
    return broken ? fail(broken) : { id: check.id, title: check.title, pass: true };
  });
}

/* ------------------------------------------------------- workspace view */

const WORKSPACE_PANES = [
  { id: "yours", label: "Your result" },
  { id: "expected", label: "Expected result" },
];

export function LabViewer({ lesson }: { lesson: Lesson }) {
  // Keyed by lesson so moving to the next workspace starts a clean attempt
  // instead of inheriting this one's figures, hints and practice flag.
  return <Workspace key={lesson.id} lesson={lesson} ex={exerciseFor(lesson.title)} />;
}

function Workspace({ lesson, ex }: { lesson: Lesson; ex: Exercise }) {
  const inputIds = useMemo(
    () => ex.rows.flatMap((r) => (r.kind === "input" ? [r.id] : [])),
    [ex],
  );
  const [tab, setTab] = useState<"workings" | "data">("workings");
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [active, setActive] = useState(inputIds[0]);
  const [editing, setEditing] = useState<string | null>(null);
  const [queued, setQueued] = useState<Record<string, string> | null>(null);
  const [run, setRun] = useState<{ key: string; results: CheckResult[] } | null>(null);
  const [pane, setPane] = useState("yours");
  const [hints, setHints] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [practice, setPractice] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const cells = useMemo(() => evaluateSheet(ex, raw), [ex, raw]);

  // A check grades the sheet as it was when pressed, so typing during the
  // delay changes nothing. Clearing `queued` cancels the timer.
  useEffect(() => {
    if (queued === null) return;
    const t = window.setTimeout(() => {
      setRun({
        key: sheetKey(ex, evaluateSheet(ex, queued)),
        results: gradeWorkspace(ex, queued),
      });
      setQueued(null);
    }, 600);
    return () => window.clearTimeout(t);
  }, [queued, ex]);

  const running = queued !== null;
  const results = run?.results;
  const total = ex.checks.length;
  const passing = results?.filter((r) => r.pass).length ?? 0;
  const stale = run !== null && run.key !== sheetKey(ex, cells);
  const canSubmit = passing === total && !stale && !running && !submitted;
  const passed = (id: string) => results?.some((r) => r.id === id && r.pass) ?? false;
  const edited = inputIds.some((id) => (raw[id] ?? "").trim() !== "");

  const clearRun = () => {
    setRun(null);
    setQueued(null);
    setConfirming(false);
    setTab("workings");
    setPane("yours");
  };
  const reset = () => {
    setRaw({});
    setActive(inputIds[0]);
    clearRun();
  };
  const showAnswer = () => {
    setRaw({ ...ex.answer });
    setPractice(true);
    clearRun();
  };
  const submit = () => {
    setSubmitted(true);
    toast({
      title: practice ? "Saved as a practice attempt" : "Workings submitted",
      body: `${ex.title} · ${total} of ${total} checks passing`,
      tone: practice ? "amber" : "success",
    });
  };

  const move = (id: string, step: number) => {
    const next = inputIds[inputIds.indexOf(id) + step];
    if (next) inputs.current[next]?.focus();
  };

  const activeRow = ex.rows.find((r) => r.kind !== "section" && r.id === active);
  const display = (id: string) => {
    const c = cells[id];
    if (!c) return "";
    if (c.error) return c.error;
    return c.value === null ? (raw[id] ?? "") : formatFigure(c.value);
  };

  return (
    <div className="@container">
      <div className={cn(frame, "grid @4xl:grid-cols-[19rem_minmax(0,1fr)]")}>
        {/* instructions */}
        <section className="min-w-0 border-b border-line p-5 @4xl:border-r @4xl:border-b-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">CBE workspace</Badge>
            {submitted ? (
              <Badge tone="jade" dot>
                Submitted
              </Badge>
            ) : null}
            {practice ? (
              <Badge tone="amber" dot>
                Practice · no marks
              </Badge>
            ) : null}
            <span className="text-[12px] text-ink-3 tnum">{lesson.minutes} min</span>
          </div>
          <h2 className="mt-3.5 font-display text-[1.4rem] leading-[1.15] tracking-[var(--display-tracking)] text-ink">
            {ex.title}
          </h2>
          <div className="mt-2.5 space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
            {ex.brief.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <p className={cn(sectionLabel, "mt-5")}>Steps</p>
          <ol className="mt-2.5 space-y-3">
            {ex.checks.map((c, i) => {
              const done = passed(c.id);
              return (
                <li key={c.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors tnum",
                      done ? "bg-jade text-on-accent" : "border border-line-strong text-ink-3",
                    )}
                  >
                    {done ? <Check className="size-3" strokeWidth={3.5} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">
                      {c.title}
                      <span className="sr-only">{done ? ", passing" : ", not passing yet"}</span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">
                      {c.detail}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-ink-3">
                      {c.cells.map((id) => cellRefFor(ex, id)).join(" · ")}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          <WorkspaceHints
            hints={ex.hints}
            count={hints}
            showEmpty
            className="mt-5 hidden border-t border-line pt-4 @4xl:block"
          />
        </section>

        {/* sheet, actions and result */}
        <div className="flex min-w-0 flex-col">
          <div className="scrollbar-none flex items-center gap-1 overflow-x-auto bg-surface-inv px-2 py-1.5">
            {(
              [
                ["workings", ex.sheet],
                ["data", "Data"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                  tab === id
                    ? "bg-cta text-cta-ink"
                    : "text-ink-inv/70 hover:bg-ink-inv/10 hover:text-ink-inv",
                )}
              >
                {id === "data" ? (
                  <Lock className="size-3" />
                ) : (
                  <FileSpreadsheet className="size-3.5" />
                )}
                {label}
                {id === "workings" && edited ? (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      tab === id ? "bg-cta-ink" : "bg-cta",
                    )}
                    title="Edited"
                  />
                ) : null}
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 pr-1.5 text-[11.5px] text-ink-inv/60 @md:block">
              {tab === "data" || submitted ? "Read only" : `${ex.unit} · formulas allowed`}
            </span>
          </div>

          {tab === "workings" ? (
            <>
              <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-2 py-1.5">
                <span className="grid h-7 w-11 shrink-0 place-items-center rounded-[var(--radius-xs)] border border-line bg-surface font-mono text-[12px] font-semibold text-ink">
                  {cellRefFor(ex, active)}
                </span>
                <Sigma className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                <input
                  aria-label={`Formula bar, ${cellRefFor(ex, active)}`}
                  value={
                    activeRow?.kind === "given"
                      ? formatFigure(activeRow.value)
                      : (raw[active] ?? "")
                  }
                  onChange={(e) => setRaw((r) => ({ ...r, [active]: e.target.value }))}
                  readOnly={submitted || activeRow?.kind !== "input"}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="Type a figure or =formula"
                  className="h-7 min-w-0 flex-1 rounded-[var(--radius-xs)] border border-line bg-surface px-2 font-mono text-[12.5px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
                />
              </div>

              <div className="scrollbar-slim overflow-x-auto">
                <table className="w-full min-w-[20rem] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-surface-2 font-mono text-[11px] text-ink-3">
                      <th className="w-9 border-r border-b border-line py-1 font-medium" />
                      <th className="border-r border-b border-line py-1 font-medium">A</th>
                      <th className="w-[8.5rem] border-b border-line py-1 font-medium @md:w-[10rem]">
                        B
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.rows.map((r, n) => {
                      const rowNo = (
                        <td className="border-r border-b border-line bg-surface-2 text-center font-mono text-[11px] text-ink-3 tnum">
                          {n + 1}
                        </td>
                      );
                      if (r.kind === "section") {
                        return (
                          <tr key={r.label}>
                            {rowNo}
                            <td
                              colSpan={2}
                              className="border-b border-line bg-cta-soft px-2.5 py-2 text-[10.5px] font-bold tracking-[0.12em] text-ink uppercase"
                            >
                              {r.label}
                            </td>
                          </tr>
                        );
                      }
                      const isActive = active === r.id;
                      return (
                        <tr key={r.id}>
                          {rowNo}
                          <td className="border-r border-b border-line px-2.5 py-2 leading-snug text-ink-2">
                            {r.label}
                          </td>
                          {r.kind === "given" ? (
                            <td
                              onClick={() => setActive(r.id)}
                              className={cn(
                                "border-b border-line bg-surface-2 px-2.5 text-right font-mono text-ink-2 tnum",
                                isActive && "outline-2 -outline-offset-2 outline-ink",
                              )}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Lock className="size-3 text-ink-3" aria-label="Given" />
                                {formatFigure(r.value)}
                              </span>
                            </td>
                          ) : (
                            <td className="border-b border-line p-0">
                              <input
                                ref={(el) => {
                                  inputs.current[r.id] = el;
                                }}
                                aria-label={`${cellRefFor(ex, r.id)}, ${r.label}`}
                                value={editing === r.id ? (raw[r.id] ?? "") : display(r.id)}
                                onFocus={() => {
                                  setActive(r.id);
                                  setEditing(r.id);
                                }}
                                onBlur={() => setEditing(null)}
                                onChange={(e) =>
                                  setRaw((cur) => ({ ...cur, [r.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "ArrowDown") {
                                    e.preventDefault();
                                    move(r.id, 1);
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    move(r.id, -1);
                                  }
                                }}
                                readOnly={submitted}
                                spellCheck={false}
                                autoComplete="off"
                                className={cn(
                                  "block h-9 w-full bg-transparent px-2.5 text-right font-mono text-[12.5px] text-ink tnum focus:bg-cta-soft focus:outline-2 focus:-outline-offset-2 focus:outline-ink",
                                  cells[r.id]?.error && editing !== r.id && "text-rose",
                                  isActive && editing !== r.id && "bg-cta-soft/60",
                                )}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="scrollbar-slim max-h-[30rem] space-y-4 overflow-y-auto bg-surface px-4 py-4">
              {ex.data.map((block) => (
                <div key={block.label}>
                  <p className={sectionLabel}>{block.label}</p>
                  <dl className="mt-1.5">
                    {block.rows.map(([label, value]) => (
                      <DataRow key={label} label={label}>
                        <span className="font-mono tnum">{value}</span>
                      </DataRow>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}

          <div aria-live="polite" className="border-t border-line px-3 py-2.5">
            {submitted ? (
              <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-jade-soft px-3.5 py-3">
                <CircleCheck className="mt-0.5 size-4.5 shrink-0 text-jade" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink tnum">
                    Workings submitted · {total} of {total} checks passing
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
                    {practice
                      ? "Saved as a practice attempt because the answer was shown, so no marks were awarded."
                      : "Lesson marked complete. Your figures and formulas are saved with the attempt for Marcus Bell to review."}
                  </p>
                </div>
              </div>
            ) : confirming ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[var(--radius-md)] bg-amber-soft px-3.5 py-2.5">
                <TriangleAlert className="size-4 shrink-0 text-amber" />
                <p className="min-w-0 flex-1 basis-52 text-[13px] leading-snug text-ink">
                  <span className="font-semibold">Show the answer?</span> This
                  attempt becomes practice only and earns no marks.
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
                  onClick={() => setHints((h) => Math.min(ex.hints.length, h + 1))}
                  disabled={hints >= ex.hints.length}
                >
                  <Lightbulb className="size-3.5" /> Help me
                  <span className="text-ink-3 tnum">
                    {hints}/{ex.hints.length}
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
                  {/* The yellow button is always the next useful step. */}
                  <Button
                    size="xs"
                    variant={canSubmit ? "secondary" : "primary"}
                    onClick={() => {
                      setPane("yours");
                      setQueued({ ...raw });
                    }}
                    disabled={running}
                  >
                    {running ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <ClipboardCheck className="size-3.5" />
                    )}
                    {running ? "Checking…" : "Check workings"}
                  </Button>
                  <Button
                    size="xs"
                    variant={canSubmit ? "primary" : "secondary"}
                    onClick={submit}
                    disabled={!canSubmit}
                  >
                    <Send className="size-3.5" /> Submit
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Stacked, the instructions are a screen away; show hints beside the sheet. */}
          <WorkspaceHints
            hints={ex.hints}
            count={hints}
            className="border-t border-line px-4 py-3.5 @4xl:hidden"
          />

          <div className="border-t border-line px-4 pt-3 pb-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Segmented size="sm" items={WORKSPACE_PANES} value={pane} onChange={setPane} />
              {pane === "yours" && results && !running ? (
                <span className="ml-auto flex items-center gap-2">
                  {stale ? (
                    <span className="text-[12px] text-ink-3">Edited since this check</span>
                  ) : null}
                  <Badge
                    tone={passing === 0 ? "rose" : passing === total ? "jade" : "amber"}
                    dot
                  >
                    <span className="tnum">
                      {passing} of {total} passing
                    </span>
                  </Badge>
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              {pane === "expected" ? (
                <>
                  <WorkspaceOutput
                    ex={ex}
                    results={ex.checks.map((c) => ({ id: c.id, title: c.title, pass: true }))}
                  />
                  <p className="mt-2 text-[12px] text-ink-3">
                    A correct set of workings prints this. Match it, then submit.
                  </p>
                </>
              ) : running ? (
                <div
                  role="status"
                  className="min-h-[8.5rem] rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 font-mono text-[12px] leading-relaxed"
                >
                  <p className="text-ink-3">Checking {ex.sheet.toLowerCase()}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-ink-2">
                    <LoaderCircle className="size-3.5 animate-spin text-ink" /> Recalculating
                    and comparing {total} checks…
                  </p>
                </div>
              ) : results ? (
                <WorkspaceOutput ex={ex} results={results} />
              ) : (
                <div className="grid place-items-center rounded-[var(--radius-md)] border border-dashed border-line-strong bg-surface-2/50 px-5 py-7 text-center">
                  <span className="grid size-9 place-items-center rounded-full bg-surface-inv text-cta">
                    <FileSpreadsheet className="size-4" />
                  </span>
                  <p className="mt-3 text-[13.5px] font-semibold text-ink">No result yet</p>
                  <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-ink-3">
                    Check your workings to see which figures are right. Submit
                    unlocks when all {total} checks pass.
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

function WorkspaceCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[var(--radius-xs)] bg-surface-3 px-1 py-px font-mono text-[12px] text-ink">
      {children}
    </code>
  );
}

function WorkspaceHints({
  hints,
  count,
  showEmpty = false,
  className,
}: {
  hints: string[];
  count: number;
  showEmpty?: boolean;
  className?: string;
}) {
  if (count === 0 && !showEmpty) return null;
  return (
    <div className={className}>
      <p className={cn(sectionLabel, "flex items-center gap-1.5")}>
        <Lightbulb className="size-3.5" /> Hints
      </p>
      {count === 0 ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          Stuck? Help me reveals one hint at a time. Hints are free, showing the
          answer is not.
        </p>
      ) : (
        <ol className="mt-2.5 space-y-2">
          {hints.slice(0, count).map((hint, i) => (
            <li
              key={hint}
              className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5"
            >
              <p className="text-[11.5px] font-semibold text-amber tnum">
                Hint {i + 1} of {hints.length}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
                {hint
                  .split("`")
                  .map((part, j) => (j % 2 ? <WorkspaceCode key={j}>{part}</WorkspaceCode> : part))}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The check log, one row per step. */
function WorkspaceOutput({ ex, results }: { ex: Exercise; results: CheckResult[] }) {
  const ok = results.every((r) => r.pass);
  const passing = results.filter((r) => r.pass).length;
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 font-mono text-[12px] leading-relaxed">
      <p className="text-ink-3">Check workings · {ex.sheet}</p>
      <ul className="mt-1.5 space-y-1">
        {results.map((r) => (
          <li key={r.id}>
            <p className={cn("flex items-start gap-2", r.pass ? "text-jade" : "text-rose")}>
              {r.pass ? (
                <CircleCheck className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <CircleX className="mt-0.5 size-3.5 shrink-0" />
              )}
              <span>
                {r.pass ? "PASS" : "FAIL"} {r.title}
              </span>
            </p>
            {r.pass ? null : (
              <p className="pl-5.5 font-sans text-[12.5px] text-ink-2 [overflow-wrap:anywhere]">
                {r.message}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "mt-2 border-t border-line pt-2 tnum",
          ok ? "text-jade" : "text-rose",
        )}
      >
        {ok ? `All ${results.length} checks passing` : `${passing} of ${results.length} checks passing`}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- assignment */

const FR_RUBRIC: [string, number][] = [
  ["Goodwill and non-controlling interest workings", 12],
  ["Group retained earnings and consolidation adjustments", 10],
  ["Consolidated statement of financial position, presented to IAS 1", 10],
  ["Workings labelled and cross-referenced", 8],
];

export function AssignmentViewer({
  lesson,
  course,
}: {
  lesson: Lesson;
  course: Course;
}) {
  const [file, setFile] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const marks = FR_RUBRIC.reduce((n, [, m]) => n + m, 0);
  return (
    <div className="space-y-4">
      <div className={cn(frame, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="violet">Assignment</Badge>
          <span className="text-[12px] text-ink-3">Due Monday 28 September, 23:59 IST</span>
          <span className="ml-auto text-[12px] text-ink-3 tnum">
            1 attempt · marked by faculty against the FR rubric
          </span>
        </div>
        <h2 className="mt-3 font-display text-[1.6rem] leading-tight tracking-[var(--display-tracking)] text-ink">
          {lesson.title}
        </h2>
        <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          Using the consolidation workspace from this module, prepare the P
          group&apos;s consolidated statement of financial position at 30
          September 20X6 with your W1 to W5 workings. Upload the completed
          workings template, showing how each figure was calculated, the way you
          would in the spreadsheet response area of the {course.title} exam.
        </p>

        <div className="mt-5 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
          <p className={sectionLabel}>How this is marked</p>
          <ul className="mt-2.5 space-y-2">
            {FR_RUBRIC.map(([name, pts]) => (
              <li key={name} className="flex items-baseline justify-between gap-4 text-[13px]">
                <span className="text-ink-2">{name}</span>
                <span className="shrink-0 text-ink-3 tnum">{pts} marks</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-2.5 text-[12px] text-ink-3 tnum">
            {marks} marks · pass mark 50%, the same as the ACCA exam · the full
            rubric is visible before you submit
          </p>
        </div>
      </div>

      {submitted ? (
        <div className={cn(frame, "flex items-start gap-3 bg-jade-soft px-5 py-4")}>
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-jade" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Submitted for marking</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
              {file} · marks and feedback usually return within 5 working days.
            </p>
          </div>
        </div>
      ) : (
        <div className={cn(frame, "border-dashed px-6 py-10 text-center")}>
          <label className="grid cursor-pointer place-items-center rounded-[var(--radius-md)] py-2 transition-colors hover:bg-cta-soft">
            <input
              type="file"
              accept=".xlsx,.xls,.pdf"
              className="sr-only"
              onChange={(e) =>
                setFile(e.target.files?.[0]?.name ?? "Consolidation workings.xlsx")
              }
            />
            <Upload className="size-6 text-ink-3" />
            <span className="mt-3 text-[14px] font-semibold text-ink [overflow-wrap:anywhere]">
              {file ?? "Choose your workings file"}
            </span>
            <span className="mt-1 text-[12.5px] text-ink-3">
              Excel workbook or PDF · up to 25 MB
            </span>
          </label>
          {file ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                Remove
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSubmitted(true);
                  toast({ title: "Submitted for marking", body: file });
                }}
              >
                <Send className="size-3.5" /> Submit for marking
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- live */

export function LiveViewer({ lesson }: { lesson: Lesson }) {
  const [added, setAdded] = useState(false);
  return (
    <div className={frame}>
      <div className="relative overflow-hidden bg-surface-inv px-6 py-10 sm:px-10 sm:py-14">
        <div className="grain absolute inset-0" />
        <div className="absolute -top-24 -right-16 size-80 rounded-full bg-cta opacity-20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-inv/15 bg-ink-inv/10 px-3 py-1 text-[11.5px] font-semibold text-ink-inv/85">
            <LiveDot /> Saturday 19 September, 10:00 IST
          </span>
          <h2 className="mt-5 max-w-lg font-display text-[clamp(1.6rem,1.2rem+1.5vw,2.4rem)] leading-[1.08] tracking-[var(--display-tracking)] text-ink-inv">
            {lesson.title}
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-inv/65">
            Marcus Bell works a 20-mark consolidated statement of financial
            position question live, in the CBE spreadsheet, against the clock:
            what to set up first, where the time goes and which workings earn
            the easy marks.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => {
                setAdded(true);
                toast({
                  title: "Added to your calendar",
                  body: "Group accounts exam technique · Sat 19 Sep, 10:00 IST",
                });
              }}
              disabled={added}
            >
              {added ? <Check className="size-4" /> : <CalendarPlus className="size-4" />}
              {added ? "In your calendar" : "Add to calendar"}
            </Button>
            <span className="text-[12.5px] text-ink-inv/55 tnum">
              90 minutes · FR · Dec 2026 · Weekend · 31 of 38 registered · recorded
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <p className={sectionLabel}>Agenda</p>
          <ol className="mt-2.5 space-y-2">
            {[
              "Reading the requirement before touching the data",
              "The proforma and five workings, set up in the spreadsheet",
              "Goodwill, NCI and group retained earnings under time pressure",
              "Your questions from the module 3 workspaces",
            ].map((a, i) => (
              <li key={a} className="flex gap-2.5 text-[13.5px] text-ink-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-cta text-[11px] font-bold text-cta-ink tnum">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className={sectionLabel}>Before you join</p>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
            Finish the module 3 workspaces on goodwill and the consolidated
            statement of financial position. The session assumes you can already
            produce both workings.
          </p>
          <p className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-3">
            Cannot make it? The recording is added to this lesson and to
            Recordings within two hours, and watching it counts for completion.
          </p>
        </div>
      </div>
    </div>
  );
}
