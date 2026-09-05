"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[var(--radius-md)] border border-line bg-surface px-3.5 text-[14px] text-ink " +
  "placeholder:text-ink-3 shadow-[var(--shadow-e1)] transition-[border-color,box-shadow] duration-150 " +
  "hover:border-line-strong focus:border-brand focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none " +
  "disabled:bg-surface-2 disabled:text-ink-3";

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="text-[12.5px] font-medium text-ink-2"
      >
        {children}
      </label>
      {hint ? <span className="text-[12px] text-ink-3">{hint}</span> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <Label hint={hint}>{label}</Label> : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] text-rose">{error}</p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3 [&>svg]:size-4">
          {icon}
        </span>
        <input className={cn(control, "h-10.5 pl-10", className)} {...props} />
      </div>
    );
  }
  return <input className={cn(control, "h-10.5", className)} {...props} />;
}

export function PasswordInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={cn(control, "h-10.5 pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-[var(--radius-xs)] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(control, "py-2.5 leading-relaxed", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(control, "h-10.5 cursor-pointer appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 12 12"
        className="pointer-events-none absolute top-1/2 right-3.5 size-3 -translate-y-1/2 text-ink-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  const id = useId();
  return (
    <label
      htmlFor={props.id ?? id}
      className={cn("group flex cursor-pointer items-start gap-2.5", className)}
    >
      <input
        id={props.id ?? id}
        type="checkbox"
        className="peer sr-only"
        {...props}
      />
      <span className="mt-px grid size-4.5 shrink-0 place-items-center rounded-[5px] border border-line-strong bg-surface transition-all peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:shadow-[0_0_0_3px_var(--ring)] peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100">
        <svg
          viewBox="0 0 12 12"
          className="size-3 scale-50 text-on-brand opacity-0 transition-all duration-150"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2.5 6.2 4.8 8.5 9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label ? (
        <span className="text-[13.5px] leading-relaxed text-ink-2">{label}</span>
      ) : null}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      {label ? (
        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium text-ink">{label}</span>
          {sub ? (
            <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">
              {sub}
            </span>
          ) : null}
        </span>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10.5 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-brand" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[var(--shadow-e2)] transition-transform duration-200 ease-[var(--ease-out-quint)]",
            checked && "translate-x-4.5",
          )}
        />
      </button>
    </label>
  );
}
