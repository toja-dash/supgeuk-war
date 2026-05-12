import React from 'react';
import { ChangePct } from './Badge';

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  deltaText?: string;
  borderColor?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, delta, deltaText, borderColor, onClick }: StatCardProps) {
  const borderClass = borderColor ? `border-l-4 border-l-[${borderColor}] border border-border-subtle` : `border border-border-subtle`;
  
  return (
    <div 
      className={`bg-surface rounded-lg p-5 flex flex-col gap-2 ${borderClass} ${onClick ? 'cursor-pointer hover:bg-surface-2 transition duration-fast' : ''}`}
      onClick={onClick}
    >
      <div className="text-ink-secondary text-sm font-medium">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-ink-primary text-2xl font-bold font-numeric">{value}</span>
        {delta !== undefined && <ChangePct value={delta} />}
        {deltaText && <span className="text-ink-secondary text-sm">{deltaText}</span>}
      </div>
    </div>
  );
}
