export const QUARTERS = ["q1", "q2", "q3", "q4"] as const;
export type Quarter = (typeof QUARTERS)[number];
/** "overall" is never stored — it means "aggregate across whichever quarters have data". */
export type PeriodParam = Quarter | "overall";

export const QUARTER_LABELS: Record<Quarter, string> = {
  q1: "Q1 · Apr-Jun",
  q2: "Q2 · Jul-Sep",
  q3: "Q3 · Oct-Dec",
  q4: "Q4 · Jan-Mar",
};

export function isQuarter(value: unknown): value is Quarter {
  return typeof value === "string" && (QUARTERS as readonly string[]).includes(value);
}

export function parsePeriodParam(value: unknown): PeriodParam {
  if (value === "overall" || value == null) return "overall";
  if (isQuarter(value)) return value;
  throw new Error(`Invalid period "${String(value)}" — expected q1, q2, q3, q4, or overall`);
}

/** Averages numeric rows across quarters, grouped by an arbitrary key (metric name, phase, question id...). */
export function averageByGroup<T>(rows: T[], groupKey: (row: T) => string, value: (row: T) => number | null) {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const v = value(row);
    if (v == null) continue;
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }
  const result = new Map<string, number>();
  for (const [key, values] of groups) {
    result.set(key, values.reduce((a, b) => a + b, 0) / values.length);
  }
  return result;
}
