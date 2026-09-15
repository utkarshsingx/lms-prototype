"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Check, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PasswordInput, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { studentPersonaFor, useSwitchPersona, type StudentType } from "@/lib/role";
import { toast } from "@/components/ui/toast";

const TYPES: {
  id: StudentType;
  label: string;
  sub: string;
  icon: typeof GraduationCap;
}[] = [
  {
    id: "graduate",
    label: "Graduate ACCA learner",
    sub: "You hold or are finishing a degree and study ACCA with ZSkillup directly.",
    icon: GraduationCap,
  },
  {
    id: "undergraduate",
    label: "University undergraduate",
    sub: "You are enrolled in a partner university degree with ACCA built in.",
    icon: Building2,
  },
];

const UNIVERSITIES = [
  { id: "u-brightwater", name: "Brightwater University · Pune", programme: "B.Com (Hons) with ACCA" },
  { id: "u-coastline", name: "Coastline University · Kochi", programme: "B.Com with ACCA Pathway" },
  { id: "u-northfield", name: "Northfield University · Gurugram", programme: "BBA Finance with ACCA" },
];

const PROGRAMMES = [
  "ACCA Graduate Pathway",
  "ACCA Fast Track for B.Com graduates",
  "Strategic Professional Track (SBL, SBR, options)",
];

const QUALIFICATIONS = ["B.Com", "BBA", "M.Com", "MBA (Finance)", "CA Intermediate", "Other degree"];

const PREFILL: Record<StudentType, { first: string; last: string; email: string }> = {
  graduate: { first: "Anaya", last: "Rao", email: "anaya.rao@students.zskillup.com" },
  undergraduate: { first: "Rohan", last: "Iyer", email: "rohan.iyer@students.zskillup.com" },
};

export default function SignupPage() {
  const switchPersona = useSwitchPersona();
  const [type, setType] = useState<StudentType>("graduate");
  const [universityId, setUniversityId] = useState(UNIVERSITIES[0].id);
  const [busy, setBusy] = useState(false);
  const university = UNIVERSITIES.find((u) => u.id === universityId) ?? UNIVERSITIES[0];
  const prefill = PREFILL[type];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      toast({
        title: "Student account created",
        body:
          type === "graduate"
            ? "Next: upload your qualification documents for an exemption evaluation."
            : `Next: ${university.name.split(" · ")[0]} verifies your enrolment.`,
      });
      switchPersona(studentPersonaFor(type).id, "/dashboard");
    }, 650);
  }

  return (
    <div className="mx-auto max-w-[34rem]">
      <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
        Student sign-up
      </p>
      <h1 className="mt-2 font-display text-[clamp(2rem,1.6rem+1.6vw,2.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
        Create your student account
      </h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
        One account for your whole ACCA journey. Your dashboard adapts to how you study.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-5">
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-medium text-ink-2">How are you studying ACCA?</legend>
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
            {TYPES.map((t) => {
              const on = t.id === type;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex flex-col items-start gap-2.5 rounded-[var(--radius-lg)] border bg-surface p-4 text-left transition-[border-color,box-shadow]",
                    on
                      ? "border-nav-active shadow-[0_0_0_3px_var(--cta)]"
                      : "border-line hover:border-line-strong hover:bg-cta-soft",
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-[var(--radius-md)]",
                        on ? "bg-nav-active text-nav-active-icon" : "bg-surface-2 text-ink-2",
                      )}
                    >
                      <t.icon className="size-4.5" />
                    </span>
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full border",
                        on ? "border-transparent bg-cta text-cta-ink" : "border-line-strong",
                      )}
                    >
                      {on ? <Check className="size-3" strokeWidth={3.2} /> : null}
                    </span>
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold text-ink">{t.label}</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-ink-3">{t.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2" key={type}>
          <Field label="First name">
            <Input defaultValue={prefill.first} autoComplete="given-name" required />
          </Field>
          <Field label="Last name">
            <Input defaultValue={prefill.last} autoComplete="family-name" required />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <Input type="email" defaultValue={prefill.email} autoComplete="email" required />
          </Field>
          <Field label="Mobile number" hint="For class and exam-entry reminders">
            <Input type="tel" defaultValue="+91 98450 21374" autoComplete="tel" />
          </Field>
          <Field label="ACCA student ID" hint="If already registered">
            <Input inputMode="numeric" placeholder="7 digits" className="font-mono" />
          </Field>
        </div>

        {type === "graduate" ? (
          <div className="grid gap-4 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4 sm:grid-cols-2">
            <Field label="Highest qualification">
              <Select defaultValue="B.Com">
                {QUALIFICATIONS.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </Select>
            </Field>
            <Field label="Programme">
              <Select defaultValue={PROGRAMMES[0]}>
                {PROGRAMMES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <p className="text-[12.5px] leading-relaxed text-ink-3 sm:col-span-2">
              After sign-up you can upload degree certificates and mark sheets. The
              programme team estimates your exemptions first, then ACCA confirms them.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4 sm:grid-cols-2">
            <Field label="University" className="sm:col-span-2" hint={university.programme}>
              <Select value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
                {UNIVERSITIES.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="University enrolment number">
              <Input defaultValue="BWU-BC-25-0418" className="font-mono" />
            </Field>
            <Field label="Current semester">
              <Select defaultValue="Semester 3">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <option key={s}>{`Semester ${s}`}</option>
                ))}
              </Select>
            </Field>
            <p className="text-[12.5px] leading-relaxed text-ink-3 sm:col-span-2">
              Your university verifies your enrolment, then your cohort, semester roadmap
              and university announcements appear on your dashboard.
            </p>
          </div>
        )}

        <Field label="Password" hint="At least 10 characters">
          <PasswordInput defaultValue="acca-lms-2026" autoComplete="new-password" required />
        </Field>

        <Checkbox
          defaultChecked
          required
          label="I agree to the terms and the data and privacy policy. My mentor and programme team can see my learning progress."
        />

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creating your account
            </>
          ) : (
            <>
              Create account <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-7 text-[13.5px] text-ink-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-ink underline decoration-cta decoration-2 underline-offset-2"
        >
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-[12.5px] text-ink-3">
        Staff and university accounts are added by a ZSkillup Super Admin or your university.
      </p>
    </div>
  );
}
