import Link from "next/link";
import { Mark } from "@/components/shell/brand";
import { AuthAside } from "@/components/marketing/auth-aside";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,44rem)] xl:grid-cols-[1fr_minmax(0,48rem)]">
      <div className="flex min-h-dvh flex-col px-6 py-7 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <Mark className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-rotate-6" />
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
              Meridian
            </span>
          </Link>
          <Link
            href="/"
            className="text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            Back to site
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-3">
          <span>© 2026 Northwind</span>
          <Link href="/" className="hover:text-ink-2">
            Privacy
          </Link>
          <Link href="/" className="hover:text-ink-2">
            Terms
          </Link>
          <span className="ml-auto">Prototype · no real accounts</span>
        </footer>
      </div>

      <AuthAside />
    </div>
  );
}
