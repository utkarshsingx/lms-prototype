"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PasswordInput } from "@/components/ui/field";
import { Divider } from "@/components/ui/misc";
import { SsoButtons } from "@/components/marketing/sso-buttons";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("anaya.rao@northwind.co");
  const [password, setPassword] = useState("meridian-demo");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => router.push("/dashboard"), 620);
  }

  return (
    <div>
      <h1 className="font-display text-[2.35rem] leading-[1.05] tracking-[var(--display-tracking)] text-ink">
        Welcome back
      </h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
        Pick up where you left off. You are 62% through Distributed Systems and
        one lab away from unlocking the capstone.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Work email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Password"
          hint={
            <Link
              href="/reset"
              className="font-medium text-brand hover:underline"
            >
              Forgot?
            </Link>
          }
        >
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <div className="flex items-center justify-between pt-0.5">
          <Checkbox label="Keep me signed in" defaultChecked />
        </div>

        <Button size="lg" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Signing in
            </>
          ) : (
            <>
              Sign in <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-6">
        <Divider label="or" />
      </div>

      <SsoButtons />

      <p className="mt-8 text-[13.5px] text-ink-2">
        New to Meridian?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-6 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-3">
        Prototype: the form is pre-filled and any credentials sign you in. Use
        the Learner / Admin switch in the sidebar to see both sides of the
        product.
      </p>
    </div>
  );
}
