import { Check, Sparkles } from "lucide-react";

const track = [
  { title: "Kubernetes for Application Teams", meta: "8h · complete", done: true },
  { title: "Distributed Systems in Practice", meta: "18h · 62%", done: false, active: true },
  { title: "Security Foundations", meta: "6h · required", done: false },
  { title: "Writing for Engineers", meta: "5h · RFC reviewed", done: false },
];

/** The right half of the auth screens. It shows the product's actual idea —
 *  a sequenced path with gates — rather than a stock photograph of a laptop. */
export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden border-l border-stage-line bg-stage lg:block">
      <div className="grain absolute inset-0" />

      {/* soft light source, top-right */}
      <div
        className="absolute -top-40 -right-32 size-[34rem] rounded-full opacity-[0.22] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--stage-brand) 0%, color-mix(in oklab, var(--stage-brand) 20%, transparent) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-48 -left-24 size-[30rem] rounded-full opacity-[0.14] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--stage-ember) 0%, color-mix(in oklab, var(--stage-ember) 20%, transparent) 45%, transparent 70%)",
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-stage-ink/12 bg-stage-ink/[0.05] px-3 py-1 text-[11.5px] font-medium text-stage-ink/70">
            <Sparkles className="size-3.5" />
            Learning that knows where you are going
          </span>
          <h2 className="mt-7 max-w-lg font-display text-[clamp(2rem,1.4rem+1.9vw,3.1rem)] leading-[1.06] tracking-[var(--display-tracking)] text-stage-ink">
            A course catalogue is not a career. A path is.
          </h2>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-stage-ink/55">
            Meridian sequences what someone needs for the role they are moving
            into, gates it on evidence rather than attendance, and follows up
            over chat, WhatsApp or a phone call when they stall.
          </p>
        </div>

        {/* The path, rendered honestly: gates, progress, order. */}
        <div className="my-10 max-w-md">
          <p className="mb-4 text-[10.5px] font-semibold tracking-[0.16em] text-stage-ink/40 uppercase">
            Backend Engineer · L3 → L4
          </p>
          <ol className="relative space-y-3">
            <span className="absolute top-2 bottom-2 left-[13px] w-px bg-stage-ink/12" />
            {track.map((s) => (
              <li key={s.title} className="relative flex items-start gap-4">
                <span
                  className={
                    "relative z-10 mt-0.5 grid size-6.5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold " +
                    (s.done
                      ? "border-transparent bg-stage-jade text-stage"
                      : s.active
                        ? "border-[#7093ff] bg-stage text-[#7093ff]"
                        : "border-stage-ink/15 bg-stage text-stage-ink/35")
                  }
                >
                  {s.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={
                      "block text-[13.5px] font-medium " +
                      (s.active ? "text-stage-ink" : s.done ? "text-stage-ink/70" : "text-stage-ink/50")
                    }
                  >
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-stage-ink/35">
                    {s.meta}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-3 gap-6 border-t border-stage-ink/10 pt-7">
          {[
            ["4,218", "learners active this month"],
            ["82%", "questions resolved without a human"],
            ["21%", "completion lift from voice follow-up"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-[22px] leading-none font-semibold tracking-[-0.03em] text-stage-ink tnum">
                {v}
              </p>
              <p className="mt-2 text-[11.5px] leading-snug text-stage-ink/40">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
