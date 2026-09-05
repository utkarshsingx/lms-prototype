import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "inverse";
type Size = "xs" | "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out-quint)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand shadow-[var(--shadow-e2)] hover:bg-brand-hover hover:shadow-[var(--shadow-e3)]",
  secondary:
    "bg-surface text-ink border border-line shadow-[var(--shadow-e1)] hover:bg-surface-2 hover:border-line-strong",
  outline:
    "border border-line-strong text-ink hover:bg-surface-2 hover:border-ink-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-rose text-white shadow-[var(--shadow-e2)] hover:brightness-110",
  inverse:
    "bg-surface-inv text-ink-inv shadow-[var(--shadow-e2)] hover:opacity-90",
};

const sizes: Record<Size, string> = {
  xs: "h-7 rounded-[var(--radius-xs)] px-2.5 text-[12.5px]",
  sm: "h-9 rounded-[var(--radius-sm)] px-3.5 text-[13.5px]",
  md: "h-10.5 rounded-[var(--radius-md)] px-4.5 text-[14px]",
  lg: "h-12 rounded-[var(--radius-md)] px-6 text-[15px]",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** Square icon-only button. Keeps hit targets honest at every size. */
export function IconButton({
  variant = "ghost",
  size = "md",
  className,
  label,
  ...props
}: ButtonProps & { label: string }) {
  const box = { xs: "size-7", sm: "size-9", md: "size-10", lg: "size-11" }[size];
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        base,
        variants[variant],
        box,
        "rounded-[var(--radius-sm)] p-0",
        className,
      )}
      {...props}
    />
  );
}
