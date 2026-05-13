import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accentColor?: string;
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
  accentColor,
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border-subtle bg-surface shadow-card ${className}`}
      style={accentColor ? { borderLeft: `4px solid ${accentColor}` } : undefined}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <div className="flex flex-col">
            {title && <div className="text-sm font-semibold text-ink-primary">{title}</div>}
            {subtitle && <div className="text-2xs text-ink-muted">{subtitle}</div>}
          </div>
          {action && <div className="text-xs">{action}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
