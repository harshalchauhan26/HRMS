import { AVATAR_PALETTE } from "@/data/constants";

export function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function hashPalette(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** Deterministic hash of a person's id onto the avatar color palette (same picks every render). */
export function avatarColor(id: string): string {
  return hashPalette(id);
}

/** Deterministic hash of a team's id onto the same palette — teams are real DB rows now, not fixed names. */
export function teamAccentColor(teamId: string): string {
  return hashPalette(`team:${teamId}`);
}

/** Four-band competency color scale (0-4 scale). */
export function scoreColor(v: number | null | undefined): string {
  if (v == null) return "var(--faint)";
  if (v >= 3.5) return "var(--r4)";
  if (v >= 2.5) return "var(--r3)";
  if (v >= 1.75) return "var(--r2)";
  return "var(--r1)";
}

/** Base/incentive/EOSS achievement band (0-1 scale, e.g. 0.8 = 80%). */
export function baseColor(v: number | null | undefined): { color: string; bg: string } {
  if (v == null) return { color: "var(--muted-foreground)", bg: "var(--hair2)" };
  if (v >= 0.95) return { color: "var(--ok)", bg: "var(--okbg)" };
  if (v >= 0.8) return { color: "var(--warn)", bg: "var(--warnbg)" };
  return { color: "var(--bad)", bg: "var(--badbg)" };
}
