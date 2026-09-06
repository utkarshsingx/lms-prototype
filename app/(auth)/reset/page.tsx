"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function ResetPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("anaya.rao@northwind.co");

  if (sent) {
    return (
      <div>
        <span className="mb-6 grid size-11 place-items-center rounded-full bg-jade-soft text-jade">
          <MailCheck className="size-5" />
        </span>
        <h1 className="font-display text-[2.35rem] leading-[1.05] tracking-[var(--display-tracking)] text-ink">
          Check your inbox
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
          If <span className="font-medium text-ink">{email}</span> belongs to a
          Northwind account, a reset link is on its way. It expires in 30
          minutes and can only be used once.
        </p>
        <div className="mt-7 flex gap-2.5">
          <Button variant="secondary" onClick={() => setSent(false)}>
            <ArrowLeft className="size-4" /> Use a different address
          </Button>
        </div>
        <p className="mt-8 text-[13px] text-ink-3">
          Still nothing after five minutes? Check spam, then ask your workspace
          admin whether SSO is enforced on your account — SSO accounts do not
          have a password to reset.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[2.35rem] leading-[1.05] tracking-[var(--display-tracking)] text-ink">
        Reset your password
      </h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
        Enter the email you sign in with and we will send a single-use link.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
        className="mt-7 space-y-4"
      >
        <Field label="Work email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Button size="lg" className="w-full">
          Send reset link <Send className="size-4" />
        </Button>
      </form>
      <p className="mt-8 text-[13.5px] text-ink-2">
        <Link href="/login" className="font-medium text-brand hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
