import type { Theme } from "@/lib/themes";

/**
 * A miniature of the product rendered in one theme's own tokens.
 *
 * Everything here is inline-styled from the theme object rather than from
 * Tailwind classes, because the point is to show a palette that is NOT the
 * one currently applied to the page.
 */
export function ThemePreview({
  theme,
  mode,
  className,
}: {
  theme: Theme;
  mode: "light" | "dark";
  className?: string;
}) {
  const t = mode === "dark" ? theme.dark : theme.light;
  const r = theme.radius;

  return (
    <div
      aria-hidden
      className={className}
      style={{
        background: t.paper,
        borderColor: t.line,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: r.md,
        overflow: "hidden",
      }}
    >
      {/* chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "7px 9px",
          background: t["surface-2"],
          borderBottom: `1px solid ${t.line}`,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: r.xs,
            background: t["surface-inv"],
          }}
        />
        <span
          style={{
            height: 4,
            width: 32,
            borderRadius: 99,
            background: t["line-strong"],
          }}
        />
        <span
          style={{
            marginLeft: "auto",
            height: 6,
            width: 6,
            borderRadius: 99,
            background: t.ember,
          }}
        />
      </div>

      <div style={{ padding: "10px 11px 12px" }}>
        {/* the display face, shown in its own type */}
        <div
          style={{
            fontFamily: `var(${theme.fonts.display})`,
            color: t.ink,
            fontSize: 21,
            lineHeight: 1.05,
            letterSpacing: theme.displayTracking ?? "-0.02em",
          }}
        >
          Aa
        </div>

        {/* the ui face */}
        <div
          style={{
            fontFamily: `var(${theme.fonts.sans})`,
            color: t["ink-2"],
            fontSize: 8.5,
            marginTop: 5,
            letterSpacing: "0.01em",
          }}
        >
          The quick brown fox
        </div>

        {/* a button and a progress rail */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}
        >
          <span
            style={{
              fontFamily: `var(${theme.fonts.sans})`,
              background: t.brand,
              color: t["on-brand"],
              fontSize: 7.5,
              fontWeight: 600,
              padding: "3px 7px",
              borderRadius: r.sm,
              whiteSpace: "nowrap",
            }}
          >
            Continue
          </span>
          <span
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: t["surface-3"],
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: "62%",
                borderRadius: 99,
                background: t.brand,
              }}
            />
          </span>
        </div>

        {/* the semantic accents, in role order */}
        <div style={{ display: "flex", gap: 4, marginTop: 9 }}>
          {(
            [
              ["jade", "jade-soft"],
              ["ember", "ember-soft"],
              ["amber", "amber-soft"],
              ["rose", "rose-soft"],
              ["violet", "violet-soft"],
            ] as const
          ).map(([solid, soft]) => (
            <span
              key={solid}
              style={{
                flex: 1,
                height: 12,
                borderRadius: r.xs,
                background: t[soft],
                display: "grid",
                placeItems: "center",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  background: t[solid],
                }}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
