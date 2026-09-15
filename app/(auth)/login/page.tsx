"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PasswordInput } from "@/components/ui/field";
import { Divider } from "@/components/ui/misc";
import { SsoButtons } from "@/components/marketing/sso-buttons";
import { ROLE_ICONS } from "@/lib/nav";
import {
  DEFAULT_PERSONA_ID,
  ROLES,
  personaById,
  personaInitials,
  personasForRole,
  roleMeta,
  useSwitchPersona,
  type RoleId,
} from "@/lib/role";
import { cn } from "@/lib/cn";

const DEMO_PASSWORD = "acca-lms-2026";

/** `/login?role=faculty` or `/login?as=p-deepa` preselects a login. */
function initialPersonaId(role: string | null, as: string | null): string {
  if (personaById(as)) return as as string;
  const meta = ROLES.find((r) => r.id === role);
  return meta ? meta.personaIds[0] : DEFAULT_PERSONA_ID;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginChooser initialId={DEFAULT_PERSONA_ID} />}>
      <LoginFromParams />
    </Suspense>
  );
}

function LoginFromParams() {
  const params = useSearchParams();
  const id = initialPersonaId(params.get("role"), params.get("as"));
  return <LoginChooser key={id} initialId={id} />;
}

function LoginChooser({ initialId }: { initialId: string }) {
  const switchPersona = useSwitchPersona();
  const [personaId, setPersonaId] = useState(initialId);
  const persona = personaById(personaId) ?? personaById(DEFAULT_PERSONA_ID)!;
  const [email, setEmail] = useState(persona.email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState(false);
  const meta = roleMeta(persona.role);

  function choose(id: string) {
    const next = personaById(id);
    if (!next) return;
    setPersonaId(next.id);
    setEmail(next.email);
    setPassword(DEMO_PASSWORD);
  }

  function chooseRole(role: RoleId) {
    if (persona.role === role) return;
    choose(personasForRole(role)[0].id);
  }

  function signIn() {
    if (busy) return;
    setBusy(true);
    setTimeout(() => switchPersona(persona.id), 520);
  }

  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
        Sign in to ACCA LMS
      </p>
      <h1 className="mt-2 font-display text-[clamp(2rem,1.6rem+1.6vw,2.6rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
        Choose how you sign in
      </h1>
      <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-2">
        Six logins share one ACCA record. Pick your login, then the person signing in,
        and each one opens its own workspace.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Login">
        {ROLES.map((r) => {
          const selected = r.id === persona.role;
          const Icon = ROLE_ICONS[r.id];
          return (
            <div
              key={r.id}
              className={cn(
                "flex flex-col rounded-[var(--radius-lg)] border bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-150",
                selected
                  ? "border-nav-active shadow-[0_0_0_3px_var(--cta)]"
                  : "border-line hover:border-line-strong",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => chooseRole(r.id)}
                className="flex items-start gap-3 text-left"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] transition-colors",
                    selected ? "bg-nav-active text-nav-active-icon" : "bg-surface-2 text-ink-2",
                  )}
                >
                  <Icon className="size-5" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[14.5px] leading-tight font-bold text-ink">
                      {r.label}
                    </span>
                    {selected ? (
                      <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-cta text-cta-ink">
                        <Check className="size-3" strokeWidth={3.2} />
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-ink-3">{r.who}</span>
                </span>
              </button>

              <div className="mt-3.5 flex flex-wrap gap-1.5 pl-13">
                {personasForRole(r.id).map((p) => {
                  const on = p.id === persona.id;
                  const label = r.id === "student" ? p.access : p.name;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => choose(p.id)}
                      aria-pressed={on}
                      title={`${p.name} · ${p.title} · ${p.access}`}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                        on
                          ? "border-nav-active bg-nav-active text-nav-active-ink"
                          : "border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:bg-cta-soft hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn();
        }}
        className="mt-5 rounded-[var(--radius-xl)] border border-line bg-surface p-5 sm:p-6"
      >
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-inv text-[15px] font-bold text-ink-inv ring-2 ring-cta ring-offset-2 ring-offset-surface">
            {personaInitials(persona.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-ink">{persona.name}</p>
            <p className="truncate text-[12.5px] text-ink-3">{persona.title}</p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-cta-soft px-2.5 py-1 text-[11.5px] font-semibold text-ink sm:inline">
            {persona.access}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Email">
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
                className="font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-2 hover:text-ink"
              >
                Forgot password?
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
        </div>

        <div className="mt-4">
          <Checkbox label="Keep me signed in on this device" defaultChecked />
        </div>

        <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Opening {meta.short} workspace
            </>
          ) : (
            <>
              Sign in as {persona.name} <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <div className="my-5">
          <Divider label="or" />
        </div>

        <SsoButtons onContinue={signIn} disabled={busy} />
      </form>

      <p className="mt-6 text-[13.5px] text-ink-2">
        New ACCA learner?{" "}
        <Link
          href="/signup"
          className="font-semibold text-ink underline decoration-cta decoration-2 underline-offset-2"
        >
          Create a student account
        </Link>
      </p>
      <p className="mt-2 text-[12.5px] text-ink-3">
        Already inside? Switch login any time from the Signed in as card in the sidebar.
      </p>
    </div>
  );
}
