"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PasswordInput, Select } from "@/components/ui/field";
import { Divider } from "@/components/ui/misc";
import { SsoButtons } from "@/components/marketing/sso-buttons";
import { paths } from "@/lib/data";
import { cn } from "@/lib/cn";

const STEPS = ["Account", "Your role", "Focus"];

const GOALS = [
  "Distributed systems",
  "Applied AI and LLMs",
  "Data modelling",
  "Design systems",
  "Accessibility",
  "Cloud cost",
  "People management",
  "Technical writing",
  "Security",
];

const LEVELS = [
  ["new", "New to the field", "0–2 years"],
  ["working", "Working practitioner", "2–6 years"],
  ["senior", "Senior or lead", "6+ years"],
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState<string>("working");
  const [goals, setGoals] = useState<string[]>(["Distributed systems"]);

  const recommended =
    goals.includes("Applied AI and LLMs")
      ? paths.find((p) => p.slug === "applied-ai-practitioner")
      : goals.includes("Design systems") || goals.includes("Accessibility")
        ? paths.find((p) => p.slug === "design-systems-track")
        : goals.includes("People management")
          ? paths.find((p) => p.slug === "new-manager-transition")
          : paths.find((p) => p.slug === "backend-engineer-l3-to-l4");

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) return setStep((s) => s + 1);
    setBusy(true);
    setTimeout(() => router.push("/dashboard"), 700);
  }

  return (
    <div>
      {/* Step rail */}
      <div className="mb-8 flex items-center gap-2.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span
                className={cn(
                  "h-1 rounded-full transition-colors duration-300",
                  i <= step ? "bg-brand" : "bg-surface-3",
                )}
              />
              <span
                className={cn(
                  "truncate text-[11px] font-medium transition-colors",
                  i <= step ? "text-ink-2" : "text-ink-3",
                )}
              >
                {i < step ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-3 text-jade" strokeWidth={3} /> {s}
                  </span>
                ) : (
                  s
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 ? (
            <>
              <h1 className="font-display text-[2.35rem] leading-[1.05] tracking-[-0.02em] text-ink">
                Create your account
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                Three short steps. We use them to put you on the right path
                rather than dropping you into a catalogue of 240 courses.
              </p>
              <form onSubmit={next} className="mt-7 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input defaultValue="Anaya" required />
                  </Field>
                  <Field label="Last name">
                    <Input defaultValue="Rao" required />
                  </Field>
                </div>
                <Field label="Work email" hint="Your domain decides your workspace">
                  <Input type="email" defaultValue="anaya.rao@northwind.co" required />
                </Field>
                <Field label="Password" hint="12 characters minimum">
                  <PasswordInput defaultValue="meridian-demo" required />
                </Field>
                <Checkbox
                  defaultChecked
                  label={
                    <>
                      I agree to the terms and the learning data policy.
                      Progress is visible to my manager; chat and call
                      transcripts are not.
                    </>
                  }
                />
                <Button size="lg" className="w-full">
                  Continue <ArrowRight className="size-4" />
                </Button>
              </form>
              <div className="my-6">
                <Divider label="or" />
              </div>
              <SsoButtons />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h1 className="font-display text-[2.35rem] leading-[1.05] tracking-[-0.02em] text-ink">
                What do you do here?
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                This sets your default assignments and the compliance items that
                apply to you.
              </p>
              <form onSubmit={next} className="mt-7 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Department">
                    <Select defaultValue="Engineering">
                      {["Engineering", "Data", "Design", "Product", "Revenue", "People", "Legal"].map(
                        (d) => (
                          <option key={d}>{d}</option>
                        ),
                      )}
                    </Select>
                  </Field>
                  <Field label="Location">
                    <Select defaultValue="Bengaluru">
                      {["Bengaluru", "Manchester", "Stockholm", "Tokyo", "Austin", "Lisbon", "Remote"].map(
                        (d) => (
                          <option key={d}>{d}</option>
                        ),
                      )}
                    </Select>
                  </Field>
                </div>
                <Field label="Job title">
                  <Input defaultValue="Product Engineer" />
                </Field>

                <Field label="Experience">
                  <div className="grid gap-2">
                    {LEVELS.map(([id, label, sub]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLevel(id)}
                        className={cn(
                          "flex items-center justify-between rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-all",
                          level === id
                            ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--ring)]"
                            : "border-line bg-surface hover:border-line-strong",
                        )}
                      >
                        <span>
                          <span className="block text-[13.5px] font-medium text-ink">
                            {label}
                          </span>
                          <span className="text-[12px] text-ink-3">{sub}</span>
                        </span>
                        <span
                          className={cn(
                            "grid size-4.5 place-items-center rounded-full border transition-colors",
                            level === id
                              ? "border-brand bg-brand text-on-brand"
                              : "border-line-strong",
                          )}
                        >
                          {level === id ? (
                            <Check className="size-2.5" strokeWidth={3.5} />
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setStep(0)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button size="lg" className="flex-1">
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className="font-display text-[2.35rem] leading-[1.05] tracking-[-0.02em] text-ink">
                What are you aiming at?
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                Pick as many as apply. You can change this any time, and the
                assistant will nudge you if your choices and your calendar
                disagree.
              </p>

              <form onSubmit={next} className="mt-7 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => {
                    const on = goals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setGoals((cur) =>
                            on ? cur.filter((x) => x !== g) : [...cur, g],
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all",
                          on
                            ? "border-brand bg-brand text-on-brand shadow-[var(--shadow-e2)]"
                            : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                        )}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>

                {recommended ? (
                  <motion.div
                    key={recommended.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[var(--radius-lg)] border border-brand-line bg-brand-soft p-4"
                  >
                    <p className="text-[10.5px] font-semibold tracking-[0.14em] text-brand uppercase">
                      Your starting path
                    </p>
                    <p className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                      {recommended.title}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                      {recommended.purpose}
                    </p>
                    <p className="mt-2.5 text-[12px] text-ink-3 tnum">
                      {recommended.steps.length} courses · {recommended.weeks} weeks ·{" "}
                      {recommended.completionRate}% of peers finish
                    </p>
                  </motion.div>
                ) : null}

                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button size="lg" className="flex-1" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Setting up
                      </>
                    ) : (
                      <>
                        Start learning <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <p className="mt-8 text-[13.5px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
