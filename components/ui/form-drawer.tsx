"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Drawer } from "./modal";

/**
 * Right-hand Drawer holding a form, with a pinned footer (Cancel, primary submit).
 * Native validation runs first, so `required` fields block `onSubmit`.
 */
export function FormDrawer({
  open,
  onClose,
  title,
  sub,
  submitLabel,
  onSubmit,
  children,
  disabled = false,
  disabledReason,
  cancelLabel = "Cancel",
  footerNote,
  destructive = false,
  width = "w-full max-w-lg",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  submitLabel: string;
  /** Receives the form's FormData; controlled fields can ignore it. */
  onSubmit: (data: FormData) => void;
  children: React.ReactNode;
  /** Disables submit, e.g. for a view-only persona or an incomplete form. */
  disabled?: boolean;
  /** Tooltip on the disabled submit button. */
  disabledReason?: string;
  cancelLabel?: string;
  /** Small text on the left of the footer, e.g. "The student is notified". */
  footerNote?: React.ReactNode;
  destructive?: boolean;
  width?: string;
  /** Applied to the form body. */
  className?: string;
}) {
  // The footer renders outside the <form>, so the submit button targets it by id.
  const formId = useId();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={width}
      title={title}
      sub={sub}
      footer={
        <>
          {footerNote ? <p className="mr-auto min-w-0 text-[12.5px] text-ink-3">{footerNote}</p> : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          {/* Tooltip on a wrapper: the disabled button has pointer-events off. */}
          <span title={disabled ? disabledReason : undefined} className="inline-flex">
            <Button
              type="submit"
              form={formId}
              variant={destructive ? "danger" : "primary"}
              disabled={disabled}
            >
              {submitLabel}
            </Button>
          </span>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled) return;
          onSubmit(new FormData(e.currentTarget));
        }}
        className={cn("space-y-4 px-5 py-5", className)}
      >
        {children}
      </form>
    </Drawer>
  );
}
