import type { MembershipDetail } from "./membershipAggregate";

export interface SwotPoint {
  text: string;
  evidence: string;
}

export interface SwotEvidence {
  strengths: SwotPoint[];
  weaknesses: SwotPoint[];
  opportunities: SwotPoint[];
  threats: SwotPoint[];
}

function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

/** Deterministic SWOT draft from competency-head averages + targets — every point cites its evidence. */
export function buildSwot(detail: MembershipDetail): SwotEvidence {
  const strengths: SwotPoint[] = [];
  const weaknesses: SwotPoint[] = [];
  const opportunities: SwotPoint[] = [];
  const threats: SwotPoint[] = [];

  const scoredHeads = detail.heads.filter((h) => h.average != null);
  if (scoredHeads.length) {
    const best = scoredHeads.reduce((a, b) => ((b.average as number) > (a.average as number) ? b : a));
    const worst = scoredHeads.reduce((a, b) => ((b.average as number) < (a.average as number) ? b : a));
    strengths.push({
      text: `Strongest competency is ${best.name.toLowerCase()} — a genuine anchor for the team.`,
      evidence: `${best.name} ${(best.average as number).toFixed(1)}/4`,
    });
    weaknesses.push({
      text: `${worst.name} is the first thing to strengthen; it trails the other heads.`,
      evidence: `${worst.name} ${(worst.average as number).toFixed(1)}/4`,
    });
    opportunities.push({
      text: `Lift ${worst.name.toLowerCase()} to unlock the next calibration level.`,
      evidence: `Level ${detail.jobRole.level}`,
    });
  } else {
    weaknesses.push({
      text: "No competency scores recorded yet for this period — nothing to anchor a SWOT on.",
      evidence: "Not scored",
    });
  }

  const base = detail.targets.find((t) => t.metric === "base");
  const incentive = detail.targets.find((t) => t.metric === "incentive");
  const eoss = detail.targets.find((t) => t.metric === "eoss");

  if (base?.actual != null && base.actual >= 0.95) {
    strengths.push({
      text: "Reliably converts target into results this period.",
      evidence: `Base ${pct(base.actual)}`,
    });
  }
  if (base?.actual != null && base.actual < 0.8) {
    weaknesses.push({
      text: "Base target is behind the 80% floor for the period.",
      evidence: `Base ${pct(base.actual)}`,
    });
  }
  if (incentive?.actual != null && base?.actual != null && incentive.actual > base.actual) {
    opportunities.push({
      text: "Incentive outpaces base — headroom to convert into core target.",
      evidence: `Inc ${pct(incentive.actual)} vs base ${pct(base.actual)}`,
    });
  }
  if (eoss?.actual != null && eoss.actual < 0.75) {
    threats.push({
      text: "EOSS conversion is a live risk to period close.",
      evidence: `EOSS ${pct(eoss.actual)}`,
    });
  }
  if (!threats.length) {
    threats.push({
      text: "No material threats flagged from current signals.",
      evidence: "All bands ≥ watch",
    });
  }

  return { strengths, weaknesses, opportunities, threats };
}
