import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "inverse";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

type Variant = ButtonVariant;
type Size = ButtonSize;

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform,translate,opacity] duration-150 ease-[var(--ease-out-quint)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  /* Yellow to gold with dark ink (theme brand gradient elsewhere). */
  primary: "btn-cta font-bold",
  /* The black identity button. In dark mode a faint inner edge keeps it from
     dissolving into a dark card. */
  secondary:
    "bg-surface-inv font-semibold text-ink-inv hover:bg-surface-inv/88 dark:ring-1 dark:ring-inset dark:ring-white/10",
  outline:
    "border border-line-strong bg-surface font-semibold text-ink hover:border-ink-3 hover:bg-cta-soft",
  ghost: "font-semibold text-ink-2 hover:bg-cta-soft hover:text-ink",
  danger: "bg-rose font-semibold text-on-accent hover:bg-rose/90",
  /* For use on an inverse surface (hero band, stage): the surface's own ink
     as the fill, so it reads in both modes and every theme. */
  inverse: "bg-ink-inv font-semibold text-surface-inv hover:bg-ink-inv/90",
};

const sizes: Record<Size, string> = {
  xs: "h-7 rounded-[var(--radius-sm)] px-2.5 text-[12.5px]",
  sm: "h-9 rounded-[var(--radius-md)] px-3.5 text-[13.5px]",
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
        size === "xs"
          ? "rounded-[var(--radius-xs)]"
          : "rounded-[var(--radius-md)]",
        "p-0",
        className,
      )}
      {...props}
    />
  );
}
