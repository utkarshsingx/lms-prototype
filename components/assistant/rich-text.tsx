import { Fragment } from "react";

/** Renders the small markdown subset the assistant actually emits:
 *  **bold**, `code`, and paragraph breaks. Nothing else is parsed. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((para, pi) => (
        <p key={pi} className={pi > 0 ? "mt-2.5" : undefined}>
          {para.split("\n").map((line, li) => (
            <Fragment key={li}>
              {li > 0 ? <br /> : null}
              {inline(line)}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

function inline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <strong key={i} className="font-semibold text-ink">
          {p.slice(2, -2)}
        </strong>
      );
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code
          key={i}
          className="rounded-[5px] border border-line bg-surface-2 px-1 py-px font-mono text-[0.88em] text-ink"
        >
          {p.slice(1, -1)}
        </code>
      );
    return <Fragment key={i}>{p}</Fragment>;
  });
}
