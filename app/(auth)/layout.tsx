import Link from "next/link";
import { Wordmark } from "@/components/shell/brand";
import { AuthAside } from "@/components/marketing/auth-aside";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,29rem)_minmax(0,1fr)]">
      <AuthAside />

      <div className="flex min-h-dvh min-w-0 flex-col px-4 py-6 sm:px-10 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between gap-4">
          <span className="lg:invisible">
            <Wordmark href="/" />
          </span>
          <Link
            href="/"
            className="text-[13px] font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-4 transition-colors hover:text-ink"
          >
            Back to site
          </Link>
        </header>

        <div className="flex flex-1 justify-center py-8 sm:py-12">
          <div className="w-full max-w-[46rem]">{children}</div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-[12px] text-ink-3">
          <span>© 2026 ZSkillup</span>
          <Link href="/" className="hover:text-ink-2">
            Privacy
          </Link>
          <Link href="/" className="hover:text-ink-2">
            Terms
          </Link>
          <span className="ml-auto">Sample data for demonstration</span>
        </footer>
      </div>
    </div>
  );
}
