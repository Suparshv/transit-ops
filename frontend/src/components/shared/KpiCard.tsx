import React from 'react';
import clsx from 'clsx';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  borderColor?: 'green' | 'blue' | 'orange' | 'red' | 'amber' | 'gray';
  suffix?: string;
  sublabel?: string;
}

const BORDER_COLORS: Record<NonNullable<KpiCardProps['borderColor']>, string> = {
  green:  'border-l-green-500',
  blue:   'border-l-blue-500',
  orange: 'border-l-orange-500',
  red:    'border-l-red-500',
  amber:  'border-l-amber-500',
  gray:   'border-l-gray-500',
};
const GLOW_COLORS: Record<NonNullable<KpiCardProps['borderColor']>, string> = {
  green:  'bg-green-500/5',
  blue:   'bg-blue-500/5',
  orange: 'bg-orange-500/5',
  red:    'bg-red-500/5',
  amber:  'bg-amber-500/5',
  gray:   'bg-gray-500/5',
};

export function KpiCard({ label, value, icon, borderColor = 'amber', suffix, sublabel }: KpiCardProps) {
  return (
    <div className={clsx(
      'relative flex flex-col gap-2 rounded-xl border border-white/8 px-4 py-4',
      'border-l-[3px] transition-all duration-200 hover:border-l-[4px] hover:scale-[1.01]',
      BORDER_COLORS[borderColor],
      GLOW_COLORS[borderColor],
    )}>
      {icon && (
        <div className="absolute top-3 right-3 opacity-20 text-white">
          {icon}
        </div>
      )}
      <span className="text-[10px] font-bold uppercase tracking-widest text-base-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-base-text tabular-nums leading-none">
          {value}
        </span>
        {suffix && <span className="text-sm text-base-muted font-medium">{suffix}</span>}
      </div>
      {sublabel && <span className="text-xs text-base-muted">{sublabel}</span>}
    </div>
  );
}
