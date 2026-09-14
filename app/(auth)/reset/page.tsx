"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function ResetPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("anaya.rao@students.zskillup.com");

  return (
    <div className="mx-auto max-w-[28rem]">
      {sent ? (
        <>
          <span className="mb-6 grid size-12 place-items-center rounded-full bg-cta text-cta-ink">
            <MailCheck className="size-5" />
          </span>
          <h1 className="font-display text-[clamp(2rem,1.6rem+1.6vw,2.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Check your inbox
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
            If <span className="font-semibold text-ink">{email}</span> belongs to an ACCA LMS
            account, a reset link is on its way. It expires in 30 minutes and works once.
          </p>
          <div className="mt-7">
            <Button variant="secondary" onClick={() => setSent(false)}>
              <ArrowLeft className="size-4" /> Use a different address
            </Button>
          </div>
          <div className="mt-8 space-y-2 rounded-[var(--radius-lg)] border border-line bg-surface p-4 text-[13px] leading-relaxed text-ink-2">
            <p>
              <span className="font-semibold text-ink">Nothing after five minutes?</span> Check
              spam, then contact ZSkillup student support with your ACCA student ID.
            </p>
            <p>
              <span className="font-semibold text-ink">Sign in with university single sign-on?</span>{" "}
              Your university manages that password, so contact your university IT desk.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
            Account recovery
          </p>
          <h1 className="mt-2 font-display text-[clamp(2rem,1.6rem+1.6vw,2.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Reset your password
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
            Enter the email you use for ACCA LMS. Students, staff and university users all
            reset here. Your ACCA student ID and exam entries are not affected.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="mt-7 space-y-4"
          >
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              Send reset link <Send className="size-4" />
            </Button>
          </form>
        </>
      )}

      <p className="mt-8 text-[13.5px] text-ink-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-ink underline decoration-cta decoration-2 underline-offset-2"
        >
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      </p>
    </div>
  );
}
