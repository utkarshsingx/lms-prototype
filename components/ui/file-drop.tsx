"use client";

import { useId, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/cn";

function accepts(file: { name: string; type: string }, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .some((a) => {
      if (a.startsWith(".")) return name.endsWith(a);
      if (a.endsWith("/*")) return type.startsWith(a.slice(0, -1));
      return type === a;
    });
}

/** Human list of accepted types: ".pdf,.jpg" → "PDF, JPG". */
function acceptLabel(accept?: string) {
  if (!accept) return "";
  return accept
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => (a.startsWith(".") ? a.slice(1).toUpperCase() : a.endsWith("/*") ? `${a.slice(0, -2)} files` : a))
    .join(", ");
}

/**
 * Drop zone that records chosen file names (nothing is uploaded).
 * `onFiles(all, added)` receives every name currently chosen, then the names just added.
 */
export function FileDrop({
  label,
  accept,
  onFiles,
  hint,
  multiple = true,
  disabled = false,
  disabledReason,
  initialFiles = [],
  className,
}: {
  label: string;
  accept?: string;
  onFiles?: (names: string[], added: string[]) => void;
  hint?: React.ReactNode;
  multiple?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  initialFiles?: string[];
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>(initialFiles);
  const [dragging, setDragging] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);

  const add = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const ok = incoming.filter((f) => accepts(f, accept)).map((f) => f.name);
    setSkipped(incoming.filter((f) => !accepts(f, accept)).map((f) => f.name));
    if (ok.length === 0) return;
    const picked = multiple ? ok : ok.slice(0, 1);
    const next = multiple ? [...files, ...picked.filter((n) => !files.includes(n))] : picked;
    const added = picked.filter((n) => !files.includes(n));
    setFiles(next);
    onFiles?.(next, added);
  };

  const remove = (name: string) => {
    const next = files.filter((f) => f !== name);
    setFiles(next);
    onFiles?.(next, []);
  };

  const types = acceptLabel(accept);

  return (
    <div className={cn("min-w-0", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={`${id}-hint`}
        title={disabled ? disabledReason : undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) add(e.dataTransfer.files);
        }}
        className={cn(
          "group grid place-items-center rounded-[var(--radius-lg)] border-2 border-dashed px-5 py-7 text-center transition-colors",
          disabled
            ? "cursor-not-allowed border-line bg-surface-2 opacity-60"
            : dragging
              ? "cursor-copy border-cta-strong bg-cta-soft"
              : "cursor-pointer border-line-strong bg-surface hover:border-ink hover:bg-cta-soft",
        )}
      >
        <span
          className={cn(
            "grid size-11 place-items-center rounded-full transition-colors",
            dragging ? "bg-cta text-cta-ink" : "bg-surface-inv text-cta",
          )}
        >
          <UploadCloud aria-hidden className="size-5" strokeWidth={2.2} />
        </span>
        <p className="mt-3 text-[14px] font-semibold text-ink">{label}</p>
        <p id={`${id}-hint`} className="mt-1 text-[12.5px] text-ink-3">
          {dragging ? "Drop to add" : (
            <>
              Drag files here or <span className="font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">browse</span>
              {types ? ` · ${types}` : ""}
            </>
          )}
        </p>
        {hint ? <p className="mt-1 text-[12px] text-ink-3">{hint}</p> : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          add(e.target.files);
          // Allow picking the same file again after removing it.
          e.target.value = "";
        }}
      />

      {skipped.length ? (
        <p role="status" className="mt-2 text-[12.5px] text-rose">
          Skipped {skipped.join(", ")}: only {types} accepted.
        </p>
      ) : null}

      {files.length ? (
        <ul aria-label="Chosen files" className="mt-3 flex flex-wrap gap-2">
          {files.map((name) => (
            <li
              key={name}
              className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pr-1 pl-2.5 text-[12.5px] font-medium text-ink"
            >
              <FileText aria-hidden className="size-3.5 shrink-0 text-ink-3" />
              <span className="min-w-0 truncate">{name}</span>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => remove(name)}
                  aria-label={`Remove ${name}`}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-rose-soft hover:text-rose"
                >
                  <X className="size-3" strokeWidth={2.6} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
