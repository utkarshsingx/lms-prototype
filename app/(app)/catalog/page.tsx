"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { categories, courses } from "@/lib/data";
import { CourseCard } from "@/components/course/course-card";
import { SectionTitle } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const LEVELS = ["Any level", "Foundational", "Intermediate", "Advanced"];
const SORTS = [
  { id: "popular", label: "Most enrolled" },
  { id: "rating", label: "Highest rated" },
  { id: "new", label: "Recently updated" },
  { id: "short", label: "Shortest first" },
];

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState(LEVELS[0]);
  const [sort, setSort] = useState("popular");
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  const published = useMemo(
    () => courses.filter((c) => c.status === "published"),
    [],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = published.filter((c) => {
      if (cat !== "all" && c.category !== cat) return false;
      if (level !== LEVELS[0] && c.level !== level) return false;
      if (mandatoryOnly && !c.compliance?.mandatory) return false;
      if (!needle) return true;
      return (
        c.title.toLowerCase().includes(needle) ||
        c.subtitle.toLowerCase().includes(needle) ||
        c.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
    return out.sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "new") return a.updated < b.updated ? 1 : -1;
      if (sort === "short") return a.hours - b.hours;
      return b.enrolled - a.enrolled;
    });
  }, [published, q, cat, level, sort, mandatoryOnly]);

  const filtered = cat !== "all" || level !== LEVELS[0] || mandatoryOnly || q;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Catalog"
        title="Everything you can learn here"
        sub={`${published.length} published courses across ${categories.length} categories. Compliance courses are assigned to you automatically; everything else is yours to pick up.`}
      />

      {!filtered ? (
        <section>
          <SectionTitle
            action={
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <Sparkles className="size-3.5 text-violet" />
                Matched to your path and level
              </span>
            }
          >
            Recommended for you
          </SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {published
              .filter((c) => c.progress == null)
              .slice(0, 3)
              .map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-56 flex-1">
            <Input
              icon={<Search />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title, topic or tag…"
            />
          </div>
          <div className="w-40">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <button
            onClick={() => setMandatoryOnly((m) => !m)}
            className={cn(
              "inline-flex h-10.5 items-center gap-2 rounded-[var(--radius-md)] border px-3.5 text-[13px] font-medium transition-colors",
              mandatoryOnly
                ? "border-rose bg-rose-soft text-rose"
                : "border-line bg-surface text-ink-2 hover:border-line-strong",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            Required only
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={cat}
            onChange={setCat}
            size="sm"
            items={[
              { id: "all", label: "All" },
              ...categories.map((c) => ({ id: c, label: c })),
            ]}
          />
          {filtered ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setQ("");
                setCat("all");
                setLevel(LEVELS[0]);
                setMandatoryOnly(false);
              }}
            >
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}
          <span className="ml-auto text-[12.5px] text-ink-3 tnum">
            {results.length} {results.length === 1 ? "course" : "courses"}
          </span>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No courses match those filters"
          sub="Try widening the level, or clear the search. If something genuinely is not here, the assistant can request it from the learning team."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQ("");
                setCat("all");
                setLevel(LEVELS[0]);
                setMandatoryOnly(false);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {results.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
