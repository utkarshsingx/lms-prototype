"use client";

import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

function Google() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

function Microsoft() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
      <path fill="#F25022" d="M0 0h8.5v8.5H0z" />
      <path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z" />
      <path fill="#00A4EF" d="M0 9.5h8.5V18H0z" />
      <path fill="#FFB900" d="M9.5 9.5H18V18H9.5z" />
    </svg>
  );
}

const base =
  "flex h-10.5 items-center justify-center gap-2.5 rounded-[var(--radius-md)] border border-line bg-surface text-[13.5px] font-medium text-ink shadow-[var(--shadow-e1)] transition-colors hover:bg-surface-2 hover:border-line-strong";

export function SsoButtons() {
  const router = useRouter();
  const go = () => router.push("/dashboard");
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <button onClick={go} className={base}>
        <Google /> Google
      </button>
      <button onClick={go} className={base}>
        <Microsoft /> Microsoft
      </button>
      <button onClick={go} className={base + " sm:col-span-2"}>
        <KeyRound className="size-4 text-ink-3" /> Continue with SAML single sign-on
      </button>
    </div>
  );
}
