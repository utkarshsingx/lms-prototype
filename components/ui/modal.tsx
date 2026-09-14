"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

const scrim = "absolute inset-0 bg-[rgb(8_9_12/0.5)] backdrop-blur-[3px]";

export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-100 grid place-items-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className={scrim}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-[var(--shadow-e4)]",
              width,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
              <div className="min-w-0">
                <h2 className="font-display text-[20px] leading-tight tracking-[var(--display-tracking)] text-ink">
                  {title}
                </h2>
                {sub ? (
                  <p className="mt-1 text-[13px] leading-snug text-ink-3">{sub}</p>
                ) : null}
              </div>
              <IconButton
                label="Close"
                size="sm"
                variant="outline"
                onClick={onClose}
                className="-mt-0.5 -mr-1.5"
              >
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-surface-2 px-6 py-3.5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  sub,
  footer,
  children,
  width = "w-full max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** One line under the title. */
  sub?: React.ReactNode;
  /** Pinned below the scrolling body: the drawer's actions. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-100 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className={scrim}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex h-full flex-col overflow-hidden border-l border-line bg-surface shadow-[var(--shadow-e4)] sm:rounded-l-[var(--radius-xl)]",
              width,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 pt-4.5 pb-4">
              <div className="min-w-0">
                <h2 className="font-display text-[19px] leading-tight tracking-[var(--display-tracking)] text-ink">
                  {title}
                </h2>
                {sub ? (
                  <p className="mt-1 text-[13px] leading-snug text-ink-3">{sub}</p>
                ) : null}
              </div>
              <IconButton
                label="Close"
                size="sm"
                variant="outline"
                onClick={onClose}
                className="-mt-0.5"
              >
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
              {children}
            </div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-surface-2 px-5 py-3.5">
                {footer}
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
