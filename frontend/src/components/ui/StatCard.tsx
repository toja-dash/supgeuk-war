import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  borderColor?: string;
  onClick?: () => void;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  sub,
  borderColor,
  onClick,
  valueClassName = 'text-ink-primary',
}: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface p-5 shadow-card transition duration-fast ${
        onClick ? 'cursor-pointer hover:bg-surface-2' : ''
      }`}
      style={borderColor ? { borderLeft: `4px solid ${borderColor}` } : undefined}
      onClick={onClick}
    >
      <div className="text-2xs uppercase tracking-wide text-ink-secondary">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`font-numeric text-2xl font-bold ${valueClassName}`}>{value}</span>
        {sub && <span className="text-sm text-ink-secondary">{sub}</span>}
      </div>
    </div>
  );
}
