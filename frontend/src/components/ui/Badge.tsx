import React from 'react';

const TYPE_CLASSES = {
  A: "text-signal-a bg-signal-a-bg border-signal-a/40",
  B: "text-signal-b bg-signal-b-bg border-signal-b/40",
  C: "text-signal-c bg-signal-c-bg border-signal-c/40",
  D: "text-signal-d bg-signal-d-bg border-signal-d/40",
} as const;

export function TypeBadge({ type }: { type: "A"|"B"|"C"|"D" | null | string }) {
  if (!type || !TYPE_CLASSES[type as keyof typeof TYPE_CLASSES]) return null;
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-sm border text-xs font-semibold ${TYPE_CLASSES[type as keyof typeof TYPE_CLASSES]}`}>
      Type {type}
    </span>
  );
}

const DEFENSE_CLASSES = {
  SAFE:             { dot: "bg-defense-safe",            text: "text-defense-safe",            label: "안전 구역" },
  FRGN_LINE_TOUCH:   { dot: "bg-defense-caution-yellow",  text: "text-defense-caution-yellow",  label: "외인 방어선 도달" },
  INST_LINE_TOUCH:   { dot: "bg-defense-caution-orange",  text: "text-defense-caution-orange",  label: "기관 방어선 도달" },
  BREAKDOWN:           { dot: "bg-defense-danger",          text: "text-defense-danger",          label: "방어선 붕괴" },
  INSUFFICIENT_DATA:   { dot: "bg-ink-muted",               text: "text-ink-muted",               label: "데이터 부족" },
} as const;

export function DefenseBadge({ state }: { state: keyof typeof DEFENSE_CLASSES | string | null }) {
  if (!state || !DEFENSE_CLASSES[state as keyof typeof DEFENSE_CLASSES]) return null;
  const c = DEFENSE_CLASSES[state as keyof typeof DEFENSE_CLASSES];
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-2 text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
    </span>
  );
}

export function ChangePct({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-num-flat font-numeric">—</span>;
  const cls = value > 0 ? "text-num-up" : value < 0 ? "text-num-down" : "text-num-flat";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-numeric ${cls}`}>{sign}{value.toFixed(2)}%</span>;
}
