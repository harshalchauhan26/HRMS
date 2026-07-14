import type { ApiSwotPoint } from "@/types/api";

type SwotTone = "strength" | "weakness" | "opportunity" | "threat";

const TONE_STYLES: Record<SwotTone, { bg: string; border: string; text: string }> = {
  strength: { bg: "var(--okbg)", border: "#BFE3CB", text: "var(--ok)" },
  weakness: { bg: "var(--badbg)", border: "#F0BABA", text: "var(--bad)" },
  opportunity: { bg: "#E8F0FE", border: "#BBD3F7", text: "var(--r3)" },
  threat: { bg: "var(--warnbg)", border: "#F0DBB0", text: "var(--warn)" },
};

export default function SwotQuadrant({
  tone,
  title,
  points,
}: {
  tone: SwotTone;
  title: string;
  points: ApiSwotPoint[];
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className="mb-3 rounded-xl border p-4" style={{ background: s.bg, borderColor: s.border }}>
      <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold" style={{ color: s.text }}>
        <span className="size-2.5 rounded-sm" style={{ background: s.text }} />
        {title}
      </div>
      {points.map((p, i) => (
        <div key={i} className="mb-2.5 text-[12.5px] leading-relaxed text-ink-soft last:mb-0">
          {p.text}
          <span className="ml-1.5 inline-flex items-center rounded-md border border-black/5 bg-white/70 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink">
            {p.evidence}
          </span>
        </div>
      ))}
    </div>
  );
}
