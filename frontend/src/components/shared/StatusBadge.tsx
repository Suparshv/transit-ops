import React from 'react';
import clsx from 'clsx';

type StatusType =
  | 'Available' | 'On Trip' | 'In Shop' | 'Retired'
  | 'Off Duty'  | 'Suspended'
  | 'Draft'     | 'Dispatched' | 'Completed' | 'Cancelled'
  | 'Active'    | 'Pending'   | 'Approved'  | 'Rejected'
  | 'Excellent' | 'Good'      | 'Fair'      | 'Poor';

const STATUS_STYLES: Record<StatusType, string> = {
  Available:   'bg-green-500/15  text-green-400  border-green-500/25',
  'On Trip':   'bg-blue-500/15   text-blue-400   border-blue-500/25',
  Dispatched:  'bg-blue-500/15   text-blue-400   border-blue-500/25',
  'In Shop':   'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Active:      'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Pending:     'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Retired:     'bg-red-500/15    text-red-400    border-red-500/25',
  Suspended:   'bg-red-500/15    text-red-400    border-red-500/25',
  Cancelled:   'bg-red-500/15    text-red-400    border-red-500/25',
  Draft:       'bg-gray-500/15   text-gray-400   border-gray-500/25',
  'Off Duty':  'bg-gray-500/15   text-gray-400   border-gray-500/25',
  Completed:   'bg-green-500/15  text-green-400  border-green-500/25',
  Approved:    'bg-green-500/15  text-green-400  border-green-500/25',
  Rejected:    'bg-red-500/15    text-red-400    border-red-500/25',
  Excellent:   'bg-green-500/15  text-green-400  border-green-500/25',
  Good:        'bg-blue-500/15   text-blue-400   border-blue-500/25',
  Fair:        'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Poor:        'bg-red-500/15    text-red-400    border-red-500/25',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status as StatusType] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/25';
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap',
      styles,
      className
    )}>
      {status}
    </span>
  );
}

export function ExpiredBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border border-red-500/40 bg-red-500/15 text-red-400 whitespace-nowrap">
      EXPIRED
    </span>
  );
}
